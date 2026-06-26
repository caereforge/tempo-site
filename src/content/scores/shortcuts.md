---
title: "Apple Shortcuts"
description: "Turn any Apple Shortcut into a Tempo event with the native \"Send Event to Tempo\" action. No token and no endpoint when the Shortcut runs on the same Mac."
providerIdentifier: "com.shortcuts"
color: "#E0457B"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Apple Shortcuts is the most direct way to put your own events on the Tempo timeline. Tempo ships a native App Intent, **Send Event to Tempo**, that appears in the Shortcuts app alongside every other action. Any Shortcut you build — manual, scheduled, or automation-triggered — can call it to push an event straight into Tempo.

Because this is a local App Intent, there is **no ingestion token, no webhook, and no network endpoint** to configure when the Shortcut runs on the same Mac as Tempo. The same Shortcut also runs on iOS through your shared iCloud Shortcuts; from a phone it reaches your Mac the way any cross-device Shortcut does.

This score is built in and seeded on first launch. It classifies events Tempo receives from Shortcuts and attaches a default action — nothing to install.

---

## Build a Shortcut

1. Open the **Shortcuts** app on your Mac.
2. Add the **Send Event to Tempo** action (search "Tempo" in the action list).
3. Fill in the fields the action exposes — at minimum a **title** and an event **type**. Add **metadata** keys to drive the score's rules (see below).
4. Attach the Shortcut to any trigger: a Focus mode turning on, a Mail rule, a folder automation, a scheduled time, or run it by hand.

That's the whole loop. The Shortcut runs, the action fires, and the event lands in Tempo's feed.

A set of ready-made example Shortcuts is published in the site utilities to use as starting points — covering common cases like Mail rules, Voice Memos, Focus modes, host checks, and location triggers. Import one, point its **Send Event to Tempo** action where you want, and adapt it.

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

Anything that doesn't match a rule lands with the default **Shortcut** label at `info` severity — so events are never lost, just unclassified.

Two pairs also fold into a single grouped entry: `sleep` `on`/`off` open and close one sleep span, and `focus` `on`/`off` open and close a focus span keyed by `metadata.focus`. The closing event resolves the one it opened instead of stacking a second row.

## What you'll see

Each Shortcut run shows up as one event on the timeline, labeled and tagged per the table above, with its indicator emoji if the category matches. Battery-low events are raised to **warning**; everything else stays at **info**, which is the right posture for the personal, ambient signals Shortcuts tends to send.

Every event carries one action button:

| Action      | What it does            |
|-------------|-------------------------|
| **Copy title** | Copies the event title to the clipboard. |

Sleep and focus pairs collapse into a single span on the timeline rather than two separate rows, so a night or a focus session reads as one entry with a start and an end.
