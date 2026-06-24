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

Tested with Pi-hole **v6** (FTL HTTP API). v5 with the legacy PHP API also works with minor URL adjustments; see the v5 note at the bottom.

---

## Install

1. Download `pi-hole.tempo-score` from the button above.
2. Double-click it. Tempo opens a review sheet, then click **Install**. The score lands in `~/Library/Application Support/Tempo/Scores/`.
3. In Tempo **Settings → Ingestion**, add a token named `pi-hole` bound to `net.pi-hole.pi-hole`. Copy the token.
4. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest` (or `127.0.0.1` if Tempo is loopback-only).
5. Install the polling script (below).

## Polling script

Save as `pihole-tempo.sh`, edit the four config values, and run on cron every 5–10 minutes. The script tracks state across runs so it only POSTs to Tempo when something **changes** (no spam).

```sh
#!/usr/bin/env bash
# pihole-tempo.sh - emit Pi-hole state + update-available to Tempo
set -uo pipefail

# ── Config ────────────────────────────────────────────────────────────────
PIHOLE_URL="http://pi.hole"        # base URL of your Pi-hole
PIHOLE_PASS="your-admin-password"  # admin password (v6)
TEMPO_URL="http://your-mac.local:7776/ingest"
TEMPO_TOKEN="paste-tempo-token-here"
STATE_DIR="${HOME}/.local/state/pihole-tempo"
# ──────────────────────────────────────────────────────────────────────────

mkdir -p "$STATE_DIR"

emit() { # title status action
    curl -sS --max-time 5 -X POST \
        -H "X-Tempo-Token: ${TEMPO_TOKEN}" -H "Content-Type: application/json" \
        -d "{\"providerIdentifier\":\"net.pi-hole.pi-hole\",\"title\":\"$1\",\"startDate\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"eventType\":\"alert\",\"metadata\":{\"Status\":\"$2\",\"Action\":\"$3\",\"ServerUrl\":\"${PIHOLE_URL}\"}}" \
        "${TEMPO_URL}" >/dev/null
}
# returns success only when the value for <key> differs from the last run
changed() {
    local f="${STATE_DIR}/last_$1" last
    last=$( [ -f "$f" ] && cat "$f" || echo "" )
    echo "$2" > "$f"
    [ "$2" != "$last" ]
}

# ── Auth (Pi-hole v6). IMPORTANT: delete the session at the end - auth on
#    every run WITHOUT deleting exhausts Pi-hole's API seats (api_seats_exceeded).
SID=$(curl -s --max-time 5 -X POST -H "Content-Type: application/json" \
    -d "{\"password\":\"${PIHOLE_PASS}\"}" "${PIHOLE_URL}/api/auth" \
    | jq -r '.session.sid // empty')

# ── 1. Blocking status + reachability (the high-value signal: DNS down) ────
if [ -z "$SID" ]; then
    STATUS="unreachable"
else
    BLOCKING=$(curl -s --max-time 5 -H "X-FTL-SID: $SID" "${PIHOLE_URL}/api/dns/blocking" \
               | jq -r '.blocking // "unknown"')
    case "$BLOCKING" in
        enabled)  STATUS="up" ;;
        disabled) STATUS="disabled" ;;
        *)        STATUS="unreachable" ;;
    esac
fi
if changed status "$STATUS"; then
    case "$STATUS" in
        up)          emit "Pi-hole - blocking enabled"  "up"          "blocking_enabled" ;;
        disabled)    emit "Pi-hole - blocking disabled" "disabled"    "blocking_disabled" ;;
        unreachable) emit "Pi-hole unreachable"         "unreachable" "" ;;
    esac
fi

# ── 2. Update available (local vs remote per component: core / web / ftl) ──
if [ -n "$SID" ]; then
    UPD=$(curl -s --max-time 5 -H "X-FTL-SID: $SID" "${PIHOLE_URL}/api/info/version" \
        | jq -r '[.version.core, .version.web, .version.ftl] | map(select(.local.version != .remote.version)) | length')
    if changed update "${UPD:-0}" && [ "${UPD:-0}" -gt 0 ]; then
        emit "Pi-hole - update available" "up" "update_available"
    fi
fi

# ── Clean up the session (prevents api_seats_exceeded over time) ───────────
[ -n "$SID" ] && curl -s --max-time 5 -X DELETE -H "X-FTL-SID: $SID" "${PIHOLE_URL}/api/auth" >/dev/null 2>&1
```

## Schedule

```sh
crontab -e
# Run every 5 minutes
*/5 * * * * /path/to/pihole-tempo.sh >> /tmp/pihole-tempo.log 2>&1
```

## Verify

Disable Pi-hole blocking from the admin UI for 30s, then run the script manually. You should see a `Pi-hole - blocking disabled` event in Tempo within a couple of seconds, marked **warning**.

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

- **`ServerUrl`**: base URL of the Pi-hole. Used by every action.
- **`Status`** or **`Action`**: drives severity. At least one should be present.
- **`Domain`**: only when the event is about a specific domain (e.g. unblock action). Used by the "Copy domain" action; optional otherwise.

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
  "title": "Pi-hole - blocking disabled",
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

- The script surfaces three things: **reachability** (`up` / `disabled` / `unreachable`, where a Pi-hole that's down means your network's DNS is down, the highest-value signal here), the **blocking toggle**, and **update available** (compares local vs remote `core`/`web`/`ftl` versions). It always **deletes its API session** at the end: Pi-hole v6 caps concurrent API sessions, and authenticating on every run *without* deleting eventually triggers `api_seats_exceeded` (raise `webserver.api.max_sessions` if you poll very frequently). Polling can miss state changes shorter than the interval; a 5-minute interval catches sustained states (down, blocking left off, update available), not quick toggles.
- `high_load` and `gravity_update` from the severity table are left as optional extensions (CPU load is noisy on a DNS resolver; gravity has no clean status endpoint). Add them with the same `metadata` keys if you want them.
- The catalog score uses only `openURL` and `copyToClipboard`. Terminal-based actions (e.g. `pihole disable 30m`) require a **local drop-in** score, explicitly trusted by you.
- For multi-instance setups (primary + secondary Pi-hole), run one script per instance with its own `ServerUrl` and `PIHOLE_PASS`. Tempo lists them as the same source but each event carries its own URL.
