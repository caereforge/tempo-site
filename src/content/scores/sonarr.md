---
title: "Sonarr"
description: "Sonarr grabs, imports, and health events on the Tempo timeline, stacked per series, each carrying an Open Sonarr action."
providerIdentifier: "com.sonarr"
color: "#35C5F0"
version: "1.0.0"
compatibility:
  - "Sonarr v3"
  - "Sonarr v4"
pubDate: 2026-06-26
builtIn: true
---

Sonarr is a PVR (personal video recorder) for TV series. It watches your indexers, grabs new episodes as they appear, imports the downloaded files into your library, and reports on its own health. This score teaches Tempo to read the events Sonarr raises and render them on one timeline, grouped by series so a busy season reads as a single stack instead of a row per episode.

Each event lands with a severity drawn from the Sonarr event type, plus a one-click **Open Sonarr** action that points back at the Sonarr web UI.

This score is part of the shared **\*arr integration** kit (Sonarr, Radarr, Prowlarr, Jellyseerr), which all wire to Tempo the same way. Sonarr sends only data (a title plus metadata); the score owns the color, severity, grouping, and action.

## How it works

There is no daemon to keep alive. Sonarr already has a built-in **Custom Script** connection: on every notification it raises (a grab, an import, a health change), it runs a script you register and passes the event details as environment variables. The Sonarr side of this integration is a small POSIX `sh` script, `tempo-notify.sh`, that reads those variables and POSTs a Tempo-shaped event to Tempo's ingestion server.

```
Sonarr  (fires an event: On Grab, On Import, On Health Issue, ...)
      |  runs the Custom Script, passing sonarr_* env variables
tempo-notify.sh  (inside the Sonarr container)
      |  HTTPS POST to /ingest, with the per-provider token
Tempo ingestion server  on the Mac (:8776 TLS, or :7776 plain)
```

Because Sonarr invokes the script per event, nothing runs between events. There is no launchd job, no systemd unit, and no long-lived process to supervise. You register the script once and Sonarr handles the rest.

## Setup

### 1. Create a Tempo token

In Tempo, open **Settings → Tokens** and create a token bound to `com.sonarr`. A token bound to a provider only accepts events that declare that provider, so this token cannot be reused to spoof your other \*arr apps. If you will post over TLS (recommended), mark the token **secure** so plain-HTTP events are rejected.

Note your endpoint: `https://<your-mac-ip>:8776/ingest` for TLS, or plain `http://<your-mac-ip>:7776/ingest` if you would rather skip it. For the TLS port, download Tempo's certificate from **Settings → Security** and place it where Sonarr can read it.

### 2. Get the script

The Sonarr, Radarr, and Prowlarr scores share one helper kit (`Integrations/arr/`) rather than a per-provider kit. As a result the Score Editor's **Source** tab shows **no** "Open in Finder" or "Get the helper" button for these three scores. Get the script kit one of two ways:

- Download the **\*arr integration package** from the Tempo website (`tempoapp.app/utilities/`), or
- Open the score's **README** for the package and pull the files listed there.

The package contains `tempo-notify-sonarr.sh` (the Sonarr variant), the matching Radarr and Prowlarr scripts, the score JSON files, and a README with the full procedure.

### 3. Install the script on the Sonarr host

Sonarr's `/config` directory is a host bind mount, so copy the files there. The container then reads them at the paths the script expects (`/config/scripts/tempo-notify.sh`, `/config/tempo-cert.pem`, `/config/tempo-token`):

```bash
# example: Sonarr config at /mnt/storage/arr/sonarr on the host
mkdir -p /mnt/storage/arr/sonarr/scripts
cp tempo-notify-sonarr.sh /mnt/storage/arr/sonarr/scripts/tempo-notify.sh
chmod +x /mnt/storage/arr/sonarr/scripts/tempo-notify.sh

cp tempo-cert.pem /mnt/storage/arr/sonarr/tempo-cert.pem      # only for the TLS port
printf '%s' '<com.sonarr token>' > /mnt/storage/arr/sonarr/tempo-token
chmod 600 /mnt/storage/arr/sonarr/tempo-token
```

If you post to the plain `:7776` port instead, drop the certificate and leave the token non-secure.

### 4. Register the Custom Script connection

In Sonarr, open **Settings → Connect → + → Custom Script**:

- **Name**: `Tempo`
- **Path**: `/config/scripts/tempo-notify.sh`
- **Triggers**: enable the ones you want, for example On Grab, On Import, On Health Issue, On Health Restored, On Manual Interaction Required, On Application Update.
- **Test**: Tempo should receive a test event and the button turns green.

<!-- SCREENSHOT: Sonarr Settings → Connect → Custom Script form, showing Name "Tempo", the script path, and the trigger checkboxes enabled -->

You can also register it over Sonarr's API by POSTing the CustomScript schema to `/api/v3/notification`, with the path set to the script above and the triggers you want.

## What you'll see

Severity comes from the Sonarr event type. The score reads `${metadata.event}` and applies these rules:

| Sonarr event | Severity | Label |
|---|---|---|
| Grab | info | Grabbing |
| Download (import) | ok | Imported |
| Health Issue | warning | Health issue |
| Manual Interaction Required | warning | Action needed |
| Health Restored | ok | Recovered |

Any other event lands at the default `info` severity with the label `Info`.

## Grouping and actions

Events stack by series title (`${metadata.series}`), so all the grabs and imports for one show read as a single entry rather than a flood of separate rows. Health events, which carry no series, group on their own.

Every event carries one action:

- **Open Sonarr**: opens `http://${metadata.senderAddress}:8989`, resolved at click time to the host that sent the event. `8989` is Sonarr's default web UI port; if you run it elsewhere, the action still uses `8989`.

## Troubleshooting and limitations

- **Test event never arrives**: confirm the script path is correct inside the container (`/config/scripts/tempo-notify.sh`) and that it is executable. Check that the Mac's IP, port, and token in the script's secret files match what Tempo expects.
- **`curl: not found` in the connection log**: the script depends on `curl` being present in the container. The LinuxServer images ship it; a minimal custom image may not.
- **Events rejected**: a token marked **secure** rejects plain-HTTP events. Either post to `:8776` with TLS or clear the secure flag and post to `:7776`.
- **No retry queue**: if Tempo is unreachable when an event fires, that event is lost; Sonarr does not re-fire it. For health state you still get the next transition (a restored health check arrives later), but a missed grab or import will not be replayed.
- **One token per source**: tokens are not shared across \*arr apps. Each app needs its own token bound to its own provider.
