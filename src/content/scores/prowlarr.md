---
title: "Prowlarr"
description: "Prowlarr health and update events in Tempo's timeline: health issues as warnings, recoveries as resolved, each with an Open Prowlarr action."
providerIdentifier: "com.prowlarr"
color: "#E66000"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Prowlarr is the indexer manager for the *arr stack: it manages your Usenet and torrent indexers and feeds them to Sonarr, Radarr, and friends. It isn't a downloader and has no media library of its own, so the events worth surfacing are operational: indexer/health problems and application updates. This score gives those events their color and severity and attaches an action that opens Prowlarr.

This score ships built-in and is seeded on first launch. It shares one helper kit with Sonarr and Radarr — the *arr integration — because all three wire to Tempo the same way: a **Custom Script** connection that POSTs a Tempo-shaped event on each notification.

## Install

1. The score is built in. Open Tempo's **Manage Sources** and install **Prowlarr** if it isn't active yet.
2. In Tempo **Settings → Tokens**, create a token bound to `com.prowlarr`. A token bound to a provider only accepts events declaring that provider, so leaking it can't spoof your other sources. If you post over TLS (recommended), mark the token **secure**.
3. If you'll use the encrypted port, download Tempo's TLS certificate from **Settings → Security** and place it where the Prowlarr host can read it.
4. Set up the Prowlarr side (below).

The *arr scores share one helper kit at `Integrations/arr/`, so the Score Editor's **Source** tab shows no "Get the helper" button for Prowlarr. Get `tempo-notify-prowlarr.sh` (and the rest of the kit) from the Tempo website, then follow the steps below.

## Prowlarr side

Prowlarr runs the script inside its container, so the script and secrets go into the app's `/config` bind mount.

1. **Drop the files in.** Copy the script and secrets into Prowlarr's config directory on the host (the script expects them at `/config` inside the container):

   ```sh
   mkdir -p /path/to/prowlarr/scripts
   cp tempo-notify-prowlarr.sh /path/to/prowlarr/scripts/tempo-notify.sh
   chmod +x /path/to/prowlarr/scripts/tempo-notify.sh
   cp tempo-cert.pem /path/to/prowlarr/tempo-cert.pem          # only if posting over TLS
   printf '%s' '<com.prowlarr token>' > /path/to/prowlarr/tempo-token
   chmod 600 /path/to/prowlarr/tempo-token
   ```

   Inside the container these are `/config/scripts/tempo-notify.sh`, `/config/tempo-cert.pem`, and `/config/tempo-token`. The script posts to `https://<mac-ip>:8776/ingest` (or plain `http://<mac-ip>:7776/ingest` if you skip TLS — then drop the cert and leave the token non-secure).

2. **Register the connection.** In Prowlarr: **Settings → Connect → + → Custom Script**.
   - Name: `Tempo`
   - Path: `/config/scripts/tempo-notify.sh`
   - Triggers: enable **On Health Issue**, **On Health Restored**, and **On Application Update**.
   - **Test** the connection — Tempo should receive a test event and the button goes green.

Tempo does not run the script for you. It lives on the Prowlarr host and fires whenever Prowlarr raises a notification. See the *arr integration README for the full reference.

## What you'll see

The score classifies on the `event` field Prowlarr sends:

| Event | Severity | Label |
|-------|----------|-------|
| `HealthIssue` | warning | Health issue |
| `HealthRestored` | ok | Recovered |
| anything else (e.g. application update) | info | Info |

Every event carries one action:

- **Open Prowlarr** — opens `http://<sender>:9696`, resolved to the host that sent the event at click time.

There are no library or download events here — Prowlarr manages indexers, not media. If an indexer fails or Prowlarr flags a health problem you get a warning to act on; when it clears, a resolved entry closes the loop.
