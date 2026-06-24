---
title: "Action panel"
description: "The action panel, the rightmost column, is where you do something about what you see in the feed."
chapter: 6
order: 6
draft: false
pubDate: 2026-05-05
---
# 6 — Action panel

The action panel, the rightmost column, is where you do something about what you see in the feed. Click an event, the action panel populates with everything Tempo knows about it: the score-defined buttons, the metadata payload, the buttons to ack or dismiss. Click multiple events, the panel switches into bulk mode.

This chapter covers all three states: nothing selected, one event selected, many events selected.

---

## 6.1 — What appears when you select an event

When you click a single event in the feed, the action panel renders the **event detail view**, top to bottom:

### Header

A colored accent stripe at the top (the source color) followed by:

- **Source row**: colored dot + provider display name on the left, **status pill** on the right (severity badge, "Resolved", "Acked", or combinations)
- **Title**: large, primary; struck through and dimmed for completed reminders
- **Backup stats row**: when the event metadata includes backup-style fields (file count, byte counts, timing), Tempo renders them as a summary line. Other event types skip this row
- **Time**: start time and end time when present; "All day" for all-day calendar entries

### Actions section

Below the header, the **Actions** section lists every action button declared by the score for this event's source, plus any per-event actions that came in the payload itself.

Each button shows:

- A **leading SF Symbol icon** chosen by the score (a lock for SSH, a globe for browser URLs, a terminal for commands)
- A **label** chosen by the score: descriptive ("Open dashboard", "Copy IP", "Ping client") rather than generic
- A **subtitle** showing the resolved trigger value (the URL, the command, the string to copy) so you can confirm what's about to happen before clicking

Actions are ordered: **score-declared defaults first** (stable across all events of the same source, so you build muscle memory), **per-event actions next** (the upstream tool put them in the payload, override score defaults by label).

Click a button:

- **`openURL`** triggers: open in the relevant macOS handler (browser for `https://`, Terminal for `ssh://`, the registered app for `obsidian://` or `slack://`, and so on for any of the allowed schemes). Only allowlisted schemes dispatch; anything outside the allowlist is blocked at click time
- **`openTerminalWith`** triggers: Terminal.app activates and the command runs in a new window or tab
- **`copyToClipboard`** triggers: the string lands in your clipboard, and a brief feedback animation fires on the button

The event stays selected, so you can fire multiple actions in a row.

> 💡 **Note**: action buttons resolve `${...}` placeholders **at click time**, not at render time. If the resolved subtitle shows `${metadata.host}` literally instead of the actual host, that means the payload didn't include a `host` field, so the score's interpolation had nothing to substitute. Either fix the upstream payload or change the score to reference a field that's actually present.

### Details section

Below the actions, the **Details** section renders the event's full metadata payload as a list of key/value rows. Each row is monospaced for the value (so JSON-shape values are readable) and selectable for copy.

Tempo hides a small set of internal keys (`badge`, `badgeHex`, `source`, `providerName`, `report`) that exist for rendering plumbing rather than user-facing information. Everything else is shown verbatim.

Long values (anything over ~200 characters: long notes, large embedded JSON, multi-URL fields) render as a **collapsible row** with a "Show more" toggle, so a single large field can't blow up the panel.

