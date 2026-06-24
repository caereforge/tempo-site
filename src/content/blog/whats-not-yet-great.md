---
title: "What's not yet great"
description: "Honest notes on Tempo's rough edges, kept updated. The Score Editor still lags on very large scores; in-editor action editing and reminder write-back landed in 1.1; calendar entries stay read-only."
pubDate: 2026-05-15
tags: ["transparency", "release"]
draft: false
---

*📅 May 15, 2026 · Updated for Tempo 1.1 · Leo from Caereforge*

Let's be honest: an app, like fruit, needs time to ripen properly. Tempo is good enough for the moment, at least for what I've been able to test myself. But some parts still need work.

V1 ships what's solid and what I use every day. It also ships with some rough edges: small UX friction here, an occasional performance hitch there. I'd rather flag the most visible ones upfront than let them surface as surprises.

I wrote this post at launch. I've kept it updated since: a couple of the things below are already smoothed in 1.1, and I've marked them as fixed rather than quietly deleting them, because the honest record matters more than looking finished.

## The Score Editor lags on large scores

One thing I'm not yet happy with is the Score Editor: it lags noticeably when you switch between large scores (the UniFi Network bundled one, with 40+ rules, is the worst offender). I shipped two rounds of speedups in 0.2.0 and 0.2.3 (caching, memoization, equatable subviews) that roughly halved the perceived latency. The rest is structural: the editor body needs to be split into a view-model and per-section observed subviews so SwiftUI doesn't re-render the whole thing on every state nudge. That refactor is planned for V1.2. I'd rather ship V1 with this honestly noted than hold the launch for a refactor that's worth doing carefully.

## Action buttons: now in the Score Editor *(fixed in 1.1)*

At launch, the Score Editor handled colors, severity rules, grouping, and display names, but not action buttons; adding one meant editing the score's JSON directly. **1.1 closes that gap**: the editor now has an Actions tab, so you can author and edit buttons without opening a text editor. The JSON is still there if you prefer it (and the file watcher still reloads changes live), but it's no longer the only way. The fuller visual action builder (drag-and-drop, previews) is still V2 scope.

## Calendars are read-only: reminders aren't, anymore

Tempo aggregates events from Apple Calendar, Reminders, and (experimentally) Fastmail CalDAV. **Calendar events are read-only**: dismissing one in Tempo only removes it from your timeline view, and creating new calendar entries from Tempo is later-version scope: it deserves a thought-out UX and conflict-resolution story I don't want to rush. **Reminders are the exception**: as of 1.1 you can check a reminder off (or back on) straight from Tempo's action panel, and it writes through to Apple Reminders. So the calendar stays a read surface; reminders are the one place Tempo writes back.

---

Leo from [Caereforge](https://caereforge.com)
