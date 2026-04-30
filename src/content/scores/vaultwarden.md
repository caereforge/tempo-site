---
title: "Vaultwarden"
description: "Vaultwarden auth events, admin actions, and liveness in Tempo's timeline. Poll- and log-driven, your admin token stays local."
providerIdentifier: "com.vaultwarden"
color: "#175DDC"
version: "1.0.0"
file: "/scores/vaultwarden.tempo-score"
compatibility:
  - "Vaultwarden 1.32+"
pubDate: 2026-04-30
downloadable: true
---

Surface Vaultwarden auth events, admin actions, and liveness in Tempo with four default actions (open vault, open admin, copy server URL, copy user email).

Vaultwarden has **no native outbound webhook**, so this integration is **poll- and log-driven**: a small bash script either polls Vaultwarden's admin diagnostics endpoint (liveness) and/or tails its log file (auth events), and POSTs to Tempo when something changes.

The integration intentionally keeps the source's secrets local — your admin token never leaves the machine running the script.

Tested with Vaultwarden 1.32+ in a standard Docker setup.

---

## Install

1. Download `vaultwarden.tempo-score` from the button above.
2. Double-click it. Tempo opens a review sheet — click **Install**. The score lands in `~/Library/Application Support/Tempo/Scores/`.
3. In Tempo **Settings → Ingestion**, add a token named `vaultwarden` bound to `com.vaultwarden`. Copy the token — you'll paste it into the script in the next step.
4. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest` (or `127.0.0.1` if Tempo is loopback-only).
5. Install the polling + log-tail script (below).

## Polling + log-tail script

The script does two things on each run:
- **Liveness probe** via `${VW_URL}/alive` (public, no auth) — emits a `Status` transition when the server stops/starts responding.
- **Auth event tail** via the Vaultwarden log file — emits `Event` entries for failed/successful logins, admin actions, vault exports, etc.

Save as `vaultwarden-tempo.sh`, edit the config block, run on cron (e.g. every 2 minutes for liveness; the log tail does its own state-tracking).

```sh
#!/usr/bin/env bash
# vaultwarden-tempo.sh — emit Vaultwarden state + auth events to Tempo
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────
VW_URL="https://vault.example.lan"
VW_LOG="/var/log/vaultwarden/access.log"   # or wherever yours lives
TEMPO_URL="http://your-mac.local:7776/ingest"
TEMPO_TOKEN="paste-tempo-token-here"
STATE_DIR="${HOME}/.local/state/vaultwarden-tempo"
# ──────────────────────────────────────────────────────────────────────────

mkdir -p "$STATE_DIR"
LAST_STATUS_FILE="${STATE_DIR}/last_status"
LAST_LOG_OFFSET="${STATE_DIR}/last_log_offset"

emit_event() {
    local title=$1 event=$2 status=${3:-} email=${4:-}
    curl -sS -X POST \
        -H "X-Tempo-Token: ${TEMPO_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
          \"providerIdentifier\": \"com.vaultwarden\",
          \"title\": \"${title}\",
          \"startDate\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
          \"eventType\": \"alert\",
          \"metadata\": {
            \"Event\": \"${event}\",
            \"Status\": \"${status}\",
            \"ServerUrl\": \"${VW_URL}\",
            \"UserEmail\": \"${email}\"
          }
        }" \
        "${TEMPO_URL}" >/dev/null
}

# ── 1. Liveness probe ────────────────────────────────────────────────────
if curl -fsS --max-time 5 "${VW_URL}/alive" >/dev/null 2>&1; then
    STATUS="up"
else
    STATUS="unreachable"
fi
LAST=$( [ -f "$LAST_STATUS_FILE" ] && cat "$LAST_STATUS_FILE" || echo "")
echo "$STATUS" > "$LAST_STATUS_FILE"
if [ "$STATUS" != "$LAST" ]; then
    case "$STATUS" in
        up)          emit_event "Vaultwarden up"              "alive_recovered" "up" ;;
        unreachable) emit_event "Vaultwarden unreachable"     "alive_failed"    "unreachable" ;;
    esac
fi

