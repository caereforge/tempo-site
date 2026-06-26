---
title: "Sonarr"
description: "Sonarr grabs, imports, and health events in your Tempo timeline, stacked per series, each carrying an Open Sonarr action."
providerIdentifier: "com.sonarr"
color: "#35C5F0"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Sonarr is a PVR for TV series: it watches your indexers, grabs new episodes, and imports them into your library. This score teaches Tempo to read the events Sonarr raises and present them on one timeline, grouped by series so a busy season reads as a single stack instead of a flood.

Each event lands with a severity drawn straight from the Sonarr event type, plus a one-click **Open Sonarr** action that points back at the Sonarr web UI.

This score is part of the shared **\*arr integration** kit (Sonarr, Radarr, Prowlarr, Jellyseerr), which all wire to Tempo the same way. Sonarr sends only data (title + metadata); the score owns the color, severity, grouping, and action.

---

## Install

The Sonarr score is **built in**. Tempo seeds it on first launch; install it from **Manage Sources** if it isn't already active. There's nothing to download.

1. In Tempo **Settings → Tokens**, create a token bound to `com.sonarr`. A token bound to a provider only accepts events that declare that provider, so this token can't be reused to spoof your other \*arr apps.
2. If you'll post over TLS (recommended), mark the token **secure** and grab the Tempo certificate from **Settings → Security**.
3. Note your Tempo endpoint: `https://<your-mac-ip>:8776/ingest` for TLS, or plain `http://<your-mac-ip>:7776/ingest` if you'd rather skip it.

## Sonarr side

Tempo does **not** run anything for you. Sonarr posts to Tempo by running a small **Custom Script** connection (`tempo-notify.sh`) on each event; the script POSTs a Tempo-shaped payload.

Get the script from the shared \*arr kit. Open the score in Tempo's **Score Editor → Source** tab for the package, or download it from the Tempo website. (Because Sonarr, Radarr, and Prowlarr share one helper kit, the Source tab shows no "Get the helper" button for these three, pull the files from the package.) Then follow the kit's README:

1. **Drop the script into the container.** Sonarr's `/config` is a host bind mount; copy `tempo-notify-sonarr.sh` there as `/config/scripts/tempo-notify.sh` and `chmod +x` it. Place the Tempo cert (`/config/tempo-cert.pem`) and your `com.sonarr` token (`/config/tempo-token`, mode 600) alongside it, the paths the script expects.
2. **Register the connection.** In Sonarr: **Settings → Connect → + → Custom Script**.
   - Name: `Tempo`
   - Path: `/config/scripts/tempo-notify.sh`
   - Triggers: enable On Grab, On Import, On Health Issue, On Health Restored, On Manual Interaction Required (and others as you like).
   - **Test**: Tempo should receive a test event and the button goes green.

The script depends on `curl` being present in the container (the LinuxServer images ship it). It has no retry queue: if Tempo is unreachable when an event fires, that event is lost, but for health state you'll still get the next transition.

## What you'll see

Events stack by series title (`${metadata.series}`). Severity comes from the Sonarr event type:

| Sonarr event | Severity | Label |
|---|---|---|
| Grab | info | Grabbing |
| Download (import) | ok | Imported |
| Health Issue | warning | Health issue |
| Manual Interaction Required | warning | Action needed |
| Health Restored | ok | Recovered |

Anything else lands at the default `info` severity.

Every event carries one action:

- **Open Sonarr**: opens `http://<sender>:8989`, resolved to the host that sent the event at click time.
