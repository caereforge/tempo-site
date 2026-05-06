---
title: "Source panel"
description: "The source panel — the leftmost column in the Tempo window — lists every source Tempo knows about and gives you the controls for showing, hiding, filtering, and re-colouring each one."
chapter: 4
order: 4
draft: false
pubDate: 2026-05-05
---
# 4 — Source panel

The source panel — the leftmost column in the Tempo window — lists every source Tempo knows about and gives you the controls for showing, hiding, filtering, and re-colouring each one. It's the closest thing Tempo has to a global navigator: where the event panel shows *what's happening*, the source panel shows *who's talking*.

This chapter walks through the UI element by element and explains what each one means, so the badges and controls stop being decoration and start being information.

---

## 4.1 — Source rows and badges

A source row is a horizontal strip with four parts, left to right:

```
●   Source name              ⚡ 12     ⓘ
```

- The **colour dot** on the left identifies the source visually. The same colour shows up on the source's events in the feed (as a left-edge stripe or background tint, depending on your stripe-meaning preference in **Settings → Interface**). Click the dot to open a colour picker
- The **source name** is the human-readable label. For bundled sources it defaults to the provider's canonical name ("Kopia", "UniFi", "Home Assistant"). For custom sources you can rename it in Manage Sources
- The **priority badge** on the right is the at-a-glance status — described in detail below
- The **info button** (ⓘ) on the far right opens the source actions menu — also described below

### The priority badge

The badge collapses three independent signals into one compact widget. Reading it correctly is the difference between glancing at the source panel and *understanding* the source panel.

**The three signals**:

