---
title: "Vaultwarden"
description: "Vaultwarden auth activity in Tempo's timeline: failed/successful logins, admin access, vault exports and a brute-force burst signal, grouped per source IP. Log-driven, your secrets stay local."
providerIdentifier: "com.vaultwarden"
color: "#175DDC"
version: "1.1.0"
file: "/scores/vaultwarden.tempo-score"
compatibility:
  - "Vaultwarden 1.32+"
pubDate: 2026-04-30
downloadable: true
---

Surface Vaultwarden auth activity in Tempo with five read-only actions (open vault, open admin, copy source IP, check IP reputation, copy user email). Built for the security angle: every event from one **source IP** collapses into a single stack, so a brute-force run reads as one entry instead of a flood.

Vaultwarden has **no native outbound webhook**, so this integration is **log-driven**: a small watcher tails the Vaultwarden container's log (`docker logs -f`) and POSTs to Tempo whenever it sees an auth-relevant line, extracting the source IP and user email.

The integration keeps the source's secrets local: your admin token and vault data **never leave the machine running the watcher**. Only the parsed event, source IP and user email go to Tempo.

Tested against live Vaultwarden 1.32+ in a standard Docker setup.

---

## Install

1. Download `vaultwarden.tempo-score` from the button above.
2. Double-click it. Tempo opens a review sheet, then click **Install**. The score lands in `~/Library/Application Support/Tempo/Scores/`.
3. In Tempo **Settings → Ingestion**, add a token named `vaultwarden` bound to `com.vaultwarden`. Copy the token; you'll paste it into the watcher's env in the next step.
4. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest` (or `127.0.0.1` if Tempo is loopback-only).
5. Install the log watcher (below) on the host running Vaultwarden.

## Log watcher

The watcher tails the container's stdout and emits a structured event on each auth-relevant line. It runs as a long-lived process (the `docker logs -f` stream), not a cron one-shot.

Save as `vaultwarden-tempo.sh`:

```sh
#!/usr/bin/env bash
# vaultwarden-tempo.sh - stream Vaultwarden auth events to Tempo
set -uo pipefail

: "${VW_URL:?set VW_URL}"               # https://<vaultwarden-host>:8443
: "${TEMPO_URL:?set TEMPO_URL}"         # http://<mac-ip>:7776/ingest
: "${TEMPO_TOKEN:?set TEMPO_TOKEN}"     # token bound to com.vaultwarden
VW_CONTAINER="${VW_CONTAINER:-vaultwarden}"
SD="${STATE_DIR:-$HOME/.local/state/vaultwarden-tempo}"; mkdir -p "$SD"

emit() {
  local title=$1 event=$2 email=${3:-} ip=${4:-}
  curl -s --max-time 5 -o /dev/null -X POST \
    -H "X-Tempo-Token: $TEMPO_TOKEN" -H 'Content-Type: application/json' \
    -d "{\"providerIdentifier\":\"com.vaultwarden\",\"title\":\"$title\",\"startDate\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"eventType\":\"alert\",\"metadata\":{\"Event\":\"$event\",\"ServerUrl\":\"$VW_URL\",\"UserEmail\":\"$email\",\"IP\":\"$ip\"}}" \
    "$TEMPO_URL"
}

while true; do
  docker logs -f --since 0s "$VW_CONTAINER" 2>&1 | while IFS= read -r line; do
    ip=$(echo "$line"    | grep -oE 'IP: [0-9a-fA-F:.]+'     | head -n1 | sed 's/IP: //; s/\.$//')
    email=$(echo "$line" | grep -oE 'Username: [^ ]+@[^ ]+' | head -n1 | sed 's/Username: //; s/\.$//')
    case "$line" in
      *"Username or password is incorrect"*)
        echo "$(date +%s)" >> "$SD/recent.log"
        emit "Login failed" "login_failed" "$email" "$ip"
        NOW=$(date +%s)
        awk -v c=$((NOW-300)) '$1>=c' "$SD/recent.log" > "$SD/recent.tmp" 2>/dev/null && mv "$SD/recent.tmp" "$SD/recent.log"
        n=$(wc -l < "$SD/recent.log" 2>/dev/null | tr -d ' ')
        [ "${n:-0}" -ge 5 ] && emit "Login failures burst ($n/5min)" "login_failed_burst" "" "$ip" ;;
      *"logged in successfully"*)              emit "User logged in"     "user_login"         "$email" "$ip" ;;
      *"Invalid admin token"*)                 emit "Admin login failed" "admin_login_failed" ""       "$ip" ;;
      *"(post_admin_login)"*"=> 200 OK"*)      emit "Admin login"        "admin_login"        ""       "$ip" ;;
      *"Vault exported"*|*"Exported vault"*)   emit "Vault exported"     "vault_exported"     "$email" "$ip" ;;
      *"User registered"*|*"created account"*) emit "User created"       "user_created"       "$email" "$ip" ;;
    esac
  done
  sleep 3
