---
title: "Glossary"
description: "A user action you take on an event to mean \"I've seen this, I'm leaving it in the feed for now.\" The event stays visible but its appearance shifts — the title becomes lighter, the severity meta-text gets an outlined \"Acked\" pill — so it sto"
chapter: 14
order: 14
draft: false
pubDate: 2026-05-05
---
# Glossary

> Linked from across the User Guide. If you land here via a link, the term you came for is below — and there's a "See also" at the bottom of each entry that points back to the chapter where it's used in context.
>
> **Reading tip**: most terms make more sense once you've skimmed the [Concepts chapter](/docs/02-concepts). If a term feels abstract here, the chapter has an example.

---

### Acked (acknowledged)

A user action you take on an event to mean "I've seen this, I'm leaving it in the feed for now." The event stays visible but its appearance shifts — the title becomes lighter, the severity meta-text gets an outlined "Acked" pill — so it stops competing for your attention.

Acking is reversible. It's distinct from [dismissing](#dismissed), which removes the event from the active feed entirely.

**See also**: Chapter 5.3 (Acknowledged events), Chapter 6.3 (Bulk acknowledge).

---

### Action

Something Tempo can do when you click a button on an event. Each event ships with its own set of actions, declared in the [score](#score) for that source. Built-in action types in v1 are limited to harmless primitives: open a URL, run a terminal command, copy a string to the clipboard.

Actions are user-triggered in v1 — Tempo never fires one on its own. Auto-firing actions are part of the v2 trajectory.

**See also**: Chapter 6 (Action panel), Chapter 7.6 (Default actions in scores).

---

### Action trigger

The technical part of an [action](#action) that says *what* happens when the action is clicked. The three trigger types in v1:

- `openURL` — opens any URL the user's Mac knows how to handle (`https://`, `ssh://`, `vnc://`, custom app schemes)
- `openTerminalWith` — opens Terminal.app and runs a command
- `copyToClipboard` — copies a string to the system clipboard

Each trigger can use [interpolation](#interpolation) to pull values from the event's payload at click time.

**See also**: Chapter 11.4 (Action triggers reference).

---

### Attention state

Internal field on every event that tracks whether it currently needs the user's attention. Three values: `needsAttention` (default — shown normally), `acked` ([acknowledged](#acked) by user, de-emphasised), `dismissed` ([dismissed](#dismissed), removed from the active feed).

You don't usually need to think about this — Tempo manages it for you when you click Ack/Dismiss buttons or configure auto-dismiss rules.

**See also**: Chapter 8.4 (Maintenance settings).

---

### Audit log

The trail of what happened on the ingestion side: which payloads arrived, from which IP, with which token, accepted or rejected and why. Useful when a [score](#score) isn't behaving as expected and you need to confirm whether the underlying event even reached Tempo.

Stored locally in `~/Library/Application Support/Tempo/Logs/` and viewable via macOS Console.app or via the diagnostic export from Settings → Help.

**See also**: Chapter 12.6 (Logs and diagnostic export).

---

### Bundled score

A [score](#score) that ships preconfigured with Tempo for a common source — Kopia, UniFi (Network and Protect), Home Assistant, Uptime Kuma, GitHub Actions, Synology, Apple Calendar & Reminders. You don't need to write JSON to use a bundled source: just point the upstream tool at Tempo's [ingestion endpoint](#ingestion-server) and the bundled score handles the rest.

Bundled scores are editable. Your edits persist across app restarts and update checks. You can also reset a bundled score to its factory default at any time.

**See also**: Chapter 10 (Sources reference), Chapter 7.8 (Persistence and reset to defaults).

---

### CI (continuous integration)

The general category of tools that automatically build, test, and (often) deploy your code on every commit. Common ones in the homelab and dev space: GitHub Actions, GitLab CI, Jenkins, Drone, Buildkite. Tempo doesn't care which one you use — any CI system that can POST a webhook can send events to Tempo.

GitHub Actions is the bundled-score source out of the box. Other CI systems use the generic webhook.

**See also**: Chapter 10.7 (GitHub Actions), Chapter 10.2 (Generic webhook).

---

### Custom label

A user-defined string attached to a specific [severity rule](#severity-rule) inside a [score](#score), shown next to the event title or in place of the severity meta-text. Lets you write things like "Backup OK · +147KB" instead of the raw severity word "ok".

Custom labels often use [interpolation](#interpolation) so the label includes a value from the event payload (file size, duration, error code).

**See also**: Chapter 7.4 (Presentation and custom labels).

---

### Dismissed

A user action that removes an event from the active feed. The event isn't deleted — it's still in the database and you can find it via source history — but it stops appearing in the main timeline.

Dismissing is the right move for events you've handled and don't want cluttering your view. For events you've seen but want to leave visible, [ack](#acked) instead.

**See also**: Chapter 6.3 (Bulk acknowledge and dismiss).

---

### Event

The atomic unit Tempo deals with. Anything that happens — a calendar entry, a backup completion, a UniFi alarm, a GitHub Actions run — arrives at Tempo as an event with a title, a timestamp, a [provider](#provider) identifier, and a payload of metadata.

Events have a small set of types (`alert`, `event`, `task`, `reminder`) and a [severity](#severity). Both are assigned by the [score](#score) for that source.

**See also**: Chapter 2.1 (Events).

---

### externalID

The identifier the upstream source uses for an event. When the same upstream entity sends multiple updates (e.g., Uptime Kuma re-notifying every 60 seconds that web-01 is down), Tempo uses the externalID to recognise them as updates to the same event rather than separate events.

If a source sends a fresh externalID every time, Tempo treats each one as new. If it sends a stable externalID per monitored thing, repeated ingests update the existing row in place.

**See also**: Chapter 2.2 (Sources and providers), Chapter 11.2 (Field reference).

---

### Filter banner

The yellow horizontal strip across the top of the event panel when one or more sources are selected as a filter. Lists the active filtered sources, separated by `·`. Click to clear the filter and return to the full feed.

The filter affects the event feed but **not** the heatmap (which always reflects all sources, regardless of filter, because it's the temporal-awareness surface).

**See also**: Chapter 4.3 (Source filtering and the filter banner).

---

### Grouping window

A time window inside which related events get [stacked](#stack) instead of shown individually. If a [score](#score) declares a grouping window of `1h` and the source sends three alerts about the same monitored entity within an hour, they appear in the feed as a single stack with the count "3" rather than three separate cards.

Configurable per score: 15 minutes, 30 minutes, 1 hour, 6 hours, 1 day, 1 week, or no cutoff (always stack).

**See also**: Chapter 2.6 (Stack and grouping), Chapter 7.5 (Stack grouping).

---

### Headline metric

A user-facing number or short string surfaced prominently on an event card — file size, duration, error count, IP address — chosen by the [score](#score) for that source. Pulled from the event payload via [interpolation](#interpolation).

Headline metric is the difference between a card that says "Backup completed" and one that says "Backup completed · +147KB · 1.2s".

**See also**: Chapter 5.1 (The event card), Chapter 7.4 (Presentation and custom labels).

---

### Heatmap

The 24-hour activity strip that sits above the event feed for the current day. Each segment is one hour, coloured by the highest-severity event in that hour: blue (info), green (ok), yellow (warning), red (error/critical), neutral grey (no events).

Click any hour segment to scroll the feed to that hour. Two visual styles available — pill or flat — togglable in Settings → Interface.

**See also**: Chapter 5.5 (The heatmap), [Source history view](#source-history-view) for longer-range visualisation.

---

### Ingestion server

The HTTP server inside Tempo that listens for incoming events from external sources. Default port `7776`, bound to `0.0.0.0` (all interfaces) so other machines on your LAN can reach it. Authenticates each request via per-provider [tokens](#ingestion-token) stored in the macOS Keychain.

Receives events at `POST /ingest` (generic) and at module-specific paths (`/kopia`, `/ingest/unifi`, `/uptime-kuma`).

**See also**: Chapter 8.2 (Ingestion and tokens), Chapter 10.2 (Generic webhook).

---

### Ingestion token

A secret string used to authenticate webhook requests to Tempo's [ingestion server](#ingestion-server). Tokens are typically **per-provider** (bound at creation time to a specific `providerIdentifier`), so a leaked token can only be used to send events as the provider it's bound to — not to spoof other sources.

Stored in the macOS Keychain. Sent in the `X-Tempo-Token` HTTP header (or `Authorization: Bearer <token>` for senders that can't set arbitrary headers, like UniFi).

**See also**: Chapter 8.2 (Ingestion and tokens).

---

### Interpolation

Pulling values from an event's payload into a [custom label](#custom-label), [headline metric](#headline-metric), or [action trigger](#action-trigger) at the moment they're rendered or fired. Syntax: `${metadata.host}` for a payload field, `${title}` for the event's title, `${startDate}` for its timestamp.

If a referenced field is missing from the payload, Tempo substitutes a placeholder rather than failing — so a slightly off score still renders something useful.

**See also**: Chapter 7.4 (Presentation and custom labels), Chapter 11.2 (Field reference).

---

### Liveness

A passive signal: whether a [source](#source) has emitted at least one event within its **liveness window** (default 24 hours, configurable globally and per-source). Live sources show a bolt ⚡ icon on their priority badge in the source panel; sources silent past their threshold drop the bolt.

V1 only does passive liveness (silence detection). Active liveness (Tempo pinging the upstream tool to verify it's reachable) is on the V1.1+ roadmap.

**See also**: Chapter 4.2 (Liveness signal), Chapter 8.4 (Maintenance → Liveness).

---

### Manage Sources

A separate view that replaces the source panel's normal contents, accessed via the button at the top of the source panel. From Manage Sources you can: add a new source, reorder existing ones, edit per-source settings (display name, group membership, auto-dismiss override, liveness override), or remove a source entirely.

The button label adapts to your current source count: "Get started — add a source" / "Add a source" / "Manage sources".

**See also**: Chapter 4 (Source panel).

---

### Multi-select mode

The state when two or more events are selected in the event feed (Cmd-click toggles, Shift-click ranges from the anchor). The action panel switches to a distinct **bulk panel** with "Acknowledge all (N)" and "Dismiss all (N)" buttons, replacing the single-event detail view.

Esc clears the selection. Click an unselected event without modifiers also clears it.

**See also**: Chapter 6.2 (Multi-select mode), Chapter 6.3 (Bulk acknowledge and dismiss).

---

### Per-source auto-dismiss

A rule you set per [source](#source) that automatically [dismisses](#dismissed) events from that source after a configurable time window. Useful for noisy sources where each event is informational and not worth keeping in the active feed for long.

Configured in Settings → Maintenance → Auto-dismiss. Doesn't delete the events — they stay in source history.

**See also**: Chapter 8.4 (Maintenance settings).

---

### Provider

The system or category an event came from — Kopia, UniFi, Home Assistant, a custom webhook. Identified by a string like `com.kopia` or `com.ubiquiti.unifi.network`. One provider can host multiple [sources](#source) (e.g., several Kopia repositories all reporting under `com.kopia`). Some brand families act as umbrellas: `com.ubiquiti.unifi` covers `com.ubiquiti.unifi.network` and `com.ubiquiti.unifi.protect` as siblings under a single **UniFi** parent row, leaving room for future Talk / Access / Connect / InnerSpace siblings.

Each provider typically has one canonical [score](#score), though you can override or extend it.

**See also**: Chapter 2.2 (Sources and providers).

---

### Score

A small JSON file that teaches Tempo about a source: how to display events from it, what severity to assign, what actions to offer when an event is clicked, how to group similar events. Think of it as the recipe a [provider](#provider) follows when an event comes in.

Tempo ships with [bundled scores](#bundled-score) for common sources. You can edit them, write your own from scratch, or install community-contributed scores from the public catalog. The score is the canonical configuration surface between raw payload and what you see and do.

**See also**: Chapter 2.3 (Scores), Chapter 7 (Score Editor), Chapter 11 (Score authoring).

---

### `.tempo-score` file

A score file with a custom file extension that triggers a one-click install flow. Double-clicking a `.tempo-score` file opens Tempo's **Score Review Sheet** — a preview of what's about to be installed (provider identifier, display name, colour, rules, default actions) — and an Install button.

Used for distributing community-contributed scores via the public catalog at [github.com/caereforge/tempo-scores](https://github.com/caereforge/tempo-scores). Functionally identical to a `.json` score file, but the extension makes the install flow friction-free.

**See also**: Chapter 11.5 (`.tempo-score` installer file).

---

### Severity

A semantic label on each event: `info`, `ok`, `warning`, `error`, or `critical`. Drives the colouring of cards, badges, and the heatmap. Assigned by the [score](#score) for the source — not a property the upstream tool sets directly.

`info` and `ok` are quiet (green or no colour). `warning` is yellow. `error` and `critical` are red. The exact mapping is configurable per score via [severity rules](#severity-rule).

**See also**: Chapter 2.5 (Severity, state, acknowledgment, dismissal).

---

### Severity rule

A pattern inside a [score](#score) that matches against fields in an incoming event payload and assigns a [severity](#severity) (and optionally a [custom label](#custom-label) and a colour override) when it matches. Rules are evaluated top-to-bottom; the first match wins.

Example: a UniFi score might have a rule that matches `alarmKey == STA_ASSOC_FAILURE` and assigns severity `warning` with the custom label "Connection failed".

**See also**: Chapter 7.3 (Severity rules), Chapter 11.3 (Severity rule syntax).

---

### Source

A single stream of events from a [provider](#provider). One Kopia repo is one source; one UniFi controller is one source; one Home Assistant instance is one source. Distinguished from provider when a single provider hosts multiple distinct streams.

Sources appear as rows in the source panel. You can hide a source, set per-source auto-dismiss, change its colour, and view its history.

**See also**: Chapter 2.2 (Sources and providers), Chapter 4 (Source panel).

---

### Source history view

A separate visualisation, accessed from the source actions menu (the "i" icon next to a source row → "Show history"), that displays activity for that single source over the past 84 days as a GitHub-contribution-style grid. Each cell is one day, coloured by activity volume + max severity.

The full event database keeps everything indefinitely — the 84-day window is what this view renders, not what Tempo retains.

**See also**: Chapter 4.4 (Source actions menu).

---

### Stack

A cluster of related events shown as a single card with a count badge instead of N separate cards. Stacking is driven by the [score](#score) — each score declares which payload fields define "relatedness" and a [grouping window](#grouping-window) inside which the stacking applies.

Click a stack to expand it into individual events. Use the dismiss-all footer at the bottom of an expanded stack to clear the whole cluster in one action.

**See also**: Chapter 2.6 (Stack and grouping), Chapter 5.4 (Stacked events).

---

### State (firing / resolved)

For events from sources that report ongoing conditions (like Uptime Kuma monitors or Home Assistant alarms), Tempo tracks whether the condition is currently *firing* (active problem) or *resolved* (cleared). The card surfaces this in colour and meta-text.

Stateful behaviour requires the source to send updates with a stable [externalID](#externalid) so Tempo can recognise updates as belonging to the same condition.

**See also**: Chapter 2.5 (Severity, state, acknowledgment, dismissal).

---

*Glossary draft 2026-05-04. Living doc — refined as the rest of the User Guide is written. Add a term whenever a chapter introduces a new one and there isn't already an entry.*
