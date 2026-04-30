---
title: "Jellyfin"
description: "Jellyfin server events in Tempo's timeline with one-click actions to open the web UI, drill into items, or jump to admin."
providerIdentifier: "org.jellyfin"
color: "#AA5CC3"
version: "1.0.0"
file: "/scores/jellyfin.tempo-score"
compatibility:
  - "Jellyfin 10.9 + Webhook plugin"
pubDate: 2026-04-30
downloadable: true
---

Surface Jellyfin server events in Tempo's timeline with five default actions (open Jellyfin web, open item details, open admin dashboard, copy server URL, copy item ID).

Tested with Jellyfin 10.9 + the official **Webhook plugin**.

---

## Install

1. Download `jellyfin.tempo-score` from the button above.
2. Double-click it. Tempo opens a review sheet — click **Install**. The score lands in `~/Library/Application Support/Tempo/Scores/`.
3. In Tempo **Settings → Ingestion**, add a token named `jellyfin` bound to `org.jellyfin`. Copy the token.
4. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest` (or `127.0.0.1` if Tempo is loopback-only).
5. Configure Jellyfin (below).

## Jellyfin side — install the Webhook plugin

1. Open the Jellyfin web UI as an administrator.
2. Dashboard → Plugins → **Catalog**.
3. Search for **Webhook**, click Install.
4. **Restart** the Jellyfin server (Dashboard → Restart Server).

## Jellyfin side — configure the webhook destination

1. Dashboard → Plugins → **Webhook**.
2. Click **Add Generic Destination**.
3. Fill in the form:
   - **Webhook Name**: `Tempo`
   - **Webhook URL**: `http://your-mac.local:7776/ingest` (replace with your Mac's hostname or LAN IP)
   - **Headers** — add two:

     | Key                | Value                       |
     | ------------------ | --------------------------- |
     | `X-Tempo-Token`    | _the token from step 3_     |
     | `Content-Type`     | `application/json`          |

   - **Notification Types** — tick the events you want surfaced. Suggested set:
     - `Authentication Failure`
     - `Application Error`
     - `Plugin Installation Failed`
     - `Plugin Update Failed`
     - `Scheduled Task Failed`
     - `Item Added`
     - `Playback Start` / `Playback Stop` _(optional — high volume)_

   - **Template** (paste verbatim into the Template field):

     ```handlebars
     {
       "providerIdentifier": "org.jellyfin",
       "title": "{{NotificationType}}{{#if ItemName}} — {{ItemName}}{{/if}}",
       "startDate": "{{Timestamp}}",
       "eventType": "alert",
       "metadata": {
         "NotificationType": "{{NotificationType}}",
         "ServerName":       "{{ServerName}}",
         "ServerUrl":        "{{ServerUrl}}",
         "ServerVersion":    "{{ServerVersion}}",
         "Username":         "{{NotificationUsername}}",
         "ItemName":         "{{ItemName}}",
         "ItemId":           "{{ItemId}}",
         "ItemType":         "{{ItemType}}",
         "DeviceName":       "{{DeviceName}}",
         "ClientName":       "{{ClientName}}"
       }
     }
     ```

4. Click **Save**.

## Verify

Trigger any of the configured events in Jellyfin (e.g. add a movie, fail a login). The event should appear in Tempo's timeline within a couple of seconds, painted in Jellyfin purple, with the five default actions in the right panel.

## Severity rules

| Notification type           | Severity   | Badge       |
| --------------------------- | ---------- | ----------- |
| `AuthenticationFailure`     | `error`    | Auth fail   |
| `ApplicationError`          | `error`    | Error       |
| `*Failed` (any)             | `error`    | Failed      |
| `ScheduledTaskFailed`       | `warning`  | Task failed |
| `PluginInstalled`           | `info`     | Plugin      |
| `PluginUninstalled`         | `info`     | Plugin      |
| `PluginUpdated`             | `info`     | Plugin      |
| `ItemAdded`                 | `info`     | New item    |
| `PlaybackStart`             | `info`     | Started     |
| `PlaybackStop`              | `info`     | Stopped     |
| _(default)_                 | `info`     | Info        |

## Required `metadata` fields

Most actions need `ServerUrl`. The "Open item" action and "Copy item ID" need `ItemId` (only set on item-related notifications — clicking them on a non-item event opens a malformed URL, harmless).

## Sample event payload

```json
{
  "providerIdentifier": "org.jellyfin",
  "title": "PlaybackStart — The Office S03E12",
  "startDate": "2026-04-29T22:14:00Z",
  "eventType": "alert",
  "metadata": {
    "NotificationType": "PlaybackStart",
    "ServerName":       "media-server",
    "ServerUrl":        "http://media.lan:8096",
    "ServerVersion":    "10.9.6",
    "Username":         "alice",
    "ItemName":         "The Office S03E12",
    "ItemId":           "abc123def456",
    "ItemType":         "Episode",
    "DeviceName":       "Apple TV",
    "ClientName":       "Jellyfin Apple TV"
  }
}
```

## Notes

- This score lives in the reviewed catalog and uses only `openURL` and `copyToClipboard` actions. For Terminal-based actions (SSH, log tail, service restart), use a **local drop-in** score — those require explicit trust and can't ship in the catalog.
- `ServerUrl` should be reachable from your Mac (LAN URL is fine, or a Tailscale/VPN address). Tempo doesn't care — it just builds the link for your browser to follow.