done
```

> **Bare-metal install?** Replace `docker logs -f --since 0s "$VW_CONTAINER"` with `tail -F /path/to/vaultwarden.log`; the `case` parser is the same.
> **Wording caveat.** The `login_failed`, `user_login`, `admin_login_failed` and `admin_login` patterns are validated against real 1.32–1.34 logs. `vault_exported` and `user_created` wordings vary by version: confirm with `docker logs <container>` and adapt the branch if needed.

## Run it persistently (flock keepalive)

The watcher is a long-lived stream, so keep it alive with a single-instance flock cron. It restarts within 5 minutes if it dies and starts on boot:

```sh
# vaultwarden.env  (chmod 600)
export VW_URL=https://<vaultwarden-host>:8443
export TEMPO_URL=http://<mac-ip>:7776/ingest
export TEMPO_TOKEN=<com.vaultwarden token>
export VW_CONTAINER=vaultwarden
export STATE_DIR=$HOME/.local/state/vaultwarden-tempo
```
```sh
# vaultwarden-run.sh
#!/bin/sh
. /path/to/vaultwarden.env
exec bash /path/to/vaultwarden-tempo.sh >> /path/to/vw-watcher.log 2>&1
```
```cron
*/5 * * * * flock -n /path/to/vaultwarden.lock /path/to/vaultwarden-run.sh
@reboot     flock -n /path/to/vaultwarden.lock /path/to/vaultwarden-run.sh
```

## Severity rules

| Match                         | Severity | Badge          |
| ----------------------------- | -------- | -------------- |
| `Event: login_failed_burst`   | `error`  | Brute-force?   |
| `Event: admin_login_failed`   | `warning`| Admin probe    |
| `Event: user_created`         | `warning`| New user       |
| `Event: vault_exported`       | `warning`| Vault export   |
| `Event: admin_login`          | `info`   | Admin          |
| `Event: login_failed`         | `info`   | Login fail     |
| `Event: user_login`           | `info`   | Login          |
| _(default)_                   | `info`   | Info           |

`login_failed_burst` fires when 5+ failed logins arrive within 5 minutes, the brute-force signal. `user_created` is a **warning** on purpose: on a personal vault with signups disabled, a new account means someone bypassed registration. `vault_exported` is a warning because an export is a data-exfil signal worth surfacing even when legitimate.

## Required `metadata` fields

- **`Event`**: drives severity (values above).
- **`ServerUrl`**: base URL of Vaultwarden (powers the open-vault / open-admin actions).
- **`IP`**: source IP of the auth line; the **grouping key** (all activity from one IP is one stack) and the most actionable field for a brute-force alert.
- **`UserEmail`**: set when the event involves a user.

## Hardening (recommended before storing real secrets)

The score gives you **visibility**; pair it with source-side hardening:
- `SIGNUPS_ALLOWED=false` once your account exists; then a `user_created` event is genuinely suspicious.
- `INVITATIONS_ALLOWED=false` unless you actively invite others.
- Strong `ADMIN_TOKEN`: an Argon2 hash (`docker exec <container> /vaultwarden hash`), not a plaintext string; or leave it unset to disable the admin panel.
- A reverse proxy + fail2ban if it's internet-reachable. The watcher **reports** brute-force, it does not block it.

## Notes

- The catalog score uses only `openURL` and `copyToClipboard`. Kicking sessions, disabling the server, or rotating the admin token are sensitive and require a **local drop-in** score you explicitly trust.
- For multiple instances, run one watcher per container with its own `VW_URL`, `VW_CONTAINER` and `STATE_DIR`; events flow to the same Tempo source.
