---
title: "Source panel"
description: "The source panel, the leftmost column in Tempo, lists every source and gives you the controls to show, hide, filter, and recolor each one."
chapter: 4
order: 4
draft: false
pubDate: 2026-05-05
---
# 4 - Source panel

The source panel (the leftmost column in the Tempo window) lists every source Tempo knows about and gives you the controls for showing, hiding, filtering, and recoloring each one. The event panel shows the events; the source panel shows the sources those events came from.

This chapter describes each control and badge in the panel.

---

## 4.1 - Source rows and badges

A source row is a horizontal strip with four parts, left to right:

```
●   Source name              ⚡ 12     ⓘ
```

- The **color dot** on the left identifies the source. It's also the source's accent color, the tint Tempo applies to event cards from this source in the feed. On a leaf source the dot is a color picker: click it to open the system color picker and recolor the source. On an **umbrella parent** (UniFi, Apple, Scripts) the dot is a fixed neutral marker: the parent has no color of its own, so it can't be recolored; set colors on its concrete sub-sources instead. The left-edge stripe on each event card is a separate signal that always reflects *severity* (green / yellow / red), not the source color
- The **source name** is the human-readable label. For bundled sources it defaults to the provider's canonical name ("Kopia", "UniFi", "Home Assistant"). For custom sources you can rename it in Manage Sources
- The **priority badge** on the right is the at-a-glance status, described in detail below
- The **info button** (ⓘ) on the far right opens the source actions menu, also described below

### The priority badge

The badge combines three independent signals into one compact widget.

**The three signals**:

