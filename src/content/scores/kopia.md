---
title: "Kopia"
description: "Kopia snapshot outcomes in your Tempo timeline — success, failure, warning, or no-change — with one-click kopia CLI actions to run, list, and inspect backups."
providerIdentifier: "com.kopia"
color: "#30D158"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Kopia is a fast, encrypted backup tool that snapshots your files to a local or remote repository. This score teaches Tempo to read Kopia's snapshot notifications and turn each one into a timeline event: it raises severity by the snapshot `outcome`, shows the size delta as a headline on success, and surfaces failures and warnings as something you can act on.

Kopia is **stateless** in Tempo — each snapshot run is a distinct event with its own externalID. Repeated snapshots of the same source don't overwrite one another; instead they stack. The grouping key is `${metadata.repo}/${metadata.path}` (falling back to `${metadata.path}`), so successive runs of the same backup source collapse into one stack you can expand.

## Install

The Kopia score ships built in and is seeded on first launch — there's nothing to download or import.

1. In Tempo **Settings → Ingestion**, add a token bound to `com.kopia` and copy it.
2. Your Tempo endpoint is `http://<your-mac-ip>:7776/ingest`.
3. Wire Kopia to POST there (see below).

## Kopia side

Kopia can call a webhook when a snapshot finishes. In **KopiaUI** (or via `kopia notification`) add a **Webhook** notification profile:

- **URL**: `http://<your-mac-ip>:7776/ingest`
- **Method**: POST
- **Header**: `X-Tempo-Token: <token>` (the token you copied from **Settings → Ingestion**)

Kopia sends a raw webhook; the built-in score formats it. There is nothing to install on the Kopia side beyond the notification profile — adjust presentation in Tempo's Score Editor.

## What you'll see

The score classifies each snapshot by its `outcome`:

- **`ok`** — snapshot completed. The size delta shows as a headline metric (for example `+95.8 MB`), via `${metadata.headline}`.
- **`error`** — snapshot failed. Surfaced as an error ("Backup failed") you can act on.
- **`warning`** — surfaced as a warning.
- **`no-change`** — an info row ("No change"); nothing changed since the last snapshot.

Each event carries action buttons that run against the `kopia` CLI in Terminal (these work fine alongside a running KopiaUI server):

- **Run snapshot now** — `kopia snapshot create ${metadata.path}`
- **List snapshots** — `kopia snapshot list ${metadata.path}`
- **Repository status** — `kopia repository status`
- **Maintenance info** — `kopia maintenance info`

Three further actions ship **disabled** — "Open KopiaUI (desktop app)", "Open Kopia server (web UI)", and "Kopia docs". Since a 2026 KopiaUI update its window is a menubar-icon popover that no external app (Tempo included) can open, and the web-UI button needs a server URL the webhook doesn't send. Enable any of them in the Score Editor's Actions tab if your setup supports them.

In the Score Editor's **Source** tab you can assign a friendly name to a backup source, so a long snapshot path reads as something recognizable at a glance ("Photos", "Trantor /etc").
