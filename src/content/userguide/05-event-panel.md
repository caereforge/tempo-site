---
title: "Event panel"
description: "The event panel, the center column, is where the timeline lives."
chapter: 5
order: 5
draft: false
pubDate: 2026-05-05
---
# 5 — Event panel

The event panel, the center column, is where the timeline lives. Most of the time you spend in Tempo is spent looking at this panel. This chapter walks through every piece of it: the card layout, what the meta-text means, how acknowledged events render, how stacks expand, the activity heatmap above the feed, and the day separators that break the scroll into recognizable chunks.

---

## 5.1 — The event card

Every event shows as a card. Cards have a deliberately fixed slot layout, which means once your eyes have learned the structure, scanning a long feed is fast: your gaze always lands in the same place for the same kind of information.

### Card anatomy

```
[stripe][icon] Title ......... [headline] [📎] [Acked] [SEVERITY] | [stack 60pt]
                Subtitle / meta-text
```

From left to right:

- **Colored stripe**: a thin vertical bar at the card's left edge, filled with the source color (or the severity color, depending on your **Settings → Interface → Stripe meaning** preference)
- **Provider icon**: a small icon identifying the source. Bundled providers have curated icons; custom sources get a generic fallback. If the title starts with an emoji and the source is unknown, the icon is suppressed to avoid double-decoration
- **Title**: the human-readable event name, single-line truncated. For completed reminders, the title is struck through and dimmed
- **Right-hand fixed slots**, in order from the title outward:
  - **Headline metric**: the score's headline value (file size, duration, error count) in monospaced semibold
  - **Attachment icons**: small icons indicating linked files, notes, or external resources
  - **Acked pill**: outlined "Acked" pill if the event has been acknowledged
  - **Severity**: the universal-vocabulary label (UPPERCASE: `INFO`, `OK`, `WARNING`, `ERROR`, `CRITICAL`), always at the rightmost edge so your eye finds it without searching
- **Stack count slot**: fixed-width 60pt area on the very right where the stack count pill renders. Single events leave it empty; stacked events fill it

Below the title row:

- **Subtitle / meta-text**: a single line of tertiary-color text. By default this is the timestamp; scores can replace it with custom-rendered content (e.g., `host.local · +147KB · 1.2s`)

The whole card has a soft background (subtle when unselected, slightly brighter when selected), a left-edge gradient tint in the source color for visual identity at a glance, and a hairline border that brightens on selection.

### Why the slot order matters

The right-edge slot layout was deliberately chosen so:

- **Severity** lands at the rightmost edge: the most important "how urgent is this" signal is always in the same spot
- **Headline metric** sits adjacent to the title, pairing "what" (title) with "how much" (metric) into a single semantic unit
- **Acked pill** uses an outlined style, visually distinct from the filled severity pill so you can tell at a glance whether the event has been handled

If you find yourself staring at a card unsure where to look, the answer is almost always the rightmost edge. Severity. Then sweep left for context.

### Card body for non-alert events

Calendar entries, reminders, and tasks render as **compact rows** rather than full cards. They have:

- The provider icon
- The title (with strikethrough for completed reminders)
- A small set of metadata on the right (start time, due date, calendar/list name)
- No stripe, no headline, no severity badge: these are agenda items, not alerts

The compact rendering keeps your calendar from drowning out actionable monitoring events when both share the feed. If you have so much calendar activity that it's still drowning out monitoring, hide the calendar via **Settings → Agenda** or hide the agenda section entirely via the menubar **View → Show personal agenda** toggle.

---

## 5.2 — Severity meta-text

The severity badge at the rightmost edge of every alert card uses a shared visual vocabulary across all sources. The same color and label conventions apply whether the event is a Kopia backup result, a UniFi alarm, or a custom webhook from a script you wrote yesterday.

