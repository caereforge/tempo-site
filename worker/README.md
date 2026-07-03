# Tempo Download Tracker (Cloudflare Worker)

Sits in front of `downloads.tempoapp.app`, serves files from R2, and writes
aggregate request events to Cloudflare Analytics Engine.

## What it does

For every request to `downloads.tempoapp.app/*`:

1. Classifies the request type from path + user-agent:
   - `download` — `Tempo-X.Y.Z.dmg` or `Tempo-latest.dmg`
   - `update_check` — `appcast.xml` (Sparkle)
   - `checksum` — `*.dmg.sha256`
   - `other` — anything else
2. Extracts the version (from filename for downloads, from Sparkle UA for
   update checks).
3. Reads the country from `CF-IPCountry` and buckets the user-agent into
   `sparkle` / `browser` / `homebrew_curl` / `other`.
4. Writes one data point to the `tempo_downloads` Analytics Engine dataset.
5. Serves the file from R2 with a sensible `cache-control` header.

The Analytics Engine write is fire-and-forget (`ctx.waitUntil`), so it
never blocks or fails the download.

## KV download counters + `/_stats`

Analytics Engine is rich (dimensional SQL) but **sampled at volume and
retained only ~3 months**. For exact, permanent, real-time numbers — the kind
a downloads badge or a quick check wants — the Worker also keeps plain
counters in the `TEMPO_DOWNLOAD_COUNTS` KV namespace.

Only **actual downloads** (a GET of a `.dmg`) increment KV. HEAD checks and the
high-volume `update_check` / `head_check` events stay in Analytics Engine only,
which keeps KV writes comfortably inside the free tier. Each download bumps
three keys:

- `total:download` — grand total (all sources)
- `total:download:<ua_bucket>` — split by `browser` / `homebrew_curl` / `sparkle` / `other`
- `day:<YYYY-MM-DD>:download` — per-day total, for a trend

**Counting window**: these count from when the counter went live
(**2026-07-03**) forward — they are *not* a historical all-time total. The full
history lives in Analytics Engine / the Trantor `cf-export` `events.csv`.

**Accuracy caveat**: KV has no atomic increment, so this is a read-modify-write,
and KV reads are edge-cached (~60s) and writes to one key are rate-limited to
~1/s. At indie scale (downloads seconds-to-minutes apart) loss is negligible,
but under a synchronized spike a few increments to the hot `total:download` key
can be lost. Treat the numbers as **exact within a handful** — perfect for a
badge, not for billing. If precision ever matters, replace the KV counters with
a Durable Object counter (atomic increments).

### Reading the counters

`GET /_stats` returns the counters as JSON. It requires a bearer token
(`STATS_TOKEN`, stored as a Wrangler secret) and is never cached or logged:

```bash
curl -H "Authorization: Bearer $STATS_TOKEN" https://downloads.tempoapp.app/_stats
```

```json
{
  "totals": { "download": 42, "download:browser": 30, "download:homebrew_curl": 12 },
  "byDay": { "2026-07-03:download": 42 },
  "generatedAt": "2026-07-03T06:24:26.699Z"
}
```

Set (or rotate) the token:

```bash
openssl rand -hex 32 | tr -d '\n' | wrangler secret put STATS_TOKEN
```

## Privacy

Server-side aggregate only. No IP retention, no cookies, no tracking
pixels, no fingerprinting, no correlation with any identity. Reflected in
`/privacy` on tempoapp.app.

## First-time deployment

Prerequisites: you must already be authenticated with Wrangler against
the Cloudflare account that owns `tempoapp.app` and the R2 bucket.

```bash
cd worker
wrangler whoami                 # confirm you're on the right account
wrangler r2 bucket list         # find the bucket name backing downloads.tempoapp.app
```

Open `wrangler.toml` and replace `REPLACE-WITH-R2-BUCKET-NAME` with the
actual bucket name.

```bash
wrangler deploy
```

After the deploy succeeds, bind the custom domain so the worker actually
intercepts `downloads.tempoapp.app`:

1. Open https://dash.cloudflare.com/ → Workers & Pages → `tempo-download-tracker`
2. Settings → Domains & Routes → **Add Custom Domain**
3. Enter `downloads.tempoapp.app` and confirm

Cloudflare will update the DNS automatically (this replaces the previous
CNAME to the R2 public URL). Propagation is usually under a minute on
the same zone.

## Verifying

```bash
curl -sI https://downloads.tempoapp.app/Tempo-latest.dmg | head -20
```

Expected: `HTTP/2 200`, sensible `etag`, `cache-control` set by the worker.

To see Worker invocations live, run in a separate terminal:

```bash
wrangler tail
```

This streams real-time request logs from the deployed Worker — useful to
confirm the route is intercepting and to inspect the classification logic.

To query aggregate data in Analytics Engine, two options:

**Dashboard SQL editor (no setup)**:
Open https://dash.cloudflare.com/ → Workers & Pages → Analytics Engine →
select dataset `tempo_downloads`. There is an inline SQL editor.

**HTTP SQL API (programmatic)**:
The `wrangler` CLI does not expose Analytics Engine SQL queries as a
subcommand (as of v4.92). To query programmatically, POST against:

```
https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/analytics_engine/sql
```

with a Bearer API token holding the `Account Analytics: Read` permission
(create one at https://dash.cloudflare.com/profile/api-tokens). Example:

```bash
curl -X POST \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: text/plain" \
  --data "SELECT index1 AS event, count() AS n FROM tempo_downloads GROUP BY event" \
  "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/analytics_engine/sql"
```

## Rolling back

If something goes wrong:

```bash
wrangler deployments list
wrangler rollback <deployment-id>
```

Or remove the custom domain from the dashboard and `downloads.tempoapp.app`
falls back to the previous DNS configuration.

## Schema reference

Each event writes:

| Field   | Source                | Example                          |
|---------|-----------------------|----------------------------------|
| blob1   | event_type            | `download`                       |
| blob2   | path                  | `Tempo-1.0.2.dmg`                |
| blob3   | country (ISO-3166)    | `IT`                             |
| blob4   | version               | `1.0.2`                          |
| blob5   | ua_bucket             | `sparkle`                        |
| double1 | count                 | `1`                              |
| index1  | event_type (indexed)  | `download`                       |

Querying via SQL example:

```sql
SELECT
  blob1 AS event_type,
  blob4 AS version,
  blob3 AS country,
  blob5 AS ua_bucket,
  count() AS n
FROM tempo_downloads
WHERE timestamp > NOW() - INTERVAL '7' DAY
GROUP BY event_type, version, country, ua_bucket
ORDER BY n DESC
LIMIT 100;
```
