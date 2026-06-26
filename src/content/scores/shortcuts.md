---
title: "Apple Shortcuts"
description: "Turn any Apple Shortcut into a Tempo event with the native \"Send Event to Tempo\" action. No URL or webhook to wire up when it runs on the same Mac, just a token bound to com.shortcuts."
providerIdentifier: "com.shortcuts"
color: "#E0457B"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Apple Shortcuts is the most direct way to put your own events on the Tempo timeline. Tempo ships a native App Intent, **Send Event to Tempo**, that appears in the Shortcuts app alongside every other action. Any Shortcut you build (manual, scheduled, or automation-triggered) can call it to push an event straight into Tempo.

Because the action talks to Tempo's ingestion server on the loopback address, there is **no URL, webhook, or network endpoint to configure** when the Shortcut runs on the same Mac as Tempo: it posts to `127.0.0.1` on Tempo's port automatically. You do still need a **token bound to `com.shortcuts`**, created in Tempo **Settings → Ingestion**: the action's **Source** field selects the matching token, and if none exists it asks you to create one.

This score is built in and seeded on first launch. It classifies events Tempo receives from Shortcuts and attaches a default action. Nothing to install.

---

## Build a Shortcut

First, in Tempo **Settings → Ingestion**, create a token bound to `com.shortcuts`. The action needs it to post (you do this once). Then:

1. Open the **Shortcuts** app on your Mac.
2. Add the **Send Event to Tempo** action (search "Tempo" in the action list).
3. Fill in the fields the action exposes: at minimum a **title** and an event **type**. Add **metadata** keys to drive the score's rules (see below).
4. Attach the Shortcut to any trigger: a Focus mode turning on, a Mail rule, a folder automation, a scheduled time, or run it by hand.

That's the whole loop. The Shortcut runs, the action fires, and the event lands in Tempo's feed.

A set of ready-made example Shortcuts is published in the site utilities to use as starting points, covering common cases like Mail rules, Voice Memos, Focus modes, host checks, and location triggers. Import one, point its **Send Event to Tempo** action where you want, and adapt it.

### Metadata the score understands

The score reads a `category` key (and sometimes a `state` key) from the event metadata to assign a severity label, an indicator emoji, and a tag. If you set these in your Shortcut, events sort themselves automatically:

| `category` | `state`            | Label / indicator        |
|------------|--------------------|--------------------------|
| `sleep`    | `on`               | Bedtime 🌙                |
| `sleep`    | `off`              | Awake ☀️                  |
| `focus`    | `on` / `off`       | Focus on / Focus off 🔕   |
| `location` | `arrived`          | Arrived 📍                |
| `location` | `left`             | Left 🚶                   |
| `battery`  | `low`              | Battery low 🪫 (warning)   |
| `battery`  | (other)            | Battery 🔋                |
| `automation` |                  | tagged `automation` ⚙️    |

Anything that doesn't match a rule lands with the default **Shortcut** label at `info` severity, so events are never lost, just unclassified.

Two pairs also fold into a single grouped entry: `sleep` `on`/`off` open and close one sleep span, and `focus` `on`/`off` open and close a focus span keyed by `metadata.focus`. The closing event resolves the one it opened instead of stacking a second row.

## From iOS

The **Send Event to Tempo** action is a macOS App Intent: it talks to Tempo on `127.0.0.1`, so it only runs on the Mac itself. From an iPhone or iPad, post the event over the network instead, with a **Get Contents of URL** action. The same webhook Shortcut also runs on the Mac, so you can build and test it there first.

![A webhook Shortcut: Get Contents of URL set to POST to Tempo's ingest endpoint, with the token header and a JSON body](/scores/img/shortcuts-webhook.png)

1. Add a **Get Contents of URL** action.
2. **URL**: `http://<your-mac-lan-ip>:7776/ingest`. The phone must reach the Mac: same LAN, or a VPN such as Tailscale when you are away (see below).
3. **Method**: `POST`.
4. **Headers**: `X-Tempo-Token` set to a token bound to `com.shortcuts`, and `Content-Type` set to `application/json`.
5. **Request Body**: switch it to **JSON** and add the fields:

```json
{
  "title": "Your title here",
  "providerIdentifier": "com.shortcuts",
  "eventType": "alert",
  "severity": "info",
  "metadata": {
    "category": "location",
    "state": "arrived",
    "device": "iPhone"
  }
}
```

`severity` is read directly, because Tempo honors a sender-provided severity, so `info`, `warning`, `error`, or `critical` set the badge with no score rule needed. `category` and `state` drive the label and indicator from the table above. The `metadata` block is optional: a minimal body with `title`, `providerIdentifier`, `eventType`, and `severity` also works.

![A minimal "Leaving home" webhook Shortcut with a four-field JSON body](/scores/img/shortcuts-webhook-example.png)

This is the same ingestion contract any script uses (see [Scripts](/scores/scripts/)), so an iOS event is classified exactly like a Mac one. A geofence trigger that fires when you arrive at or leave home fits this pattern.

### Reaching the Mac when you are away

On the same Wi-Fi, the Mac's LAN IP is enough. To send from outside the home network, the phone needs a route back to the Mac. **Tailscale** is the simplest: install it on both the Mac and the phone, sign both into the same tailnet, and use the Mac's Tailscale address (the `100.x.y.z` IP) as the URL host. The traffic stays inside your tailnet, so no port is exposed to the public internet. A traditional VPN back to the home network works the same way.

## What you'll see

Each Shortcut run shows up as one event on the timeline, labeled and tagged per the table above, with its indicator emoji if the category matches. Battery-low events are raised to **warning**; everything else stays at **info**, which is the right posture for the personal, ambient signals Shortcuts tends to send.

Every event carries one action button:

| Action      | What it does            |
|-------------|-------------------------|
| **Copy title** | Copies the event title to the clipboard. |

Sleep and focus pairs collapse into a single span on the timeline rather than two separate rows, so a night or a focus session reads as one entry with a start and an end.