| Channel | What it tells you |
|---|---|
| **Color** | The maximum severity among the source's *actionable* events: non-acked, non-dismissed, still asking for your attention. Red (error/critical), yellow (warning), green (ok/info), or no color fill when nothing actionable remains. Acked events still in the feed don't drive the fill. Dismissed events never contribute. |
| **Number** | The count of actionable events. It is hidden when zero; a green fill with no number means there is nothing to handle. |
| **Bolt** ⚡ | Whether the source is currently *live*: it has emitted at least one event within its [liveness window](/docs/14-glossary#liveness) |

**The combinations you'll actually see**:

| Badge appearance | Meaning |
|---|---|
| Red `12` ⚡ | 12 actionable error/critical events; source is live |
| Yellow `3` | 3 actionable warnings; source has been silent past its liveness threshold |
| Green `1` ⚡ | 1 actionable ok/info event (a backup completed); live |
| `⚡` only | Source is live but nothing needs handling (the outline capsule carries just the bolt, no number) |
| Nothing at all | Source is empty and silent: no recent events, nothing to handle |

A row with no badge is quiet. A red badge with a number is the one that needs attention first.

> 🛠 **Tip**: hover over the badge to see a tooltip that spells out exactly what each channel is reporting for that specific source. The same explanation lives in **Settings → Help**, in case you'd rather have it as a reference.

### Hidden sources

If you've hidden a source (see §4.4 below), its row stays in the source panel but renders dimmed: the color dot is at 35% opacity, the name is in tertiary text color, and badges are halved in opacity. A hidden source contributes no events to the feed and no segments to the heatmap; Tempo treats it as if it didn't exist for the duration of the hide.

The row stays visible so you can un-hide easily; it isn't *gone*, just muted.

---

## 4.2 - Liveness signal

The bolt ⚡ icon on the badge answers a simple question: *is this source still talking to me, or has it gone silent?*

A source is **live** when it has emitted at least one event within its liveness window. The default window is **24 hours (1 day)** but you can override it globally and per-source in **Settings → Maintenance → Liveness**.

Sources go silent for legitimate and illegitimate reasons:

- **Legitimate**: a Kopia repo only runs nightly, so it's silent during the day; an Apple Calendar with no upcoming entries is genuinely empty
- **Illegitimate**: an upstream tool crashed; a webhook URL changed and you forgot to update it; the LAN connection between your Mac and the upstream host dropped

The bolt is a *passive* signal: Tempo doesn't probe sources; it just notices when they stop being chatty. A missing bolt isn't a guaranteed alarm, it's a hint.

> 💡 **Note**: V1 only does passive liveness (silence detection). Active liveness (Tempo periodically pinging the upstream tool to confirm it's reachable) is on the V1.1+ roadmap. If you have a source that's *expected* to be silent for long stretches, set its per-source liveness window high enough that the bolt doesn't disappear during normal quiet periods.

### Tuning the liveness threshold

In **Settings → Maintenance → Liveness** you'll find:

- A **global default**: the threshold applied to every source unless overridden
- A **per-source override list**: pick a source, set a different threshold

Common thresholds:

- **1 hour** for chatty monitors (Uptime Kuma probes, real-time webhooks)
- **6 hours** for hourly cron jobs
- **1 day (default)** for nightly backups: Kopia running at the same time every night keeps its bolt lit indefinitely
- **3 days** for weekly maintenance scripts that check in every few days
- **7 days** for genuinely weekly cycles (a renewal job, a curated digest)

If a source goes silent and the bolt disappears, that's the source telling you something. Whether it's a problem depends on the source.

---

## 4.3 - Source filtering and the filter banner

Filtering goes through the source's **info menu** (ⓘ), not by clicking the row. Open the menu and pick **"Show only this source"** to filter the timeline down to that one source. Two visual changes happen:

1. The chosen source row gets a slight highlight in the source panel (its background fills in)
2. A **yellow filter banner** appears across the top of the event panel, naming the filtered source(s): *"Showing only UniFi"* for one source, or *"Showing 2 sources: Kopia, UniFi"* for several. A **Clear** button on the right dismisses the filter

Click the banner to clear the filter and return to the full feed (or use the menu's **"Show all sources"** entry on any source).

### Multi-source filters

To filter to *multiple* sources at once:

1. Open the info menu (ⓘ) on the first source and click **"Show only this source"**
2. Open the info menu (ⓘ) on each additional source you want to include and click **"Add to filter"**

The filter banner lists the sources separated by commas, capped at three names with a "+N more" suffix beyond that. Clear it the same way: click the banner, or use the menu's **"Show all sources"** entry on any source.

> 🛠 **Tip**: filter is a *visualization* setting, not a state change. Filtering doesn't ack or dismiss anything; it just hides events from the *view*. Acking and dismissing happen via the action panel buttons or per-source auto-rules.

### What the filter affects

| Component | Affected by filter? |
|---|---|
| Event panel feed | Yes: only filtered sources show |
| Heatmap (24h activity bar) | No: heatmap always reflects all sources, regardless of filter |
| Source panel | No: every source row stays visible |
| Action panel | Indirect: only events in the filtered feed are selectable |

The heatmap intentionally ignores the filter. It shows activity over time across all sources, so if you've filtered to UniFi but a critical Kopia event arrived an hour ago, that hour still shows on the strip.

---

## 4.4 - Source actions menu

The info button (ⓘ) on each source row opens a context menu with the controls that aren't worth taking up permanent UI real estate:

```
Source actions
──────────────────────────
Show only this source
Add to filter            ▸ (or "Remove from filter" if already in)
Show all sources         ▸ (grayed out if no filter active)
──────────────────────────
Hide from timeline       ▸ (or "Show in timeline" if already hidden)
──────────────────────────
Show dismissed…
Save full history…
```

Color is set elsewhere: click the source's colored dot directly (system color picker), or open the source's score in the Score Editor, where it sits next to the display name and the rest of the source-level configuration.

### Show only / Add to filter / Show all

These are the filter controls described in §4.3; they live in this menu because filtering is a deliberate action, not something the source row should trigger by accident on a stray click. The menu's labels adapt to the current state:

- If there's no active filter: **"Show only this source"** is the primary entry
- If this source is already part of an active filter: **"Remove from filter"** appears
- If this source is *not* in the active filter: **"Add to filter"** and **"Show only this source"** both appear
- **"Show all sources"** clears the filter; grayed when no filter is active

### Hide from timeline

Hiding makes a source disappear from the event feed and the heatmap, but keeps the source row in the source panel (dimmed). The badge still updates, so you can see at a glance that a hidden source is generating events, but the events themselves don't clutter your feed.

Hiding is the right move for:

- A source you don't currently care about but might un-hide later (a noisy CI workflow during a refactor that you'll want back when you're shipping again)
- A source from another household member that you only check occasionally
- A source whose events are useful to *count* but not to *read* (a Hazel rule firing on every download: you want to know it's working, but you don't need to see every fire)

To completely remove a source, use **Manage Sources** instead; that one fully forgets the source rather than just muting it.

### Show dismissed

Opens the **dismissed-events sheet** for this source: a window listing every event you've dismissed from it, newest dismissal first. The header names the source and reads "Dismissed events". Each row shows the event title and an audit lifeline (when it arrived, when and how it was acked, when it was dismissed) and carries a **Restore** button that returns the event to the live feed. If nothing has been dismissed from the source, the sheet reads "Nothing dismissed from this source yet."

The sheet is scoped to one provider, not a global dismissed list. For sources organized under an **umbrella** parent (UniFi grouping Network and Protect, Apple grouping Calendar and Reminders, Scripts grouping its languages), open **Show dismissed** on the concrete sub-source you care about.

### Save full history

The next entry, **Save full history…**, opens a save panel and exports this source's complete event history to a file at a path you choose. Pick a `.csv` or `.json` extension to set the format. For an umbrella parent the export rolls up every contained provider's events into one file. This is a one-way export for archiving or analysis outside Tempo, not a viewer; the events stay in Tempo untouched.

> 🛠 **Tip**: the dismissed-events sheet answers "what did I clear from this source last week, and do I want any of it back?". The **Restore** button puts a row back in the live feed without re-ingesting it.

---

## 4.5 - Activity heatmap

Below the source list the panel shows an **Activity** heatmap: a GitHub-contribution-style grid of the last 84 days (12 weeks × 7 weekdays). Columns are weeks with the current week rightmost, rows are weekdays with Monday on top. Each cell is one day, its hue set by the most severe event recorded that day. Hover any cell for a popover with the date and a per-severity count breakdown ("No events" on an empty day).

This grid aggregates **all** sources, not one; it is not affected by the source filter. The severity color is frozen at ingest time, so editing a score later does not recolor past days. Days that fall outside your retention cutoff are pruned from the database and drop off the grid, so a short retention window can blank parts of it (retention is set in **Settings → Maintenance → Database**).

> 🛠 **Tip**: the Activity heatmap answers "did anything change in the overall pattern this month?". A glance at the grid often reads faster than scrolling the feed.

---

## Manage Sources

The button at the bottom of the source panel switches the panel into **Manage Sources** mode. The label adapts:

- **"Add a source"** with a sparkles icon when you have two or fewer sources (the prominent prompt right after install)
- **"Add a source"** with a plain plus icon when you have three or four
- **"Manage sources"** when you have five or more

Manage Sources is its own view: same column, different content. From there you can:

- Add a new source (which mostly means installing or authoring a [score](/docs/14-glossary#score) and pointing the upstream tool at Tempo's ingestion endpoint)
- Edit per-source settings: display name, auto-dismiss override, liveness override
- Remove a source. This deletes its score and, by default, its stored events and settings, though you can opt to keep the events or keep the settings when you remove it. The source's ingestion token is **kept** by default (deleting it is a separate opt-in); as long as the token survives, the source can still POST new events, so to fully cut it off, delete its token too

A yellow accent line near the button marks the transition between the active list and the manage view.

---

## Where to go from here

- **Customizing what events look like in the feed** → [§5 - Event panel](/docs/05-event-panel)
- **Editing the score for a source** → [§7 - Score Editor](/docs/07-score-editor)
- **Tuning auto-rules per source** → [§8.4 - Maintenance settings](/docs/08-settings-reference#84---maintenance)
- **Adding a new source from scratch** → [§10 - Sources reference](/docs/10-sources-reference)
