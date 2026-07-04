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
   `internal` / `sparkle` / `browser` / `homebrew_curl` / `other`.
4. Writes one data point to the `tempo_downloads` Analytics Engine dataset.
5. Serves the file from R2 with a sensible `cache-control` header.

The Analytics Engine write is fire-and-forget (`ctx.waitUntil`), so it
never blocks or fails the download.

## Marking our own requests (`internal`)

Dev/CI/manual pokes at production would otherwise pollute the real numbers and
are hard to tell apart after the fact. So set a marker User-Agent on anything
*we* do and the Worker buckets it as `internal`:

```bash
curl -A "Tempo-Internal/leo" https://downloads.tempoapp.app/Tempo-latest.dmg
```

Any UA matching `Tempo-Internal/` (case-insensitive) is classified `internal`,
which:

- **is excluded from the KV download counters** (`/_stats`, the badge) — those
  reflect real users only;
- **is still written to Analytics Engine** tagged `ua_bucket = internal`, so we
  can inspect (or `WHERE blob5 != 'internal'` to exclude) our own activity.

The marker wins over every other UA pattern, so `Tempo-Internal/… curl/8.4.0`
is `internal`, not `homebrew_curl`. It's a plain readable token, not a secret —
a stranger has no incentive to self-tag as internal. Real users never send it.

Bake it into test/CI scripts, and for ad-hoc shells an alias helps:

```bash
alias tcurl='curl -A "Tempo-Internal/leo"'   # then: tcurl https://downloads.tempoapp.app/...
```

Note: stock `brew` and in-app Sparkle send their own fixed UA and can't carry
this marker, so those specific pokes stay unmarked — rare and low-volume. If
that ever matters, add a dedicated internal hostname bound to the same Worker.

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

The raw `User-Agent` (`blob6`), ASN (`blob7`) and AS org name (`blob8`) are
stored **only for our own updaters** (Sparkle and Homebrew) — i.e. our
app/tooling self-reporting, not a user's browser. Browser UAs are only ever
bucketed (`browser`), never stored raw, and no ASN is recorded for them, so the
no-browser-fingerprinting stance is unchanged. The ASN identifies the network
operator (an Autonomous System aggregating thousands-to-millions of hosts), not
a device or a person; it exists purely to subtract datacenter crawlers from the
active-install count. The IP itself is never stored.

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
| blob4   | version               | `1.0.2` / build no. `26`         |
| blob5   | ua_bucket             | `sparkle`                        |
| blob6   | updater_ua (raw)      | `Tempo/26 Sparkle/2.6.4 …`       |
| blob7   | asn (raw)             | `3269`                           |
| blob8   | as_org (raw)          | `Telecom Italia`                 |
| double1 | count                 | `1`                              |
| index1  | event_type (indexed)  | `download`                       |

`blob4` (version) is extracted from the filename for downloads and from the
Sparkle `User-Agent` for update checks. Sparkle reports `CFBundleVersion`, so
this can be a **build number** (`26`) rather than the marketing version — map
it back in analysis (build 26 = 1.1.1).

`blob6` / `blob7` / `blob8` (updater_ua, asn, as_org) are recorded **only for
our own updaters** (`sparkle` / `homebrew_curl`) — never for browsers. `blob6`
diagnoses version-extraction blanks; `blob7`/`blob8` hold the request's
Autonomous System number and org name so catalog crawlers (MacUpdater et al.)
that impersonate our exact `User-Agent` but run on datacenter networks can be
subtracted from the update-check count. An ASN aggregates thousands-to-millions
of hosts, so it is not an identifier — see Privacy below.

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

**Genuine active installs** — real Sparkle checks with the crawlers removed. The
crawler(s) surface as a high-count datacenter org against a long tail of
residential orgs; inspect the distribution first, then exclude the ASN(s) you
see:

```sql
-- 1. Inspect: which ASNs are behind the update checks?
SELECT blob7 AS asn, blob8 AS as_org, count() AS n
FROM tempo_downloads
WHERE blob1 = 'update_check' AND blob5 = 'sparkle'
  AND timestamp > NOW() - INTERVAL '7' DAY
GROUP BY asn, as_org ORDER BY n DESC LIMIT 50;

-- 2. Count genuine checks per day, excluding the crawler ASN(s) found above.
SELECT toDate(timestamp) AS day, count() AS genuine_checks
FROM tempo_downloads
WHERE blob1 = 'update_check' AND blob5 = 'sparkle'
  AND blob7 NOT IN ('<crawler_asn>')
  AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY day ORDER BY day;
```
