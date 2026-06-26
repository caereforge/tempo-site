---
title: "Jellyseerr"
description: "Jellyseerr media requests and issue reports in your Tempo timeline, grouped by title, with severity that tracks each request from pending approval through available."
providerIdentifier: "com.jellyseerr"
color: "#6366F1"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

[Jellyseerr](https://github.com/Fallenbagel/jellyseerr) is a media request manager for Jellyfin, Emby, and Plex: users request movies and shows, and the requests flow through approval, download, and availability — with an issue tracker for things that go wrong after the fact.

This score surfaces those notifications on your Tempo timeline. It reads Jellyseerr's webhook `notification_type` and assigns a severity per state, groups every event by its media title so a single request stays one line as it progresses, and attaches a one-click action to open Jellyseerr.

Jellyseerr has a **native Webhook notification agent**, so no helper or adapter runs on either side. You configure its JSON payload template to send the fields the score expects and POST directly to Tempo's ingest endpoint with a bearer token.

---

## Install

The score is built in. Tempo seeds it on first launch, so there is nothing to download.

1. In Tempo **Settings → Ingestion**, add a token bound to `com.jellyseerr`. Copy the token.
2. Note your Tempo endpoint: `http://<your-mac-host>:7776/ingest`.
3. Configure Jellyseerr (see below).

## Jellyseerr side

In Jellyseerr, go to **Settings → Notifications → Webhook** and enable the agent.

1. **Webhook URL**: `http://<your-mac-host>:7776/ingest`
2. **Authorization Header**: `Bearer YOUR_TOKEN_HERE` (the token you bound to `com.jellyseerr`).
3. **JSON Payload**: replace the default template with the one below.

```json
{
  "title": "{{subject}}",
  "eventType": "alert",
  "providerIdentifier": "com.jellyseerr",
  "metadata": {
    "event": "{{notification_type}}",
    "subject": "{{subject}}",
    "senderAddress": "<your-jellyseerr-host>"
  }
}
```

The score reads three metadata keys:

- **`event`** — Jellyseerr's `{{notification_type}}` (e.g. `MEDIA_PENDING`, `MEDIA_AVAILABLE`, `ISSUE_CREATED`). This drives the severity label.
- **`subject`** — the media title; the score groups events by this value, so one request stays one line as it moves through its states.
- **`senderAddress`** — the host where Jellyseerr runs. The **Open Jellyseerr** action builds `http://<senderAddress>:5055` from it, so set it to your Jellyseerr machine's address.

Save, then use Jellyseerr's **Test** button to send a sample event.

## What you'll see

Each notification lands as one event, grouped by media title, with a severity badge derived from its `notification_type`:

| State | Severity | Label |
|-------|----------|-------|
| `MEDIA_FAILED` | error | Failed |
| `MEDIA_PENDING` | warning | Pending approval |
| `ISSUE_CREATED` | warning | Issue opened |
| `ISSUE_REOPENED` | warning | Issue opened |
| `MEDIA_APPROVED` | info | Approved |
| `MEDIA_AUTO_APPROVED` | info | Approved |
| `MEDIA_DECLINED` | info | Declined |
| `MEDIA_AVAILABLE` | ok | Available |
| `ISSUE_RESOLVED` | ok | Resolved |

Anything else falls through to the default `info` severity.

Every event carries one action:

- **Open Jellyseerr** — opens `http://<senderAddress>:5055` in your browser.
