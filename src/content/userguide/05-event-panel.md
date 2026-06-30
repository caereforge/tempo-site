---
title: "Event panel"
description: "The event panel, the center column, is where the timeline lives."
chapter: 5
order: 5
draft: false
pubDate: 2026-05-05
---
# 5 - Event panel

The event panel, the center column, is where the timeline lives. Most of the time you spend in Tempo is spent looking at this panel. This chapter walks through every piece of it: the row layout, what each slot means, how acknowledged events render, how stacks expand, the activity heatmap above the feed, and the day separators that break the scroll into recognizable chunks.

---

## 5.1 - The event row

Every alert renders as a single-line row in the log-line layout. The columns sit in fixed slots, so once your eyes have learned the structure, scanning a long feed is fast: your gaze lands in the same place for the same kind of information.

### Row anatomy

```
[indicator] HH:MM  Source name  Title · subtitle ......... [headline] [ACK/OK] [BADGE] [tag] [stack] [•]
```

From left to right:

- **Indicator**: a small colored bar (or an emoji) at the row's left edge. Its color and emoji come from the score's indicator rules, or, for a run-bound stack primary, from the run lifecycle state. It is not the source color and not the severity color
- **Timestamp**: the event time in a fixed monospaced column. Inside an expanded stack, sibling rows also show the compact date, because a stack can span more than one day
- **Source name**: the human-readable source name, drawn in the source color
- **Title**: the event title, single-line truncated. Two optional pieces can follow it on the same line: the **headline metric** (the score's headline value such as a file size or duration, in monospaced semibold) and the **subtitle** (a score-supplied string, rendered after a `·` separator). The subtitle is empty unless a score provides one
- **ACK / OK slot**: an outlined pill. It reads `ACK` (yellow) when the event has been acknowledged, or `OK` (green) when a stateful event has resolved. Both share this one slot, and `ACK` wins when an event is both acknowledged and resolved
- **Custom-label badge**: a filled pill carrying the score's custom label (for example `BACKUP FAILED`), shown only when the score sets a label that differs from the default
- **Tag**: an outlined pill with the event's first tag, when present
- **Stack pill**: the stack count (or `↻N` flap-cycle count) for stacked rows; empty for single events
- **Severity**: at the rightmost edge, a small severity-colored dot. With the `ui.symbolicSeverity` setting on, the dot becomes an SF Symbol icon instead. The severity vocabulary itself (info, ok, warning, error, critical) is covered in §5.2

### Why the slot order matters

The slot layout is fixed so the same signal always sits in the same place:

- **Severity** lands at the rightmost edge, so the urgency cue is always in one spot
- **Headline metric** sits next to the title, pairing "what" (title) with "how much" (metric)
- The **ACK / OK** pill is outlined, visually distinct from the filled custom-label badge, so you can tell whether the event has been handled

### Agenda rows (calendar entries, reminders, tasks)

Calendar entries, reminders, and tasks do not use the alert log-line. They render as **compact agenda rows**:

- A **provider icon** identifying the source. Bundled providers have curated icons; custom sources get a generic fallback. If the title starts with an emoji and the source is unknown, the icon is suppressed to avoid double-decoration
- The title (with strikethrough for completed reminders)
- A small set of metadata on the right (start time, due date, status pills such as `OVERDUE` or `COMPLETED`, attachment and alarm icons)
- No indicator bar, no headline, no severity dot: these are agenda items, not alerts

The compact rendering keeps your calendar from drowning out monitoring events when both share the feed. If calendar activity is still too heavy, hide the calendar via **Settings → Agenda** or hide the agenda section entirely via the menubar **View → Show personal agenda** toggle.

---

## 5.2 - Severity

Severity is shown by color, not by a text label. On every alert row the rightmost slot is a severity-colored dot (or an SF Symbol icon when `ui.symbolicSeverity` is on). The same vocabulary applies across every source, regardless of which tool emitted the event.

| Severity | Meaning |
|---|---|
| `info` | Informational only, no action needed |
| `ok` | Positive outcome (a backup succeeded, a probe is up) |
| `warning` | Something to look at, not urgent |
| `error` | Something failed, attention needed |
| `critical` | Urgent, immediate action recommended |

The dot color runs cool to hot across this scale: blue for info, green for ok, then orange and red for the warning, error, and critical levels. Exact shades come from the active theme's semantic palette.

### Custom labels

The score for a source can attach a custom badge label: `OK` becomes `BACKUP OK`, `ERROR` becomes `BACKUP FAILED`, `WARNING` becomes `CONNECTION FAILED`. This label renders as a filled pill in the custom-label badge slot. The severity dot keeps its color, driven by severity, so a `BACKUP FAILED` event still shows a red dot and reads as an error at a glance, while the badge text carries the source-specific phrasing.

A simplified UniFi row might read:

```
... Title  STA_AUTH_FAILURE  •
```

The badge tells you what kind of event it is; the dot color tells you how urgent it is.

### Severity color vs. source color

The severity dot and the source identity are separate visual channels. The source color is used for the source-name text and the stack pill, telling you which source an event came from; the severity dot tells you how urgent it is. Keeping them separate means a feed with several sources does not read as uniformly alarming just because several sources happen to share a color.

> 💡 **Note**: severity colors come from the active theme's semantic palette. The heatmap has its own color settings in **Settings → Interface → Heatmap colors** (§5.5); the two are configured separately.

---

## 5.3 - Acknowledged events

Acknowledging ("ack-ing") an event is a soft state change: the event stays in the feed, but it stops counting toward the dock badge and the needs-attention filter.

### What changes when you ack

- An **outlined `ACK` pill** (yellow) appears in the ACK / OK slot, left of the custom-label badge
- The **severity dot** stays in place, with its color intact, so you can still see that the event was a warning or an error after acking
- The row keeps its normal opacity by default. If you turn on `ui.dimAckedRows` (Settings → Interface), acknowledged rows dim to a lower opacity so they recede further. This setting is off by default and dims the whole row, not just the title

Compare (with the dim setting off):

```
Before ack:  03:14  Backup failed ...............  •
After ack:   03:14  Backup failed ......... ACK    •
```

The severity dot color doesn't change. Acking is a comment on *your relationship with the event*, not on the event itself.

### When to ack vs. dismiss

- **Ack** when you've seen the event but want to leave it visible. Use cases: an ongoing problem you're investigating; a recurring noise pattern you want to keep an eye on; a backup that failed at 03:14 and you've made a note to look at after standup
- **Dismiss** when you've handled the event and want it out of your feed. Use cases: a transient warning that resolved on its own; an alert you've already routed to a ticket; a duplicate

Both are reversible. Ack keeps the event in the feed; dismiss removes it from the live feed but keeps it in the database (and in source history).

### Resolved (state) vs. Acked (user action)

For stateful events there's a related but distinct marker. When a stateful condition (an Uptime Kuma monitor, a Home Assistant alarm) clears, the resolving event shows an outlined `OK` pill (green) in the same slot the `ACK` pill uses. State and severity are independent axes: the closing event's `state` is *resolved*, but its severity is whatever the source's score assigns to the recovery event (commonly `ok`). The engine doesn't force the severity to ok on resolve; a recovery that the score rates as a warning stays a warning.

`OK` is the system reporting that the condition cleared; `ACK` is you reporting that you've seen it. They share one slot, and `ACK` takes precedence: if you ack an event that later resolves, the slot shows `ACK`, not `OK`.

> 🛠 **Tip**: bulk acknowledge via the action panel. Cmd-click multiple rows (or Shift-click for a range), then click "Acknowledge all (N)". See [§6.3 - Bulk acknowledge and dismiss](/docs/06-action-panel#63---bulk-acknowledge-and-dismiss).

---

## 5.4 - Stacked events

When a source emits multiple events that the score treats as related (for example a monitor that flaps up and down), Tempo collapses them into a **stack**: a single row with a count pill, instead of N separate rows.

### How a stack looks

A stacked row displays:

- The **most recent event** of the stack as the visible row (title, headline, and severity dot all from the latest event)
- A **stack pill** in the stack slot, showing the event count, or `↻N` when the stack is a multi-cycle flap aggregate (the cycle count, not the event count)

```
03:14  Backup failed ...............  •  [3]
```

The "3" tells you there are three events in this stack. The most recent one is the one shown.

### Expanding a stack

Click the row to expand the stack inline: the visible row stays as the parent, and sibling rows render below it in chronological order, indented and dimmed slightly so the visual hierarchy is clear. Sibling rows also show their date, since a stack groups by key and can span more than one day.

A **footer** appears at the bottom of the expanded stack with up to three buttons: **Ack (N)**, **Tag**, and **Dismiss (N)**. Each acts on the rows you've selected within the stack, or on the whole stack when nothing is selected. Dismiss is the bulk shortcut for clearing a noisy stack, useful when, say, a CI pipeline produced several identical "build failed" events and you only need to handle the underlying cause once.

Click the parent row again to collapse the stack.

### What "related" means

Stacking is driven by the **score** for the source. The legacy mechanism a score can declare is two things:

1. A **grouping key**, written as one template or an ordered list of them, like `${metadata.path}` for a backup tool. A score has only one grouping; when it lists several templates, the **first that fully resolves** for an event wins, so order sets the priority. Events with the same resolved key are considered related
2. A **grouping window**: `1h`, `6h`, `1d`, `1w`, or no-window. Events outside the window of the most-recent event in a stack don't extend that stack; they start a new one

So if a source emits the same keyed event three times over the course of three hours with a `1h` grouping window: you'll see separate stacks for the runs that fall outside each other's window, not one combined stack.

> 💡 **Note**: the shipped *stateful* scores (Uptime Kuma, Beszel, UniFi) don't use the template-plus-window mechanism above. They group by **session** internally: a down/recovery cycle is one session of opens, continues, and closes. This session-based grouping is built into those bundled scores; it is not yet a supported user-authoring feature, and richer custom grouping may arrive in a later version. For your own scores, the template grouping described above is the grouping available today.

### Tuning stacks for your taste

If a source generates too many separate rows instead of stacking them:

- The score might not declare a `grouping` template at all → add one in the Score Editor's **Stack grouping** section
- The grouping template might reference a metadata field that's missing from your payloads → check the Available keys strip and pick a key that's actually present
- The grouping window might be too short → bump from `1h` to `6h` or `1d`

If a source over-stacks (events you wanted separate get clumped together):

- The grouping template might be too coarse: use a more specific key combination (e.g., `${metadata.host}/${metadata.path}` instead of `${metadata.host}`)
- Shrink the grouping window so older events no longer extend the stack

[§7.5 - Stack grouping](/docs/07-score-editor#75---stack-grouping) covers the editor mechanics.

---

## 5.5 - The heatmap

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

- **Rounded pills** (default): rounded pill segments with color around events in neighboring empty hours
- **Flat cells**: flat rectangular cells that keep each hour strictly independent

Rounded pills is the default. Flat cells reads as more clinical and may suit dashboard-style preferences better.

### Color customization

In **Settings → Interface → Heatmap colors** you can customize the three semantic colors:

- **Info / OK**: defaults to green
- **Warning**: defaults to yellow/orange
- **Alert (Error / Critical)**: defaults to red

Changes apply immediately to the heatmap. These settings are separate from the severity dot colors, which come from the active theme's semantic palette.

### Colorblind mode

Toggle **Settings → Interface → Heatmap colorblind mode** to add a vertical-fill encoding to each segment: more severe = taller fill within the segment. This way severity reads even without color cues.

> 💡 **Note**: the heatmap is *unfiltered*: it reflects all sources regardless of an active source filter. The reasoning: the heatmap is your *temporal awareness* surface. If you've filtered to Kopia but a UniFi alert lit up an hour ago, the heatmap still shows you that hour was non-empty so you don't miss it.

---

## 5.6 - Day separators

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

## 5.7 - The needs-attention filter

A toggle above the feed switches between showing every event and showing only those that need attention. "Needs attention" means a firing, not-acknowledged, not-dismissed alert at warning severity or higher, which is the same set the dock badge counts. Turning the filter on hides everything else.

The filter is **not persisted across launches**: it resets to showing all events each time Tempo starts.

---

## Empty states

When the feed has nothing to show, the event panel displays a single empty state rather than a blank rectangle:

- Icon: a calendar-with-clock glyph
- Title: **"No events today"**
- Subtitle: **"Events from your sources will appear here."**

There are no per-cause buttons; the same message covers an unconnected source, a filtered-out feed, or a day with no activity.

---

## Where to go from here

- **What happens when you click an event** → [§6 - Action panel](/docs/06-action-panel)
- **Customizing how events look** → [§7 - Score Editor](/docs/07-score-editor)
- **Understanding stacking and grouping deeper** → [§2.6 - Stack and grouping](/docs/02-concepts#26---stack-and-grouping) (concept), [§7.5 - Stack grouping](/docs/07-score-editor#75---stack-grouping) (editor)
- **Making your feed quieter** → [§8.4 - Maintenance settings](/docs/08-settings-reference#84---maintenance) for auto-ack and auto-dismiss