| Severity | Label | Color | Meaning |
|---|---|---|---|
| `info` | INFO | blue | Informational only, no action needed |
| `ok` | OK | green | Positive outcome (a backup succeeded, a probe is up) |
| `warning` | WARNING | yellow | Something to look at, not urgent |
| `error` | ERROR | red | Something failed, attention needed |
| `critical` | CRITICAL | red | Urgent, immediate action recommended |

### Custom labels

The score for a source can replace the default label with a custom one: `OK` becomes `BACKUP OK`, `ERROR` becomes `BACKUP FAILED`, `WARNING` becomes `CONNECTION FAILED`. The color stays driven by severity (so `BACKUP FAILED` is still red and reads as an error at a glance), but the *label* communicates context.

Two slots can render adjacent: the custom label first, the universal severity label second. This way you get both the score-specific phrasing and the universal urgency vocabulary, without one obscuring the other.

A simplified UniFi card might read:

```
Title ............................ STA_AUTH_FAILURE  WARNING
```

The custom label tells you *what kind of warning*; the universal label tells you it's a warning.

### Severity color vs. card background

The severity color appears in the badge pill itself: bright background, contrasting text, capsule shape. The card background stays mostly neutral; only the left-edge stripe and the gradient tint pick up the source color.

This separation matters: in a feed with many sources, the *card background* tells you *which source* an event came from (via the source color), while the *severity pill* tells you *how urgent it is*. Stacking these two visual channels into one (e.g., red card backgrounds for red severity) would conflate "which" and "how": a homelab with five red sources would look uniformly alarming whether or not anything was actually wrong.

> 💡 **Note**: customize the heatmap and badge colors in **Settings → Interface**. The severity-pill colors track the heatmap colors by default, so changing one updates the other for visual consistency.

---

## 5.3 — Acknowledged events

Acknowledging ("ack-ing") an event is a soft state change: the event stays in the feed, but its appearance softens so it no longer competes for your attention.

### What changes when you ack

- The **title** dims slightly (less than the strikethrough used for completed reminders, more than the default)
- An **outlined "Acked" pill** appears in the right-side fixed slot, just before the severity badge
- The **severity badge** stays in place, with its color intact, so you can still see "this was a warning" or "this was an error" at a glance, even after acking

Compare:

```
Before ack:  Backup failed ............... 03:14  ERROR
After ack:   Backup failed ........ Acked  03:14  ERROR
```

The severity color doesn't change. Acking is a comment on *your relationship with the event*, not on the event itself.

### When to ack vs. dismiss

- **Ack** when you've seen the event but want to leave it visible. Use cases: an ongoing problem you're investigating; a recurring noise pattern you want to keep an eye on; a backup that failed at 03:14 and you've made a note to look at after standup
- **Dismiss** when you've handled the event and want it out of your feed. Use cases: a transient warning that resolved on its own; an alert you've already routed to a ticket; a duplicate

Both are reversible. Ack is cosmetic; dismiss removes from the active feed but keeps the event in the database (and in source history).

### Resolved (state) vs. Acked (user action)

For stateful events, there's a related but distinct visual marker: **Resolved**. When a stateful condition (a Uptime Kuma monitor, a Home Assistant alarm) clears, the corresponding event renders with a **Resolved** marker. State and severity are independent axes: the closing event's `state` is *resolved*, but its severity is whatever the source's score assigns to the recovery event (commonly `ok`). The engine doesn't force the severity to ok on resolve; a recovery that the score rates as a warning stays a warning.

A "Resolved" pill is the *system* saying "this fixed itself"; an "Acked" pill is *you* saying "I've seen it." They can coexist on the same event: you can ack a still-firing problem, and you can also see when the problem eventually resolves.

