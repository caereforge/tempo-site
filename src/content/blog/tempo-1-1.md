---
title: "Tempo 1.1"
description: "The biggest update since launch: Apple Shortcuts & Focus, optional encrypted ingestion, a dozen new bundled sources, a faster timeline, and a lot of polish."
pubDate: 2026-06-23
tags: ["release", "announcement"]
draft: true
---

*📅 June 2026 — Tempo 1.1 · Leo from Caereforge*

Tempo 1.1 is here, and it's the biggest update since launch. The headline is more ways to get events *in* and a faster, more capable timeline to hold them. Here are the parts worth calling out; the [full changelog](/changelog/) has the rest.

## Your phone is a source now

The new **Apple Shortcuts & Focus** integration lets anything a Shortcut can trigger land on your timeline — a Focus turning on, bedtime, arriving home, a tap you built yourself. It's the one source almost everyone can use without a homelab. There's a [whole post on it](/blog/apple-shortcuts-and-focus/), and a bundled Shortcuts source that turns those events into readable rows (it even folds a night's sleep into a single entry).

## Encrypted ingestion, when you want it

Tempo's ingestion port speaks plain HTTP by default — the right call for a LAN you control. 1.1 adds an **opt-in TLS listener** for the senders that warrant it: turn it on in Settings, and mark individual tokens *Require TLS* so they're refused on the cleartext port. It's understated on purpose — secure by option, honest by default. The [security page](/security/#tls) lays out the reasoning.

## A much bigger catalog

The bundled catalog grew to **twenty sources and counting**. New this release: Beszel, Jellyfin, Jellyseerr, Sonarr, Radarr, Prowlarr, Vaultwarden, Pi-hole, Synology, Todoist, the Shortcuts source, and an experimental Fastmail calendar. Install any of them with one click from Manage Sources.

## A faster, tidier timeline

- **Faster and lighter** — the timeline stays smooth and memory stays low even with tens of thousands of events.
- **Timeline filter** — flip between everything and just what needs your attention.
- **Activity heatmap** — a source's recent activity at a glance, in its panel.
- **Remove a source** — Manage Sources now removes a source (keeping or clearing its history), not just installs one.
- **Action buttons in the editor** — the Score Editor gained an Actions tab, so you no longer need to touch JSON to add a button.
- **Check off a reminder** — Apple Reminders can now be completed straight from Tempo's action panel; it writes through to the source.

Plus a sound option for new events, tidier source grouping, search that jumps you straight to an event, and a long list of fixes.

## How to get it

If you're already running Tempo, it updates itself through Sparkle — you may already have it. Otherwise, grab it from the [downloads page](/downloads/). v1.x is and stays freeware.

As always: the payload is input, your scores and clicks are policy, and Tempo never acts on its own. 1.1 just gives you more to point it at.

---

Leo from [Caereforge](https://caereforge.com)
