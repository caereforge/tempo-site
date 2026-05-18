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

To see events arriving in Analytics Engine, wait ~1 minute then run:

```bash
wrangler analytics-engine sql 'SELECT index1 AS event, count() AS n FROM tempo_downloads GROUP BY event'
```

(Or use the Analytics Engine SQL endpoint via the dashboard.)

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