| Channel | What it tells you |
|---|---|
| **Colour** | The maximum severity of currently outstanding events from this source: red (error/critical), yellow (warning), green (ok/info), or no fill (no outstanding events) |
| **Number** | The count of *actionable* events — non-acked, non-dismissed, currently demanding your attention |
| **Bolt** ⚡ | Whether the source is currently *live* — it has emitted at least one event within its [liveness window](/docs/14-glossary#liveness) [NEEDS REVIEW: confirm "liveness" glossary entry exists or add one] |

**The combinations you'll actually see**:

| Badge appearance | Meaning |
|---|---|
| Red `12` ⚡ | 12 actionable error/critical events; source is live |
| Yellow `3` | 3 actionable warnings; source has been silent past its liveness threshold |
| Green `1` ⚡ | 1 actionable ok/info event (a backup completed); live |
| Outline-only `5` | 5 events still in the feed but all already acked. Nothing demands attention |
| `⚡` only | Source is live but no events outstanding (everything's been handled or dismissed) |
| Nothing at all | Source is empty and silent — no recent events, none outstanding |

A row with no badge is fine and quiet. A red badge with a number is the row your eye should land on first.

> 🛠 **Tip**: hover over the badge to see a tooltip that spells out exactly what each channel is reporting for that specific source. The same explanation lives in **Settings → Help**, in case you'd rather have it as a reference.

### Hidden sources

If you've hidden a source (see §4.4 below), its row stays in the source panel but renders dimmed: the colour dot is at 35% opacity, the name is in tertiary text colour, and badges are halved in opacity. A hidden source contributes no events to the feed and no segments to the heatmap — Tempo treats it as if it didn't exist for the duration of the hide.

The row stays visible so you can un-hide easily; it isn't *gone*, just muted.

---

## 4.2 — Liveness signal

The bolt ⚡ icon on the badge answers a simple question: *is this source still talking to me, or has it gone silent?*

A source is **live** when it has emitted at least one event within its liveness window. The default window is **[NEEDS REVIEW: confirm default liveness window — likely 6h or 24h, see Settings → Maintenance → Liveness]** but you can override it globally and per-source.

Sources go silent for legitimate and illegitimate reasons:

- **Legitimate**: a Kopia repo only runs nightly, so it's silent during the day; an Apple Calendar with no upcoming entries is genuinely empty
- **Illegitimate**: an upstream tool crashed; a webhook URL changed and you forgot to update it; the LAN connection between your Mac and the upstream host dropped

The bolt is a *passive* signal — Tempo doesn't probe sources; it just notices when they stop being chatty. A missing bolt isn't a guaranteed alarm, it's a hint.

> 💡 **Note**: V1 only does passive liveness (silence detection). Active liveness (Tempo periodically pinging the upstream tool to confirm it's reachable) is on the V1.1+ roadmap. If you have a source that's *expected* to be silent for long stretches, set its per-source liveness window high enough that the bolt doesn't disappear during normal quiet periods.

### Tuning the liveness threshold

In **Settings → Maintenance → Liveness** you'll find:

- A **global default** — the threshold applied to every source unless overridden
- A **per-source override list** — pick a source, set a different threshold

Common thresholds:

- **15 minutes** for chatty monitors (Uptime Kuma probes, real-time webhooks)
- **6 hours** for hourly cron jobs
- **2 days** for nightly backups
- **1 week** for weekly maintenance scripts

If a source goes silent and the bolt disappears, that's the source telling you something. Whether it's a problem depends on the source.

---

## 4.3 — Source filtering and the filter banner

Clicking a source name (not the colour dot, not the info button — the name) **filters the timeline** to events from that source only. Two visual changes happen:

1. The clicked source row gets a slight highlight in the source panel (its background fills in)
2. A **yellow filter banner** appears across the top of the event panel, naming the filtered source(s): *"Filtered: UniFi · Kopia · click to clear"*

Click the banner (or click any active source row again) to clear the filter and return to the full feed.

### Multi-source filters

The single-click behaviour collapses the filter to one source. To filter to *multiple* sources:

1. Open the info menu (ⓘ) on the first source you want to add
2. Click **"Add to filter"**
3. Repeat for each additional source

The filter banner now lists all the sources, separated by `·`. Clear it the same way: click the banner, or use the menu's **"Show all sources"** entry on any source.

> 🛠 **Tip**: filter is a *visualisation* setting, not a state change. Filtering doesn't ack or dismiss anything; it just hides events from the *view*. Acking and dismissing happen via the action panel buttons or per-source auto-rules.

### What the filter affects

| Component | Affected by filter? |
|---|---|
| Event panel feed | Yes — only filtered sources show |
| Heatmap (24h activity bar) | No — heatmap always reflects all sources, regardless of filter |
| Source panel | No — every source row stays visible |
| Action panel | Indirect — only events in the filtered feed are selectable |

The heatmap intentionally ignores the filter. The reasoning: the heatmap is your *temporal awareness* surface. If you've filtered to UniFi but a critical Kopia event lit up an hour ago, you should still see that hour glowing red on the strip.

---

## 4.4 — Source actions menu

The info button (ⓘ) on each source row opens a context menu with the controls that aren't worth taking up permanent UI real estate:

```
Source actions
──────────────────────────
Show only this source
Add to filter            ▸ (or "Remove from filter" if already in)
Show all sources         ▸ (greyed out if no filter active)
──────────────────────────
Hide from timeline       ▸ (or "Show in timeline" if already hidden)
──────────────────────────
Change colour…
Show history…
```

### Show only / Add to filter / Show all

These are the same filter controls described in §4.3, exposed via menu for cases where you want explicit verbs rather than click-the-name. The menu's labels adapt to the current state:

- If there's no active filter: **"Show only this source"** is the primary entry
- If this source is already part of an active filter: **"Remove from filter"** appears
- If this source is *not* in the active filter: **"Add to filter"** and **"Show only this source"** both appear
- **"Show all sources"** clears the filter; greyed when no filter is active

### Hide from timeline

Hiding makes a source disappear from the event feed and the heatmap, but keeps the source row in the source panel (dimmed). The badge still updates — you can see at a glance that a hidden source is generating events — but the events themselves don't clutter your feed.

Hiding is the right move for:

- A source you don't currently care about but might un-hide later (a noisy CI workflow during a refactor that you'll want back when you're shipping again)
- A source from another household member that you only check occasionally
- A source whose events are useful to *count* but not to *read* (a Hazel rule firing on every download — you want to know it's working, but you don't need to see every fire)

To completely remove a source, use **Manage Sources** instead — that one fully forgets the source rather than just muting it.

### Change colour

Opens a colour picker that lets you assign any hex colour to the source. The colour appears:

- On the source's dot in the source panel
- On the source's events in the feed (as a left-edge stripe or background tint, depending on **Settings → Interface → Stripe meaning**)
- On the source's segments in the heatmap when the heatmap is set to "source" colouring [NEEDS REVIEW: confirm that source-colouring mode for heatmap exists; default is severity-based]

The colour is purely cosmetic — it doesn't affect severity, scoring, or any data behaviour. It's there because in a homelab feed with a dozen sources, distinct colours make the panel scannable.

> 💡 **Note**: bundled scores ship with default colours that work well together (Kopia green, UniFi blue, Home Assistant blue/teal, Uptime Kuma orange, GitHub Actions purple, etc.). You're free to override them per-source in your local install — the original score colour is not lost; you can reset to default via the Score Editor. See [§7.8 — Persistence and reset to defaults](/docs/07-score-editor#78-persistence-and-reset-to-defaults).

### Show history

Opens the **source history sheet** — a separate window showing this source's activity over the past 84 days as a GitHub-contribution-style heatmap grid. Each cell is one day, coloured by the maximum severity of that day's events.

The 84-day window is what the *visualisation* renders, not what Tempo *retains*. The full event database keeps everything indefinitely, subject to your retention policy in **Settings → Maintenance → Database**.

The history sheet is read-only — you can hover over any cell to see a tooltip with that day's count and severity breakdown, but you can't edit or dismiss events from this view. To act on a specific day's events, close the history sheet, navigate to that day in the main timeline (using the date picker at the top of the event panel), and act from there.

> 🛠 **Tip**: source history is the answer to "did anything weird happen with this backup last weekend?" or "is this source generating more noise this month than last?". A glance at the heatmap pattern often answers these questions faster than scrolling through cards.

---

## Manage Sources

The button at the top of the source panel switches the panel into **Manage Sources** mode. The label adapts:

- **"Get started — add a source"** when you have one or two sources (you've just installed Tempo)
- **"Add a source"** when you have three or four
- **"Manage sources"** when you have five or more

Manage Sources is its own view — same column, different content. From there you can:

- Add a new source (which mostly means installing or authoring a [score](/docs/14-glossary#score) and pointing the upstream tool at Tempo's ingestion endpoint)
- Reorder existing sources (drag rows to re-rank them — order in the source panel is purely visual but matters for muscle memory)
- Edit per-source settings: display name, group membership, auto-dismiss override, liveness override
- Remove a source entirely (forgets it; events from that source stop being ingested)

A yellow accent line above the button highlights the transition, so when you're switching between the active list and the manage view your eye lands in the same place.

[NEEDS REVIEW: confirm exact contents of Manage Sources view — fields, controls. Likely covered in detail in a future revision once the Manage Sources UI is more settled.]

---

## Where to go from here

- **Customising what events look like in the feed** → [§5 — Event panel](/docs/05-event-panel)
- **Editing the score for a source** → [§7 — Score Editor](/docs/07-score-editor)
- **Tuning auto-rules per source** → [§8.4 — Maintenance settings](/docs/08-settings-reference#84-maintenance)
- **Adding a new source from scratch** → [§10 — Sources reference](/docs/10-sources-reference)
