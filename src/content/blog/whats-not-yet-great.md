---
title: "What's not yet great"
description: "Honest notes on Tempo's rough edges in V1. The Score Editor lags on large scores; action buttons are still authored as JSON; calendars are read-only. What's planned for V1.x and V2."
pubDate: 2026-05-15
tags: ["transparency", "release"]
draft: false
---

*📅 May 15, 2026 — Tempo 1.0.3*

Let's be honest: an app, like fruit, needs time to ripen properly. Tempo is good enough for the moment, at least for what I've been able to test myself. But some parts still need work.

V1 ships what's solid and what I use every day. It also ships with some rough edges — small UX friction here, an occasional performance hitch there. Most of these are visible and fixable in the V1.x release line. Some are bigger and warrant V2.

I'd rather flag the most visible ones upfront than let them surface as surprises.

## The Score Editor lags on large scores

One thing I'm not yet happy with is the Score Editor: it lags noticeably when you switch between large scores (the UniFi Network bundled one, with 40+ rules, is the worst offender). I shipped two rounds of speedups in 0.2.0 and 0.2.3 — caching, memoization, equatable subviews — that roughly halved the perceived latency. The rest is structural: the editor body needs to be split into a view-model and per-section observed subviews so SwiftUI doesn't re-render the whole thing on every state nudge. That refactor is planned for V1.2. I'd rather ship V1 with this honestly noted than hold the launch for a refactor that's worth doing carefully.

## Action buttons stay in JSON for now

The Score Editor handles colors, severity rules, grouping, and display names — but not action buttons. Adding or editing a button means editing the score's JSON file directly. It works (a walkthrough lives on the blog [here](/blog/adding-a-custom-action-button/)), and the file watcher reloads changes live with no relaunch. But it's clearly not the right surface for users who don't live in a text editor. A visual action builder is V2 scope; in V1.x we ship the file-watcher and the documentation around the gap.

## Calendars and reminders are read-only

Tempo aggregates events from Apple Calendar, Reminders, and (in V1.x) Fastmail CalDAV, but it doesn't write back. Dismissing an event in Tempo only removes it from your timeline view — the source-side event is untouched. Creating new calendar entries from Tempo is V3+ scope, because it deserves a thought-out UX and conflict-resolution story I don't want to rush. For now Tempo is the read surface; your calendar app stays the write surface.
