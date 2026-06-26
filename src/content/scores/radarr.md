---
title: "Radarr"
description: "Radarr grabs, imports, and health events in Tempo's timeline, stacked per movie, with an Open Radarr action resolved to the sender's address."
providerIdentifier: "com.radarr"
color: "#FFC230"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Radarr is a movie PVR: it watches your indexers, grabs releases, and imports finished downloads into your library. This score turns Radarr's notifications into timeline entries, colored and labeled by what happened, and **stacks every event for the same movie into one entry** so a grab followed by an import reads as one line, not two.

The sender carries only data (title + metadata); the score owns the presentation. Radarr posts a Tempo-shaped event on every notification it raises, and this score gives those events their severity, grouping, and an **Open Radarr** action.

---

## Install

This score ships **built-in** and is seeded on first launch, nothing to download.

1. In Tempo, open **Manage Sources** and install **Radarr** if it isn't already active.
2. In Tempo **Settings → Tokens**, create a token bound to `com.radarr`. A token bound to a provider only accepts events declaring that provider, so leaking one app's token can't spoof another. If you post over TLS (recommended), mark the token **secure**.
3. Note your Tempo endpoint: `https://<mac-ip>:8776/ingest` (encrypted), or `http://<mac-ip>:7776/ingest` (plain HTTP).

Radarr forwards events by running a small **Custom Script** connection. Tempo does **not** run it for you. You install `tempo-notify.sh` on the Radarr host and register it under Radarr's settings. See the next section.

## Radarr side

Radarr posts to Tempo via the shared **arr integration** kit (`tempo-notify-radarr.sh`). Get the files from the kit referenced in the Score Editor → **Source** tab, then follow the arr README. In short:

### 1. Drop the script + secrets into the container

Radarr's `/config` is a host bind mount, so copy the files there (adjust the host path to your setup):

```sh
mkdir -p /mnt/storage/arr/radarr/scripts
cp tempo-notify-radarr.sh /mnt/storage/arr/radarr/scripts/tempo-notify.sh
chmod +x /mnt/storage/arr/radarr/scripts/tempo-notify.sh
cp tempo-cert.pem /mnt/storage/arr/radarr/tempo-cert.pem        # the Tempo TLS cert (if posting to :8776)
printf '%s' '<com.radarr token>' > /mnt/storage/arr/radarr/tempo-token
chmod 600 /mnt/storage/arr/radarr/tempo-token
```

Inside the container these are `/config/scripts/tempo-notify.sh`, `/config/tempo-cert.pem`, and `/config/tempo-token`, the paths the script expects. Download the Tempo TLS cert from **Settings → Security**; drop the `--cacert` flag and leave the token non-secure if you post to plain `:7776`.

### 2. Register the Custom Script connection

In Radarr: **Settings → Connect → + → Custom Script**.

- **Name**: `Tempo`
- **Path**: `/config/scripts/tempo-notify.sh`
- **Triggers**: enable the ones you want: On Grab, On Import, On Health Issue, On Health Restored, On Manual Interaction Required.
- **Test**: Tempo should receive a test event and the button turns green.

The Custom Script runs **inside** the container and depends on `curl` being present (the LinuxServer image ships it). The script has no retry/queue: if Tempo is unreachable when an event fires, that event is lost. For health state you still get the next transition.

## What you'll see

Every Radarr event lands stacked under its movie. Severity is assigned by event type:

| Event | Severity | Label |
|---|---|---|
| `Grab` | info | Grabbing |
| `Download` | ok | Imported |
| `HealthIssue` | warning | Health issue |
| `HealthRestored` | ok | Recovered |
| `ManualInteractionRequired` | warning | Action needed |

Anything else falls through to the default (`info`).

Each entry carries one action:

- **Open Radarr**: opens `http://<sender>:7878`, resolved to the Radarr host's own address at click time.