> 🛠 **Tip**: clicking inside a value selects it (text-selection enabled). `Cmd-C` copies. A dedicated copy-on-click affordance is on the V1.1+ roadmap (with an opt-in setting so you don't accidentally copy on every selection click).

### Bottom attention bar

A persistent footer pinned to the bottom of the panel holds two universal buttons:

- **Acknowledge** (yellow accent): toggles the event's ack state. Reversible: click when already acked to un-ack
- **Dismiss**: moves the event out of the active feed and into source history. Reversible via "Restore" (which appears in place of Acknowledge when the event is already dismissed)

These two buttons apply to *any* event type: alerts, reminders, calendar events alike. They're the universal escape valves: you've seen this thing (Ack), or you've handled it and want it out of your way (Dismiss).

> 💡 **Note**: acknowledging or dismissing a calendar event or a reminder is a *Tempo-side soft mark*: Tempo records you've seen it (or hidden it from the active feed), but never propagates back to Calendar.app or Reminders.app. The original calendar entry stays scheduled and the reminder stays pending in their respective apps. This is deliberate: Tempo isn't your calendar app and isn't your task manager, so it doesn't reach into them. To complete a reminder for real, use Reminders.app, or click the per-event **Mark complete** action in the panel above (once you've granted Tempo access to Reminders, that path *does* propagate completion upstream).

The yellow accent on Acknowledge isn't decorative: it's the color Tempo uses globally for "user attention" affordances (filter banner, ack pills). Once you've internalized that, the Acknowledge button reads as "this is a user-attention action" rather than just "this is the primary button."

> 💡 **Note**: when an event is already acked, the Acknowledge button renders as a ghost outline (yellow border, transparent fill) rather than a filled prominent button. The color stays so you know what state it represents, but the visual weight drops: un-acking is reversible plumbing rather than a primary action.

---

## 6.2 — Multi-select mode

Tempo supports macOS-standard multi-selection in the event feed. The modifier keys behave the way they do everywhere else on the Mac:

| Action | Modifier |
|---|---|
| Select a single event | Plain click |
| Toggle a single event in/out of the selection | **Cmd-click** |
| Select a range from the anchor to the clicked event | **Shift-click** |
| Clear the selection | **Esc**, or click an event without modifiers, or click the "Clear selection" link in the panel |

The "anchor" for Shift-click is the most recently single-clicked event. Range expands within the *visible* feed order, which means if you've filtered the feed to a specific source, Shift-click only selects events from that filtered view, not events that would be invisible.

### Visual feedback

Selected events render with:

- A brighter card background
- A more saturated stripe color (the border tints up to the source color at 60% opacity)
- A subtle shift in the card, so they read as "lifted" relative to unselected siblings

When two or more events are selected, the action panel switches into **multi-select mode** automatically (covered in §6.3). You don't need to enter a special mode; selection count is the only trigger.

### When to use multi-select

The most common scenarios:

- **Bulk-acking a stream of related events**: your CI pipeline produced 20 build-failed events for the same root cause; ack them all once you've handled it
- **Bulk-dismissing noise**: a misconfigured Hazel rule generated 50 events; dismiss all 50 with one click
- **Selecting a range across a stack expansion**: Shift-click works through expanded stacks; the range covers every visible card in the order they're rendered

Multi-select is *not* the right tool for:

- **Per-event actions**: you can only fire individual actions on a single selected event. The bulk panel only offers Acknowledge / Dismiss / Clear, not score-defined actions like "SSH" or "Open dashboard"
- **Editing events**: Tempo doesn't let you bulk-edit event titles, severities, etc. The score system is the authoring surface for that

---

## 6.3 — Bulk acknowledge and dismiss

When two or more events are selected, the action panel switches modes entirely. The single-event detail view is replaced by the **multi-select detail**, a deliberately distinct visual signature so you can't confuse "Acknowledge" (single-event button) with "Acknowledge all" (bulk button).

### What the bulk panel shows

Top to bottom:

- **Accent stripe** in Tempo yellow at the top edge: the bulk panel's distinguishing visual mark
- **Header**: the total selected count ("12 events selected") plus a severity breakdown ("3 critical · 5 error · 4 warning") in tertiary text
- **Helper line**: *"Bulk actions apply to every selected event. Press Esc or click an event to clear the selection."*
- **Spacer**: pushes the action buttons to the bottom for thumb-friendly placement on trackpads
- **Bulk action row** at the bottom:
  - **Acknowledge all (N)**: yellow prominent button, marks every selected event as acked. Disabled (and re-labeled "All acked") if every selected event is already acked
  - **Dismiss all (N)**: secondary button, dismisses every selected event
  - **Clear selection**: plain text button below, clears the selection without dismissing or acking anything

The whole panel has a soft yellow tint behind it (8% opacity) so even peripheral vision recognizes "you're in bulk mode."

### What "all" means

- **Acknowledge all (N)** acks **every** selected event. Events that are already acked stay acked. Reversible per-event afterwards (single-select any of them, click Acknowledge again to un-ack)
- **Dismiss all (N)** dismisses **every** selected event. Events already dismissed stay dismissed. Reversible per-event afterwards via the Restore button on the dismissed event's single detail view

### Severity breakdown

The breakdown line at the top of the bulk panel shows counts grouped by severity, in the order critical → error → warning → info → ok. It's not a control, just a check so you can confirm your selection contains what you think it contains before clicking Acknowledge or Dismiss.

If you selected "everything in this stack" expecting all warnings and the breakdown shows "8 warning · 1 critical," that's a hint to look more carefully before bulk-dismissing.

### What's not in the bulk panel

The bulk panel deliberately omits:

- **Score-defined actions** (SSH, Open dashboard, etc.): these are per-event by design. Most actions don't make sense when fanned out across multiple events (you don't want to SSH into 12 different hosts at once; you want to SSH into the one host the alert is about)
- **Restore**: when a multi-select includes already-dismissed events, the bulk panel still offers Acknowledge all / Dismiss all, but bulk-restore isn't surfaced. Restore individual events from their detail view instead

These omissions aren't gaps; they're intentional. Bulk operations are for the repetitive verbs (ack, dismiss); per-event verbs stay per-event.

---

## Selecting nothing

When no event is selected, the action panel shows a placeholder:

> Select an event to see actions.

This isn't an empty-state to be embarrassed about; it's a deliberate breath in the layout. The action panel has a defined width (it's resizable but always present), and it would feel uncomfortable to leave it blank. The placeholder confirms that the panel is intentional and waiting for input, rather than broken.

---

## Where to go from here

- **Customizing the action set for a source** → [§7.6 — Default actions](/docs/07-score-editor#76-default-actions) (in the Score Editor)
- **Writing a score from scratch with custom actions** → [§11.4 — Action triggers reference](/docs/11-score-authoring#114-action-triggers-reference)
- **Per-source auto-rules so you don't have to bulk-ack every day** → [§8.4 — Maintenance settings](/docs/08-settings-reference#84-maintenance)