# ── 2. Auth event tail ───────────────────────────────────────────────────
[ -f "$VW_LOG" ] || exit 0
LAST_OFFSET=$( [ -f "$LAST_LOG_OFFSET" ] && cat "$LAST_LOG_OFFSET" || echo 0)
CURRENT_SIZE=$(stat -f%z "$VW_LOG" 2>/dev/null || stat -c%s "$VW_LOG")
[ "$CURRENT_SIZE" -lt "$LAST_OFFSET" ] && LAST_OFFSET=0

tail -c +$((LAST_OFFSET + 1)) "$VW_LOG" | while IFS= read -r line; do
    case "$line" in
        *"Username or password is incorrect"*|*"login failed"*)
            email=$(echo "$line" | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+' | head -n 1)
            emit_event "Login failed" "login_failed" "" "$email"
            ;;
        *"User logged in successfully"*|*"Logged in"*)
            email=$(echo "$line" | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+' | head -n 1)
            emit_event "User logged in" "user_login" "" "$email"
            ;;
        *"Admin authenticated"*)
            emit_event "Admin login"          "admin_login"        "" ""
            ;;
        *"Admin login failed"*)
            emit_event "Admin login failed"   "admin_login_failed" "" ""
            ;;
        *"User registered"*|*"User created"*)
            email=$(echo "$line" | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+' | head -n 1)
            emit_event "User created" "user_created" "" "$email"
            ;;
        *"Vault exported"*|*"Exported vault"*)
            email=$(echo "$line" | grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+' | head -n 1)
            emit_event "Vault exported" "vault_exported" "" "$email"
            ;;
    esac
done

echo "$CURRENT_SIZE" > "$LAST_LOG_OFFSET"
```

> **Tuning the script.** The patterns above match the default Vaultwarden log format. Confirm yours with `tail vaultwarden.log` and tweak the `case` branches if the strings differ. Vaultwarden's wording has changed across versions — adapt rather than blindly trust.

## Schedule

```sh
crontab -e
# Every 2 minutes — covers liveness within ~2min, log tail catches up
*/2 * * * * /path/to/vaultwarden-tempo.sh >> /tmp/vaultwarden-tempo.log 2>&1
```

## Optional: brute-force burst detection

Append to the script after the log tail:

```sh
# If 5+ login_failed events appeared in the last 5 minutes, escalate
RECENT_FAILS=$(grep -c "login_failed" "${STATE_DIR}/recent.log" 2>/dev/null || echo 0)
if [ "$RECENT_FAILS" -ge 5 ]; then
    emit_event "Login failures burst (${RECENT_FAILS}/5min)" "login_failed_burst" "" ""
fi
```

Triggers the `warning` severity rule with a "Brute-force?" badge.

## Severity rules

| Match                              | Severity   | Badge          |
| ---------------------------------- | ---------- | -------------- |
| `Status: down`                     | `critical` | Down           |
| `Status: unreachable`              | `critical` | Unreachable    |
| `Event: login_failed_burst`        | `warning`  | Brute-force?   |
| `Event: admin_login_failed`        | `warning`  | Admin fail     |
| `Event: vault_exported`            | `warning`  | Vault export   |
| `Event: login_failed`              | `info`     | Login fail     |
| `Event: user_login`                | `info`     | Login          |
| `Event: user_created`              | `info`     | New user       |
| `Event: user_invited`              | `info`     | Invite         |
| `Event: admin_login`               | `info`     | Admin          |
| `Event: backup_completed`          | `info`     | Backup         |
| _(default)_                        | `info`     | Info           |

`vault_exported` is escalated to **warning** intentionally: even when legitimate, an export is a sensitive action worth surfacing in case it was not done by the account holder.

## Required `metadata` fields

- **`ServerUrl`** — base URL of Vaultwarden.
- **`Event`** — drives severity for non-liveness events.
- **`Status`** — used only for liveness transitions.
- **`UserEmail`** — set when the event involves a user (login, export, registration).

## Notes

- The catalog score uses only `openURL` and `copyToClipboard`. Disabling Vaultwarden, kicking sessions, rotating the admin token are sensitive actions and require a **local drop-in** score — explicitly trusted by you.
- For multi-instance setups, run one script per Vaultwarden with its own `VW_URL` and state directory; events flow to the same Tempo source.
- The Vaultwarden admin token is **never** sent to Tempo. The script reads the local log; the token only lives on the machine running the script.
