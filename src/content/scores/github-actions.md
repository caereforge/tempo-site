---
title: "GitHub Actions"
description: "CI workflow run results from your repos in Tempo's timeline, with success/failure severity badges and one-click buttons to open the run or the repo's Actions tab."
providerIdentifier: "com.github.actions"
color: "#1F6FEB"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Surface GitHub Actions activity in Tempo's timeline. The score reads `workflow_run` and related webhook payloads and renders each run with a severity badge that tracks its conclusion: success, failure, cancelled, timed out, or still running. Runs of the same workflow collapse into one stack (per repo, within a day), so a noisy pipeline reads as a single entry instead of a flood.

This is a read-only view: the actions open the run in your browser, jump to the repo's Actions tab, copy or clone the repo, or open the GitHub Actions docs. Nothing writes back to GitHub.

---

## Install

The score ships **built-in** and is seeded on first launch, so there's nothing to download. To start receiving events:

1. In Tempo **Settings → Ingestion**, add a token bound to `com.github.actions` and copy it. (The binding also covers any dotted sub-namespace under it.)
2. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest` (or `127.0.0.1` if Tempo is loopback-only).
3. Set up the companion relay and the GitHub webhook (below).

## GitHub side

GitHub's servers live on the public internet and cannot reach your LAN, so a small **companion relay** sits in between: it receives GitHub's webhook, verifies the HMAC signature on every request, and forwards the payload to Tempo. Tempo does **not** run the relay for you; it runs on a host you choose that GitHub can reach (through a tunnel) and that can reach Tempo.

**Get the files.** In the score's **Source** tab (Score Editor), the **Helper** section has **Open in Finder** and **Open README**. *Open in Finder* copies the relay package to `~/Library/Application Support/Tempo/Integrations/com.github.actions/` and reveals it. Copy that folder to the host that will run the relay, then follow its **Open README**.

**Configure the relay.** It needs two secrets, the HMAC webhook secret and the Tempo token (bound to `com.github.actions`, from **Settings → Ingestion**):

- On a **Mac**, store them in the **Keychain** (never on disk):
  ```sh
  security add-generic-password -s tempo-gh-relay  -a webhook-secret    -w '<HMAC secret>'
  security add-generic-password -s tempo-ingestion -a com.github.actions -w '<Tempo token>'
  ```
- On **Linux / Docker / a `.env` file**, set environment variables instead (`TEMPO_GH_WEBHOOK_SECRET`, `TEMPO_TOKEN`), or use the `*_FILE` convention to keep secrets off plaintext. Resolution order per secret: `*_FILE` → env var → macOS Keychain.

Point the relay at Tempo with `TEMPO_URL=http://<mac-running-tempo>:7776/ingest` and run it (the package ships a LaunchAgent). It now listens on port `7777`, but only on your LAN. The last step is to give GitHub a public way in.

### Exposing the relay with a tunnel

GitHub posts from the public internet, so the relay needs a public URL that forwards to its local port `7777`. A **tunnel** does exactly that, without opening a port on your router or exposing your home IP. **Cloudflare Tunnel** (its daemon is called `cloudflared`) is the common choice; **Tailscale Funnel** and **ngrok** are alternatives that work the same way.

The fastest path is a Cloudflare **quick tunnel**, which needs no account and no domain:

```sh
cloudflared tunnel --url http://localhost:7777
```

It prints a public `https://<random>.trycloudflare.com` address that forwards to the relay; you use that address plus `/gh` as the GitHub webhook URL. The catch: a quick tunnel's address is **ephemeral**. It changes every time `cloudflared` restarts, and you'd have to update the GitHub webhook each time. Good for a first test, not for a permanent setup.

For a stable setup, use a **named tunnel**. It keeps a fixed hostname across restarts, at the cost of a (free) **Cloudflare account** and a **domain on Cloudflare's DNS**:

```sh
cloudflared tunnel login
cloudflared tunnel create tempo-gh
cloudflared tunnel route dns tempo-gh gh.example.com
cloudflared tunnel run --url http://localhost:7777 tempo-gh
```

GitHub then posts to `https://gh.example.com/gh`, unchanging.

Either way the tunnel is the **only internet-facing surface**, so keep it tight: route only the `/gh` path to the relay and keep the HMAC secret private. The relay rejects any request whose signature doesn't match, so a discovered URL alone can't inject events.

**Add the webhook.** In the repo (or org) **Settings → Webhooks**, point a new webhook at your tunnel address plus `/gh`, set **Content type** to `application/json`, and use the same HMAC secret.

If the relay runs on a different host than Tempo, that host must reach the Mac on port **7776** (allow it in the macOS firewall or Little Snitch, and optionally restrict the token to that host's IP via its allowlist in **Settings → Ingestion**).

## What you'll see

Each event carries a severity badge from its payload:

| Severity   | Badge          | When |
|------------|----------------|------|
| `ok`       | Success / Merged | Workflow run `success`; PR closed and merged |
| `error`    | Failed / Timed out | Workflow run `failure` or `timed_out` |
| `warning`  | Cancelled      | Workflow run `cancelled` |
| `info`     | Running / Queued / Opened / Closed / Reopened / Ready for review | In-progress and queued runs; issue and PR lifecycle |

Issues, pull requests, and workflow runs each group into their own stack (issue, PR, or repo + workflow), within a one-day window.

Every event carries the same five actions:

- **Open run**: opens the run in your browser (`${metadata.runUrl}`). Renders disabled when an event has no run URL, for example a non-workflow event.
- **Open repo Actions**: opens `https://github.com/${metadata.repo}/actions`.
- **Copy repo**: copies `${metadata.repo}` to the clipboard.
- **Clone repo**: opens Terminal with `git clone https://github.com/${metadata.repo}.git`.
- **GitHub Actions docs**: opens the official docs.