> 🛠 **Tip**: bulk acknowledge via the action panel. Cmd-click multiple cards (or Shift-click for a range), then click "Acknowledge all (N)". See [§6.3 — Bulk acknowledge and dismiss](/docs/06-action-panel#63-bulk-acknowledge-and-dismiss).

---

## 5.4 — Stacked events

When a source emits multiple events that are conceptually related (same monitor flapping, same backup running multiple times, same UniFi client reconnecting), Tempo collapses them into a **stack**: a single card with a count pill on the right, instead of N separate cards.

### How a stack looks

A stacked card displays:

- The **most recent event** of the stack as the visible card (title, headline, severity all from the latest event)
- A **count pill** in the rightmost slot, showing how many events are in the stack

```
Backup failed ......... 03:14  CRITICAL  | [3]
```

The "3" tells you there are three events in this stack. The most recent one is the one shown.

### Expanding a stack

Click the card to expand the stack inline: the visible card stays as the parent, and sibling cards render below it in chronological order, indented and dimmed slightly so the visual hierarchy is clear.

A **dismiss-all footer** appears at the bottom of the expanded stack: "Dismiss all 3 events" with a single click. This is the bulk-action shortcut for clearing a noisy stack, useful when, say, your CI pipeline produced five identical "build failed" events and you only need to handle the underlying cause once.

Click the parent card again (or anywhere else) to collapse the stack.

### What "related" means

Stacking is driven by the **score** for the source. The legacy mechanism a score can declare is two things:

1. A **grouping key** template, like `${metadata.path}` for a backup tool. Events with the same resolved key are considered related
2. A **grouping window**: `1h`, `6h`, `1d`, `1w`, or no-window. Events outside the window of the most-recent event in a stack don't extend that stack; they start a new one

So if a source emits the same keyed event three times over the course of three hours with a `1h` grouping window: you'll see separate stacks for the runs that fall outside each other's window, not one combined stack.

> 💡 **Note**: the shipped *stateful* scores (Uptime Kuma, Beszel, UniFi) don't use the legacy template-plus-window mechanism above. They group by **session** via `groupingRules`: a down/recovery cycle is one session of opens, continues, and closes. That's a different grouping system from the one this section describes; if you're authoring a stateful score, reach for `groupingRules`, not the key-plus-window pair.

### Tuning stacks for your taste

If a source generates too many separate cards instead of stacking them:

- The score might not declare a `grouping` template at all → add one in the Score Editor's **Stack grouping** section
- The grouping template might reference a metadata field that's missing from your payloads → check the Available keys strip and pick a key that's actually present
- The grouping window might be too short → bump from `1h` to `6h` or `1d`

If a source over-stacks (events you wanted separate get clumped together):

- The grouping template might be too coarse: use a more specific key combination (e.g., `${metadata.host}/${metadata.path}` instead of `${metadata.host}`)
- Shrink the grouping window so older events no longer extend the stack

[§7.5 — Stack grouping](/docs/07-score-editor#75-stack-grouping) covers the editor mechanics.

---

## 5.5 — The heatmap

The horizontal strip above the event feed is the **24-hour activity heatmap**. It shows your day at a glance: 24 hour-segments, each colored by the highest-severity activity in that hour.

### How it reads

- Each segment is one hour of the day, 00:00 to 23:59
- An empty segment (no fill) means no events that hour
- A colored segment means at least one event happened; color reflects severity (green / yellow / red)
- Segment density (event count) influences saturation, not hue, so a "busy info" hour reads as busy without being mistaken for an alert
- A floor rule applies: at least one critical event makes the segment red regardless of count; at least one error keeps it at minimum yellow

For today's bar, hours that haven't happened yet stay empty: no gray placeholder, just blank space where the future will land.

### Past days

The heatmap also works for past days. Use the date picker at the top of the event panel to navigate to a previous day; the heatmap re-renders for that day's events.

This is useful for retrospective awareness: "what time did the problem start last Tuesday?" Navigate to Tuesday, scan the heatmap for the first non-empty hour. Faster than scrolling the feed.

### Click to scroll

Click any non-empty segment to scroll the event feed to that hour. The timeline jumps to the day-separator for that day (if needed) and centers the first event in the clicked hour at the top of the visible feed.

Empty segments don't respond to clicks: there's nothing to scroll to.

### Visual style

Two styles available, switchable in **Settings → Interface → Heatmap style**:

- **Pill** (default): rounded pill segments with a soft halo around active hours
- **Flat**: flat rectangular cells, the legacy look

Pill is the default for most users. Flat reads as more clinical and may suit dashboard-style preferences better.

### Color customization

In **Settings → Interface → Heatmap colors** you can customize the three semantic colors:

- **Info / OK**: defaults to green
- **Warning**: defaults to yellow/orange
- **Alert (Error / Critical)**: defaults to red

Changes apply immediately and also drive the severity-pill colors on event cards (so the heatmap and the cards stay visually consistent).

### Colorblind mode

Toggle **Settings → Interface → Heatmap colorblind mode** to add a vertical-fill encoding to each segment: more severe = taller fill within the segment. This way severity reads even without color cues.

> 💡 **Note**: the heatmap is *unfiltered*: it reflects all sources regardless of an active source filter. The reasoning: the heatmap is your *temporal awareness* surface. If you've filtered to Kopia but a UniFi alert lit up an hour ago, the heatmap still shows you that hour was non-empty so you don't miss it.

---

## 5.6 — Day separators

The event feed scrolls chronologically with **day separators** breaking the stream into one-day chunks. Each separator is a horizontal divider with a label:

- **TODAY** for the current calendar day
- **YESTERDAY** for the previous day
- **Weekday + month + day** ("MONDAY, APR 14") for any older day within the same year
- **Weekday + month + day + year** ("MONDAY, APR 14, 2025") for days in a past year

All labels are uppercased, with the weekday name always present so the rhythm of the week is visible at a glance even on dense feeds.

Separators are sticky in the visible region: as you scroll, the current day's separator pins to the top of the feed so you always know which day's events you're looking at.

### Why separators matter

Without them, a long feed is a wall of timestamps; you'd need to read the time on each event to know which day it belongs to. Separators give the feed scannable rhythm: **TODAY** is what you're handling now, **YESTERDAY** is what you missed, **Monday** is what was happening at the start of the work week.

### Locale

Separator labels are forced to **en_US locale** regardless of your Mac's system locale. The reasoning: Tempo's UI is currently English-only, and mixing localized day names ("lunedì", "Montag") with English UI ("Acked", "Critical") reads as inconsistent. A future version may localize the whole UI; at that point separators will follow.

> 🛠 **Tip**: if you want to jump to a specific past day, the date picker at the top of the event panel is faster than scrolling. The picker shows a small calendar overlay; click any date to jump to it.

---

## Empty states

A few situations leave the event panel empty:

- **No sources connected** (only Apple Calendar declined): "No events yet. Connect a source to get started" with a link to Manage Sources
- **All sources hidden**: "All sources are hidden. Click a source row to un-hide" with a link to the source panel
- **Active filter with no matching events**: "No events from filtered sources. Clear filter to see everything" with a clear button
- **Date selected with no events**: "No events on this day. Pick another date or jump to today" with a "Jump to today" button

Each empty state is intentional UX: the panel never shows a blank rectangle. There's always a hint about why it's empty and what to do about it.

---

## Where to go from here

- **What happens when you click an event** → [§6 — Action panel](/docs/06-action-panel)
- **Customizing how events look** → [§7 — Score Editor](/docs/07-score-editor)
- **Understanding stacking and grouping deeper** → [§2.6 — Stack and grouping](/docs/02-concepts#26--stack-and-grouping) (concept), [§7.5 — Stack grouping](/docs/07-score-editor#75-stack-grouping) (editor)
- **Making your feed quieter** → [§8.4 — Maintenance settings](/docs/08-settings-reference#84-maintenance) for auto-ack and auto-dismiss
