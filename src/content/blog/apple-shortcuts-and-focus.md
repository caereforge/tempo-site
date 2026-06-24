---
title: "Your iPhone, on the timeline: Apple Shortcuts & Focus"
description: "Tempo can now accept events triggered by any shortcut-capable Apple device. A focus change, arriving/leaving home (or any place), any action you built yourself. Here's the new Shortcuts source and how to wire it up."
pubDate: 2026-06-23
tags: ["how-to", "scores", "shortcuts", "automation"]
draft: true
---

*📅 June 2026 · Tempo 1.1 · Leo from Caereforge*

Tempo's rule of entry has always been simple: if a source can POST, Tempo can show it. Apple Shortcuts can POST. So as of 1.1, the automations running on your iPhone, iPad, and Mac can land on the same timeline as your servers and your calendar.

Unlike most sources, the sender is already on the device, there's nothing new to install on the other end; you wire up a Shortcut and point it at Tempo.

> **One requirement: reachability.** The device has to be able to reach the Mac running Tempo. That means it's on the same LAN, or on a VPN/overlay like Tailscale **with it enabled**. Off the network the shortcut's POST won't arrive: Tempo's ingestion port is on your LAN, never exposed to the internet.

## What you can send

Anything a Shortcut can trigger:

- **A Focus turning on or off**: Do Not Disturb, Work, Personal.
- **Sleep**, bedtime and wake-up. This is the one I built first, and it's become the one I use most: my "Goodnight" shortcut sets the Sleep focus and tells Tempo, and waking tells it again. The whole night shows up as a single row on the timeline.
- **Arriving or leaving** a place, a geofence automation.
- **Battery** hitting a level.
- **A tap you built**: any Shortcut you run by hand.

## The payload

Send a `title` and you get a clean, plain event. Add a few optional fields and the bundled **Shortcuts** score dresses the event: an icon, a clean label, a tag, and session grouping. The shape matters, so here it is exactly.

### Top-level fields

These sit at the top level of the JSON body, next to `title`:

| Field | Required | Value |
|---|---|---|
| `title` | yes | the headline text, e.g. `iPhone 13 Pro - Sleep on` |
| `providerIdentifier` | yes | `com.shortcuts` |
| `eventType` | yes | `alert` |
| `severity` | no | `info` (default) · `ok` · `warning` · `error` · `critical` |

### `metadata` fields (nested)

These go **inside a `metadata` object** (the score reads them from there, not from the top level):

| Field | Value | What it does |
|---|---|---|
| `category` | `sleep` · `focus` · `location` · `battery` · `automation` | sets the row icon (🌙 ☀️ 🔕 📍 🔋 ⚙️) and a tag |
| `state` | `on` · `off` · `arrived` · `left` · `low` | refines the icon and label; pairs `sleep`/`focus` on→off into one session |
| `focus` | the Focus name | groups a Focus period |
| `device` | e.g. `iPhone 13 Pro` | shown for context |
| *(anything else)* | your own value | preserved and shown on the event detail |

The complete, correct payload looks like this. Note `severity` **outside** `metadata`, and `category`/`state`/`device` **inside** it:

```json
{
  "title": "iPhone 13 Pro - Sleep on",
  "providerIdentifier": "com.shortcuts",
  "eventType": "alert",
  "severity": "info",
  "metadata": {
    "category": "sleep",
    "state": "on",
    "device": "iPhone 13 Pro"
  }
}
```

With `category: sleep` and `state: on` / `off`, the score pairs bedtime and wake into one session: a single row per night instead of two loose events. Same idea for a Focus period.

> **Two things that fail silently if you get them wrong:**
> 1. **`metadata` must be a nested object.** If you put `category`/`state` as top-level fields (a common first mistake), they're dropped and nothing matches: the event still arrives, just undressed.
> 2. **`severity` is top-level, not in `metadata`.** And don't confuse the metadata `state` (`on`/`off`, the Shortcuts convention) with the top-level `state` (`firing`/`resolved`, the event lifecycle; leave that out, Tempo handles it).
>
> Values are **case-insensitive**, so `Sleep` and `sleep` both match. iOS Shortcuts tends to auto-capitalize, and that's fine.

Install the score with one click from **Manage Sources**.

## Building the Shortcut on your phone

Install the bundled Shortcuts score first (Manage Sources), then create a token in **Settings → Ingestion** bound to `com.shortcuts`. Since this rides your LAN, pin its allowlist to the device's address. The long token is easiest to move to the phone as a **QR code** you scan with the Camera app.

Then, on the device:

1. **Shortcuts → Automation → New (+)**, and pick a trigger: Focus, Sleep, Arrive/Leave, Battery Level, or a tappable shortcut you run by hand.
2. Add a **Get Contents of URL** action.
   - **URL**: `http://<your-mac-ip>:7776/ingest`
   - **Method**: `POST`
   - **Headers** (tap to expand): `X-Tempo-Token` = your token, and `Content-Type` = `application/json`
   - **Request Body**: switch to **JSON**, then add the fields:
     - `title`, `providerIdentifier`, `eventType`, `severity` as **Text** values;
     - add a field named **`metadata`** and set its *type* to **Dictionary**, then, inside that dictionary, add `category`, `state`, `device` (and `focus` if you use it) as Text. This nesting is the step people miss.
3. Turn off **Ask Before Running** so it fires silently. If it still prompts for confirmation (or flashes the response back), add a **Nothing** action as the very last step. In my case that's what finally made it run without asking every time.

## A couple of iOS quirks worth knowing

- iOS doesn't expose the Focus name to a Focus automation as a variable, so you make **one automation per Focus** and hard-code the title and `metadata.focus` in each.
- **Sleep** lives under its own trigger, tied to the Health sleep schedule, separate from the Focus list. If you set Sleep by hand (like I do), that trigger won't fire, so the move is to flip it around: a tappable **"Goodnight"** shortcut that sets the focus *and* POSTs to Tempo, with a "Good morning" counterpart at wake.

That's it. The phone is just another sender now, and the timeline finally shows the part of the day that doesn't come from a server.

## Further reading

The fields above are what the Shortcuts source reads. The `/ingest` endpoint itself accepts the full event payload (custom `color`, `startDate`, action buttons, and more): the complete contract is in **User Guide §10, [Sources reference](/docs/10-sources-reference)**.

---

Leo from [Caereforge](https://caereforge.com)
