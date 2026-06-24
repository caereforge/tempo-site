---
title: "Jellyfin"
description: "Jellyfin server events in Tempo's timeline, with one-click actions to open the web UI, drill into items, or jump to admin. Bulk imports collapse per series."
providerIdentifier: "org.jellyfin"
color: "#AA5CC3"
version: "1.1.0"
file: "/scores/jellyfin.tempo-score"
compatibility:
  - "Jellyfin 10.9+ + Webhook plugin"
pubDate: 2026-04-30
downloadable: true
---

Surface Jellyfin server events in Tempo's timeline with five default actions (open Jellyfin web, open item details, open admin dashboard, copy server URL, copy item ID).

Tested with Jellyfin 10.9 + the official **Webhook plugin**.

---

## Install

1. Download `jellyfin.tempo-score` from the button above.
2. Double-click it. Tempo opens a review sheet, then click **Install**. The score lands in `~/Library/Application Support/Tempo/Scores/`.
3. In Tempo **Settings → Ingestion**, add a token named `jellyfin` bound to `org.jellyfin`. Copy the token.
4. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest` (or `127.0.0.1` if Tempo is loopback-only).
5. Configure Jellyfin (below).

## Jellyfin side: install the Webhook plugin

1. Open the Jellyfin web UI as an administrator.
2. Dashboard → Plugins → **Catalog**.
3. Search for **Webhook**, click Install.
4. **Restart** the Jellyfin server (Dashboard → Restart Server).

## Jellyfin side: configure the webhook destination

1. Dashboard → Plugins → **Webhook**.
2. Click **Add Generic Destination**.
3. Fill in the form:
   - **Webhook Name**: `Tempo`
   - **Webhook URL**: `http://your-mac.local:7776/ingest` (replace with your Mac's hostname or LAN IP)
   - **Headers**, add two:

     | Key                | Value                       |
     | ------------------ | --------------------------- |
     | `X-Tempo-Token`    | _the token from step 3_     |
     | `Content-Type`     | `application/json`          |

   - **Notification Types**: tick the events you want surfaced. Recommended default set (quiet but useful):
     - `Authentication Failure`
     - `Application Error`
     - `Scheduled Task Failed`
     - `Playback Start` / `Playback Stop`

     **Leave `Item Added` OFF by default.** It fires once per file and floods on any library rescan or restructure: a bulk import of a series sends one event *per episode*. Only enable it if you keep the enriched template below (it carries `SeriesName`): the score then collapses a bulk add into **one stack per series** instead of N loose rows. See *Grouping* below.

     **Never tick `Playback Progress`.** It fires roughly once per second during playback and will flood the timeline.

   - **Template** (paste verbatim into the Template field):

     ```handlebars
     {
       "providerIdentifier": "org.jellyfin",
       "title": "{{#if Name}}{{Name}}{{else}}{{NotificationType}}{{/if}}",
       "eventType": "alert",
       "metadata": {
         "NotificationType": "{{NotificationType}}",
         "ItemId":        "{{ItemId}}",
         "ItemType":      "{{ItemType}}",
         "Name":          "{{Name}}",
         "SeriesName":    "{{SeriesName}}",
         "SeasonNumber":  "{{SeasonNumber00}}",
         "EpisodeNumber": "{{EpisodeNumber00}}",
         "Year":          "{{Year}}",
         "Username":      "{{NotificationUsername}}",
         "ServerUrl":     "{{ServerUrl}}"
       }
     }
     ```

     > The plugin HTML-escapes string values (`ì` → `&#236;`, `"` → `&quot;`), so titles with accents or quotes carry entities. That's harmless, JSON stays valid; a title-cleanup pass is a separate polish item. `startDate` is omitted on purpose: Tempo stamps the event at ingestion time.

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

## Grouping

The score ships with `groupingRules` so two common floods read as single entries:

- **Bulk imports → one stack per series.** Every `ItemAdded` for an `Episode` joins a `repeats` stack keyed on `added:${SeriesName}` (6h window). Importing 100 episodes of a show collapses to one `▤N` stack instead of 100 rows, which is why `Item Added` is only worth enabling with the enriched template that carries `SeriesName`.
- **Playback → start pairs with stop.** `PlaybackStart` `opens` and `PlaybackStop` `closes` a stack keyed on `play:${ItemId}:${Username}`, so a watch session is one entry that resolves when it ends.

Movies, auth failures and plugin events match no grouping rule, so they render standalone, which is what you want for one-off events.

## Required `metadata` fields

- **`NotificationType`**: drives severity.
- **`ServerUrl`**: powers most actions (open web / item / admin).
- **`ItemId`**: the "Open item" / "Copy item ID" actions and the playback grouping key.
- **`SeriesName`**: the episode grouping key (empty for movies/audio → they don't join the per-series stack).
- **`Username`**: part of the playback grouping key.

## Sample event payload

```json
{
  "providerIdentifier": "org.jellyfin",
  "title": "The Office",
  "eventType": "alert",
  "metadata": {
    "NotificationType": "PlaybackStart",
    "ItemId":        "abc123def456",
    "ItemType":      "Episode",
    "Name":          "The Office",
    "SeriesName":    "The Office",
    "SeasonNumber":  "03",
    "EpisodeNumber": "12",
    "Year":          "2005",
    "Username":      "alice",
    "ServerUrl":     "http://media.lan:8096"
  }
}
```

## Notes

- This score lives in the reviewed catalog and uses only `openURL` and `copyToClipboard` actions. For Terminal-based actions (SSH, log tail, service restart), use a **local drop-in** score: those require explicit trust and can't ship in the catalog.
- `ServerUrl` should be reachable from your Mac (LAN URL is fine, or a Tailscale/VPN address). Tempo doesn't reach it; it builds the link for your browser to follow.
