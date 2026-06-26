---
title: "Scripts"
description: "The generic catch-all source: any script, cron job, or webhook that can POST JSON lands on your Tempo timeline. The embodiment of \"if it can POST, Tempo can hear it.\""
providerIdentifier: "scripts"
color: "#C9A35C"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Scripts is the open door into Tempo. There is no integration to install on the other end and no payload contract to match a vendor's API: you decide what to send. Any of your own shell scripts, cron jobs, backup hooks, CI steps, or one-off webhooks can POST a JSON event to Tempo's ingest endpoint, and it shows up on the timeline.

This score is built in and **auto-installs on first launch** — it is the one source that's ready before you configure anything else.

It is an **umbrella** source. The parent `providerIdentifier` is `scripts`, and individual senders post under child identifiers like `scripts.backup` or `scripts.deploy`. Those children appear as siblings under a single **Scripts** row in the Source panel, so a dozen small scripts stay tidy under one parent instead of cluttering the list.

## Post an event

Add a token in Tempo **Settings → Ingestion** bound to `scripts` (or to a specific child like `scripts.backup`), copy it, then POST JSON with a bearer token:

```sh
curl -X POST http://your-mac.local:7776/ingest \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -d '{
    "title": "Nightly backup finished",
    "eventType": "alert",
    "providerIdentifier": "scripts.backup",
    "metadata": {
      "script_name": "nightly-backup",
      "host": "trantor.local",
      "label": "OK"
    },
    "actions": [
      { "label": "View log", "systemIcon": "doc.text",
        "trigger": { "openURL": "https://logs.local/backup" } }
    ]
  }'
```

The only required field is `title`. `eventType` is one of `event`, `task`, `reminder`, `alert`. Everything under `metadata` is yours to define and can be referenced from the score with `${metadata.xxx}`.

The bundled **`tempo-post`** helper wraps this same call — it reads the token from the Keychain and builds the JSON for you, so a script can emit an event in one line instead of a full `curl`. It ships in the app under `Resources/Utilities/shell/` and is also downloadable from the website utilities page.

## What you'll see

Events grouped under the **Scripts** parent, with children keyed first by `${metadata.script_name}` and then by `${providerIdentifier}` (grouping window: one day). So every firing of `nightly-backup` collapses together rather than flooding the feed.

Severity is **metadata-driven**. The score reads a `label` in `metadata` and maps it to a badge — by default everything is `info`, and these labels are recognized out of the box:

| `metadata.label`                       | Badge      |
|----------------------------------------|------------|
| `Critical`, `Critical issues`          | `error` — Critical |
| `Error`                                | `error` — Error |
| `Elevated errors`                      | `warning` — Elevated |
| `Low space`, `High`, `Warning`         | `warning` — Warning |
| `OK`                                   | `ok` — OK |
| anything else / omitted                | `info` — Info |

Three actions come attached to every event by default, resolved from your metadata at click time:

- **SSH to source host** — opens `ssh://${metadata.host}`
- **Copy host** — copies `${metadata.host}` to the clipboard
- **Copy title** — copies the event title

Add your own actions in the payload (as in the curl above), or open the score in Tempo's **Score Editor** to add severity rules, grouping, tags, and actions of your own. The harmless action primitives are open URL, open Terminal, and copy to clipboard.
