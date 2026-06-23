---
title: "Your iPhone, on the timeline: Apple Shortcuts & Focus"
description: "Tempo can now hear anything Apple Shortcuts can send — a Focus turning on, bedtime, arriving home, a tap you built yourself. Here's the new Shortcuts source and how to wire it up."
pubDate: 2026-06-23
tags: ["how-to", "scores", "shortcuts", "automation"]
draft: true
---

*📅 June 2026 — Tempo 1.1 · Leo from Caereforge*

Tempo's rule of entry has always been simple: if a source can POST, Tempo can show it. Apple Shortcuts can POST. So as of 1.1, the automations running on your iPhone, iPad, and Mac can land on the same timeline as your servers and your calendar.

This is the most broadly useful source I've added, because almost everyone already has the sender: the Shortcuts app. You don't need a homelab to get value from it — you need a phone and one automation.

## What you can send

Anything a Shortcut can trigger:

- **A Focus turning on or off** — Do Not Disturb, Work, Personal.
- **Sleep** — bedtime and wake-up. This is the one I built first, and it's become my favourite: my "Goodnight" shortcut sets the Sleep focus and tells Tempo, and waking tells it again. The whole night shows up as a single row on the timeline.
- **Arriving or leaving** a place — a geofence automation.
- **Battery** hitting a level.
- **A tap you built** — any Shortcut you run by hand.

## The Shortcuts source dresses it for you

Send just a title and you get a clean, plain event. But the bundled **Shortcuts** score understands a small set of optional fields and uses them to make the event readable:

| Field | What it does |
|---|---|
| `category` | `sleep` · `focus` · `location` · `battery` · `automation` — picks the row icon (🌙 ☀️ 🔕 📍 🔋) and a tag |
| `state` | `on` · `off` · `arrived` · `left` · `low` — refines the icon and the label |
| `focus` | the Focus name, for grouping a Focus period |
| `device` | for context |

With `category: sleep` and `state: on` / `off`, the score pairs bedtime and wake into one session — a single row per night instead of two loose events. Same idea for a Focus period.

Install the score with one click from **Manage Sources**.

## Wiring up a Shortcut

The pattern is the same for every automation:

1. **Shortcuts → Automation → +**, and pick a trigger (Focus, Sleep, Arrive, Battery Level…).
2. Add a **Get Contents of URL** action:
   - URL: `http://<your-mac-ip>:7776/ingest`
   - Method: **POST**
   - Headers: `X-Tempo-Token` = your token, `Content-Type` = `application/json`
   - Request Body: **JSON**, with a `title`, `providerIdentifier: com.shortcuts`, `eventType: alert`, and a `metadata` dictionary holding the fields above.
3. Turn off **Ask Before Running** so it fires silently.

A sleep example looks like this:

```json
{
  "title": "Sleep focus enabled",
  "providerIdentifier": "com.shortcuts",
  "eventType": "alert",
  "metadata": { "category": "sleep", "state": "on", "device": "iPhone" }
}
```

Create the token in **Settings → Ingestion**, bound to `com.shortcuts`, and — since this is on your LAN — pin its allowlist to the device's address. Getting the long token onto the phone is easiest as a QR code you scan with the Camera app.

## A couple of iOS quirks worth knowing

- iOS doesn't expose the Focus name to a Focus automation as a variable, so you make **one automation per Focus** and hard-code the title and `metadata.focus` in each.
- **Sleep** lives under its own trigger, tied to the Health sleep schedule — it's separate from the Focus list. If you set Sleep by hand (like I do), that trigger won't fire, so the move is to flip it around: a tappable **"Goodnight"** shortcut that sets the focus *and* POSTs to Tempo, with a "Good morning" counterpart at wake.

That's it. The phone is just another sender now — and the timeline finally shows the part of the day that doesn't come from a server.

---

Leo from [Caereforge](https://caereforge.com)
