---
title: "Pi-hole"
description: "Pi-hole health and configuration changes in Tempo's timeline. Poll-driven from cron, native API, no plugins."
providerIdentifier: "net.pi-hole.pi-hole"
color: "#A52B2B"
version: "1.0.0"
file: "/scores/pi-hole.tempo-score"
compatibility:
  - "Pi-hole v6 (FTL HTTP API)"
  - "v5 with adjustments"
pubDate: 2026-04-30
downloadable: true
---

Surface Pi-hole health and configuration changes in Tempo's timeline with five default actions (open admin, open query log, open settings, copy server URL, copy domain).

Pi-hole has no native push webhook out of the box, so this integration is **poll-driven**: a small bash script runs on cron, checks Pi-hole's state via its HTTP API, and POSTs an event to Tempo when something interesting changes.

Tested with Pi-hole **v6** (FTL HTTP API). v5 with the legacy PHP API also works with minor URL adjustments — see the v5 note at the bottom.

---

## Install

1. Download `pi-hole.tempo-score` from the button above.
2. Double-click it. Tempo opens a review sheet — click **Install**. The score lands in `~/Library/Application Support/Tempo/Scores/`.
3. In Tempo **Settings → Ingestion**, add a token named `pi-hole` bound to `net.pi-hole.pi-hole`. Copy the token.
4. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest` (or `127.0.0.1` if Tempo is loopback-only).
5. Install the polling script (below).

## Polling script

Save as `pihole-tempo.sh`, edit the four config values, run on cron every 5–10 minutes. The script tracks state across runs so it only POSTs to Tempo when something **changes** (no spam).

```sh
#!/usr/bin/env bash
# pihole-tempo.sh — emit Pi-hole state changes to Tempo
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────
PIHOLE_URL="http://pi.hole"        # base URL of your Pi-hole
PIHOLE_PASS="your-admin-password"  # admin password (v6) or API token
TEMPO_URL="http://your-mac.local:7776/ingest"
TEMPO_TOKEN="paste-tempo-token-here"
STATE_DIR="${HOME}/.local/state/pihole-tempo"
# ──────────────────────────────────────────────────────────────────────────

mkdir -p "$STATE_DIR"
LAST_FILE="${STATE_DIR}/last_status"

# Auth (Pi-hole v6 — single-shot session)
SID=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"password\":\"${PIHOLE_PASS}\"}" \
    "${PIHOLE_URL}/api/auth" | jq -r '.session.sid // empty')

if [ -z "$SID" ]; then
    STATUS="unreachable"
else
    BLOCKING=$(curl -s -H "X-FTL-SID: $SID" "${PIHOLE_URL}/api/dns/blocking" \
               | jq -r '.blocking // "unknown"')
    case "$BLOCKING" in
        enabled)   STATUS="up" ;;
        disabled)  STATUS="disabled" ;;
        *)         STATUS="unreachable" ;;
    esac
fi

LAST=$( [ -f "$LAST_FILE" ] && cat "$LAST_FILE" || echo "")
echo "$STATUS" > "$LAST_FILE"

# Only emit on transitions
if [ "$STATUS" = "$LAST" ]; then exit 0; fi

case "$STATUS" in
    up)          ACTION="blocking_enabled";  TITLE="Pi-hole — blocking enabled" ;;
    disabled)    ACTION="blocking_disabled"; TITLE="Pi-hole — blocking disabled" ;;
    unreachable) ACTION="";                  TITLE="Pi-hole unreachable" ;;
esac

curl -sS -X POST \
    -H "X-Tempo-Token: ${TEMPO_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"providerIdentifier\": \"net.pi-hole.pi-hole\",
      \"title\": \"${TITLE}\",
      \"startDate\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
      \"eventType\": \"alert\",
      \"metadata\": {
        \"Status\": \"${STATUS}\",
        \"Action\": \"${ACTION}\",
        \"ServerUrl\": \"${PIHOLE_URL}\"
      }
    }" \
    "${TEMPO_URL}" >/dev/null
```

## Schedule

```sh
crontab -e
# Run every 5 minutes
*/5 * * * * /path/to/pihole-tempo.sh >> /tmp/pihole-tempo.log 2>&1
```

## Verify

Disable Pi-hole blocking from the admin UI for 30s, then run the script manually. You should see a `Pi-hole — blocking disabled` event in Tempo within a couple of seconds, marked **warning**.

## Severity rules

| Match                              | Severity   | Badge        |
| ---------------------------------- | ---------- | ------------ |
| `Status: down`                     | `critical` | Down         |
| `Status: unreachable`              | `critical` | Unreachable  |
| `Status: high_load`                | `warning`  | High load    |
| `Status: disabled`                 | `warning`  | Disabled     |
| `Action: blocking_disabled`        | `warning`  | Blocking off |
| `Action: update_available`         | `info`     | Update       |
| `Action: gravity_update`           | `info`     | Gravity      |
| `Action: blocking_enabled`         | `info`     | Blocking on  |
| _(default)_                        | `info`     | Info         |

## Required `metadata` fields

- **`ServerUrl`** — base URL of the Pi-hole. Used by every action.
- **`Status`** or **`Action`** — drives severity. At least one should be present.
- **`Domain`** — only when the event is about a specific domain (e.g. unblock action). Used by the "Copy domain" action; optional otherwise.

## Pi-hole v5 note

For v5, replace the auth/blocking calls with the legacy PHP API:

```sh
# v5 auth: API token (web admin → Settings → API → "Show API token")
PIHOLE_TOKEN="your-api-token-here"

BLOCKING=$(curl -s "${PIHOLE_URL}/admin/api.php?status&auth=${PIHOLE_TOKEN}" \
           | jq -r '.status // "unknown"')
case "$BLOCKING" in
    enabled)  STATUS="up" ;;
    disabled) STATUS="disabled" ;;
    *)        STATUS="unreachable" ;;
esac
```

The rest of the script is identical.

## Sample event payload

```json
{
  "providerIdentifier": "net.pi-hole.pi-hole",
  "title": "Pi-hole — blocking disabled",
  "startDate": "2026-04-29T10:00:00Z",
  "eventType": "alert",
  "metadata": {
    "Status": "disabled",
    "Action": "blocking_disabled",
    "ServerUrl": "http://pi.hole"
  }
}
```

## Notes

- The polling script is intentionally minimal — track only Status and Action transitions. Extend it as you wish (gravity update detection, `/api/info` for version/update checks) using the same `metadata` keys.
- The catalog score uses only `openURL` and `copyToClipboard`. Terminal-based actions (e.g. `pihole disable 30m`) require a **local drop-in** score — explicitly trusted by you.
- For multi-instance setups (primary + secondary Pi-hole), run one script per instance with its own `ServerUrl` and `PIHOLE_PASS` — Tempo lists them as the same source but each event carries its own URL.
