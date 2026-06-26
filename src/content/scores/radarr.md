---
title: "Radarr"
description: "Radarr grabs, imports, and health events on the Tempo timeline, stacked per movie, with an Open Radarr action resolved to the sender's address."
providerIdentifier: "com.radarr"
color: "#FFC230"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Radarr is a movie PVR: it watches your indexers, grabs releases, and imports finished downloads into your library. This score turns Radarr's notifications into timeline entries, colored and labeled by what happened, and stacks every event for the same movie into one entry, so a grab followed by an import reads as a single line rather than two separate rows.

The sender carries only data (a title plus metadata). The score owns the presentation: color, severity, grouping, and the action. Radarr posts a Tempo-shaped event on every notification it raises, and this score gives those events their look and behavior in Tempo.

## How it works

Radarr has no long-lived daemon talking to Tempo. Instead, Radarr's **Custom Script** connection runs a small POSIX `sh` script (`tempo-notify.sh`) once per event. When Radarr grabs a release, imports a file, or hits a health problem, it invokes the script, passing the event details as `radarr_*` environment variables. The script builds a Tempo event and POSTs it to Tempo's ingestion server.

```
Radarr  (Custom Script connection, fires per event)
      |  runs tempo-notify.sh with radarr_* env vars
script builds a Tempo event, POSTs with the com.radarr token
      |  HTTPS :8776 (TLS)  or  HTTP :7776 (plain)
Tempo ingestion server
```

Because there is no persistent process, there is nothing to keep alive: Radarr starts the script, the script posts one event and exits. Radarr, Sonarr, and Prowlarr all wire to Tempo this way and share one integration kit.

## Setup

### 1. Enable the score and create a token

1. In Tempo, open **Manage Sources** and install **Radarr** if it is not already active. This score ships built-in and is seeded on first launch, so there is nothing to download.
2. In Tempo **Settings → Tokens**, create a token bound to `com.radarr`. A token bound to a provider only accepts events that declare that provider, so leaking one app's token cannot spoof another. If you post over TLS (recommended), mark the token **secure**.
3. Note your Tempo endpoint: `https://<mac-ip>:8776/ingest` (encrypted), or `http://<mac-ip>:7776/ingest` (plain HTTP). The arr integration script posts to the TLS port by default and verifies Tempo against a pinned certificate; the plain port works if you prefer to skip TLS.

### 2. Get the script

Radarr posts through the shared **arr integration** kit. The Radarr script is `tempo-notify-radarr.sh`, alongside `tempo-cert.pem` (the Tempo TLS certificate) and the matching scores.

Note: the arr kit covers Radarr, Sonarr, and Prowlarr from one shared package rather than a per-provider kit, so the Score Editor's **Source** tab shows **no** "Open in Finder" or helper button for these three scores. Get the script from the arr integration package or from the Tempo website's utilities page, then follow the arr README. Download the Tempo TLS certificate from **Settings → Security**.

### 3. Install the script on the Radarr host

Radarr's `/config` directory is a host bind mount, so copy the files into it (adjust the host path to your setup):

```sh
mkdir -p /mnt/storage/arr/radarr/scripts
cp tempo-notify-radarr.sh /mnt/storage/arr/radarr/scripts/tempo-notify.sh
chmod +x /mnt/storage/arr/radarr/scripts/tempo-notify.sh
cp tempo-cert.pem /mnt/storage/arr/radarr/tempo-cert.pem        # only if posting to :8776
printf '%s' '<com.radarr token>' > /mnt/storage/arr/radarr/tempo-token
chmod 600 /mnt/storage/arr/radarr/tempo-token
```

Inside the container these become `/config/scripts/tempo-notify.sh`, `/config/tempo-cert.pem`, and `/config/tempo-token`, which are the paths the script expects. If you post to plain `:7776`, drop the `tempo-cert.pem` step, leave the token non-secure, and the script posts over HTTP.

### 4. Register the Custom Script connection

In Radarr: **Settings → Connect → + → Custom Script**.

- **Name**: `Tempo`
- **Path**: `/config/scripts/tempo-notify.sh`
- **Triggers**: enable the ones you want: On Grab, On Import, On Health Issue, On Health Restored, On Manual Interaction Required.
- **Test**: Radarr sends a test event; Tempo should receive it and the button turns green.

<!-- SCREENSHOT: Radarr Settings → Connect → Custom Script form, with Name "Tempo", the Path field, and the trigger checkboxes -->

## What you'll see

Every Radarr event lands stacked under its movie. Severity and label are assigned by event type:

| Event | Severity | Label |
|---|---|---|
| `Grab` | info | Grabbing |
| `Download` | ok | Imported |
| `HealthIssue` | warning | Health issue |
| `HealthRestored` | ok | Recovered |
| `ManualInteractionRequired` | warning | Action needed |

Any other event falls through to the default, which is `info` with the label `Info`.

## Grouping and actions

Events stack by movie, keyed on `${metadata.movie}`. A grab and the import that follows it collapse into one timeline entry for that movie rather than two separate rows.

Each entry carries one action:

- **Open Radarr**: opens `http://${metadata.senderAddress}:7878`, resolved to the Radarr host's own address at click time. `7878` is Radarr's default web UI port; if you run Radarr on a different port, edit the action in the score.

## Troubleshooting and limitations

- **Events arrive but render without styling**: the Radarr score is not enabled. Turn it on in **Manage Sources**.
- **Nothing arrives after a Test**: confirm the token is bound to `com.radarr` and, if you marked it secure, that the script posts to the TLS `:8776` port with the pinned cert. Check Tempo's rejection audit (`~/Library/Application Support/Tempo/rejections.csv`) for the reason.
- **The Custom Script runs inside the container**, so it depends on `curl` being present (the LinuxServer image ships it) and on `/config` being a host bind mount you can write the secrets into.
- **No retry or queue**: if Tempo is unreachable when an event fires, that event is lost; Radarr does not re-fire it. For health state you still get the next transition.
- One token per source is by design; tokens are not shared across the arr apps.
