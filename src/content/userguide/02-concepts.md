---
title: "Concepts"
description: "The vocabulary Tempo uses (events, sources, providers, scores, severity, acknowledgment, dismissal) and what each one means and how they relate."
chapter: 2
order: 2
draft: false
pubDate: 2026-05-05
---
# 2 - Concepts

> If you came in from chapter 1 and the words *score*, *severity*, *stack* feel abstract, this chapter is for you. It defines the vocabulary Tempo uses and explains how the parts relate.
>
> If you'd rather start hands-on and pick up the concepts as you go, skip to [chapter 3 - Getting started](/docs/03-getting-started). You can always come back. Each concept here links to the chapter that goes deeper.

---

## 2.1 - Events

The atomic unit Tempo deals with is the **event**.

An event is a thing that happened, captured at a point in time, with enough metadata for Tempo to display it and offer you something useful to do about it. A backup that completed is an event. A monitor that fired an alert is an event. A reminder that came due is an event. A script that printed "done" is an event.

Every event has a small set of mandatory fields:

- **Title**: the human-readable label that shows in the timeline
- **Timestamp**: when the event happened (or, for stateful events, when the underlying state changed)
- **Provider identifier**: which system the event came from, like `com.kopia` or `com.unifi`
- **Event type**: one of `alert`, `event`, `task`, `reminder`. Affects rendering and a couple of UI behaviors
- **Payload metadata**: a flexible dict of fields the upstream tool sent (hostname, file size, IP address, status code, whatever)

Events also have fields Tempo manages itself: severity, state, acknowledgment timestamps, ID. You don't usually think about these. (Whether an event "needs attention" isn't a stored field: Tempo computes it from state, severity, and whether you've acknowledged or dismissed it.)

> 💡 **Note**: an event isn't the same thing as the underlying thing-that-happened. If your Kopia backup runs every night, the backup itself is a process; the event is the *record* of that process completing (or failing) that Kopia sends to Tempo. Events are records, not the things they describe.

**Where to learn more**: [chapter 5 - Event panel](/docs/05-event-panel) covers how events render in the UI; [glossary entry for event](/docs/14-glossary#event) is the quick reference.

---

## 2.2 - Sources and providers

Tempo uses two related but distinct words: **source** and **provider**.

A **provider** is a category of system: Kopia (backup), UniFi (network + cameras), Home Assistant (home automation), Uptime Kuma (monitoring), GitHub Actions (CI). Each provider has a unique identifier, conventionally in reverse-DNS form: `com.kopia`, `com.ubiquiti.unifi.network`, `com.uptime-kuma`, `com.home-assistant`.

Most providers stand alone: one provider, one row. Two patterns put more than one row under a shared parent, and they work differently:

- **Umbrella sources** fan a single provider out into as many sub-sources as *you* invent, by posting under a dotted identifier. **Scripts** and **Hazel** are the two umbrellas. Post under `scripts.shell.backup` and `scripts.shell.disk` (or `com.noodlesoft.hazel.email` and `com.noodlesoft.hazel.scanner`) and each dotted suffix becomes its own row under the parent, all covered by one score and accepted by one token. The suffixes are yours; Tempo doesn't predefine any. See the tip [Split one source into sub-sources](/tips/split-into-sub-sources).
- **Semantic grouping** is a fixed, code-defined folder, purely for visual tidiness. There are two today. **UniFi** files `com.ubiquiti.unifi.network` and `com.ubiquiti.unifi.protect`, two distinct providers each emitted by its own module, under a single **UniFi** row so they read as one product. **Apple Calendar & Reminders** files your Calendar entries and Reminders under one row. Unlike an umbrella, you can't invent new children here: each set is fixed and defined in code (UniFi: Network + Protect; Apple: Calendar + Reminders).

A **source** is one specific instance of a provider. You might have:

- Three Kopia repositories backing up different folders → three sources, all under provider `com.kopia`
- One UniFi controller and a Protect camera stack on the same hardware → two sources, one under `com.ubiquiti.unifi.network` and one under `com.ubiquiti.unifi.protect`, grouped under a single **UniFi** parent row
- Two Home Assistant instances (main house and cottage) → two sources under provider `com.home-assistant`

In the source panel (the leftmost column in Tempo), each source gets its own row. Click a source to filter the timeline to events from that source only.

The provider/source distinction matters because:

1. The **score** (see §2.3) is defined per *provider*, not per source. All your Kopia repos use the same Kopia score: same display logic, same actions, same severity rules
2. **Sources can be hidden, soloed, or colored individually**. You might mute one noisy Kopia repo while keeping the other two visible
3. Source-level customization (custom display name, custom color, per-source auto-dismiss) lives at the source level

> 🛠 **Tip**: if you have a vendor that sells multiple distinct products, the convention is one provider with a `sourceGroup` metadata field distinguishing products, rather than one provider per product. For example, Synology has DSM (NAS), Surveillance Station, and various others, all under provider `com.synology` with `sourceGroup: "DSM"`, `sourceGroup: "SurveillanceStation"`, etc.

**Where to learn more**: [chapter 4 - Source panel](/docs/04-source-panel) covers the UI; [glossary entries for source and provider](/docs/14-glossary#provider) are the quick reference.

---

## 2.3 - Scores

The word **score** is borrowed from music. A musical score tells the orchestra what notes to play, when, and how loud. A Tempo score tells Tempo what an event from a provider should look like, what severity to assign, and what actions to offer when you click on it.

Concretely, a score is a small JSON file. Here's a simplified slice of the Kopia score:

```json
{
  "providerIdentifier": "com.kopia",
  "displayName": "Kopia",
  "color": "#30D158",
  "severityRules": [
    { "match": { "outcome": "error" },   "severity": "error",   "label": "Backup Failed" },
    { "match": { "outcome": "warning" }, "severity": "warning", "label": "Backup Warning" },
    { "match": { "outcome": "ok" },      "severity": "ok",      "label": "Backup OK" }
  ],
  "defaultActions": [
    { "label": "Open repo", "trigger": { "openURL": "${metadata.repoUrl}" } }
  ]
}
```

When a Kopia event arrives at Tempo, this score:

1. Tags it with the color `#30D158` (green) for the source badge
2. Looks at the payload's `outcome` field and assigns severity + a custom label accordingly
3. Builds the action button "Open repo" using the `repoUrl` from the payload

Scores live as files in `~/Library/Application Support/Tempo/Scores/`. Tempo loads them at launch and reloads automatically when files change. You can edit a bundled score (Tempo ships with twenty and growing: UniFi, Kopia, Uptime Kuma, Home Assistant, GitHub Actions, the *arr stack, Synology, Hazel, Apple Shortcuts, and more), drop in a community score from the [public catalog](https://github.com/caereforge/tempo-scores), or write your own from scratch. Apple Calendar and Reminders are separate: they ride on a built-in EventKit provider, not on a score JSON file.

The score system is the canonical configuration surface between raw payload and what you see and do in Tempo. If you want Tempo to react differently to a source (colors, labels, action buttons), the answer is almost always "edit the score."

> 💡 **Note**: scores are the V1 way to customize Tempo. We ship a [Score Editor UI](/docs/07-score-editor) (chapter 7) that covers severity rules, presentation, and grouping for hands-on editing without touching JSON. The Score Editor's **Actions** tab lets you add, edit, and reorder the buttons themselves; see [§7.6](/docs/07-score-editor#76---actions). The score JSON stays a valid alternate surface if you prefer to edit it by hand.

**Where to learn more**: [chapter 7 - Score Editor](/docs/07-score-editor) for hands-on editing; [chapter 11 - Score authoring](/docs/11-score-authoring) for the full JSON reference; [glossary entry for score](/docs/14-glossary#score).

---

## 2.4 - Actions

Every event in Tempo can carry a set of **actions**: buttons that do something useful when clicked. The action set is declared in the source's score; click an event in the timeline and the action panel on the right shows the buttons.

In v1, a score can declare three action trigger types:

- **Open URL** (`openURL`): opens a URL whose scheme is on Tempo's allowlist. Examples: `https://...` (browser), `ssh://admin@10.0.1.42` (Terminal SSH), `obsidian://open?vault=...` (Obsidian deep link), or another allowlisted app scheme (Slack, Things, Todoist, VS Code, Zoom…). Schemes outside the allowlist are blocked at click time
- **Open Terminal with command** (`openTerminalWith`): opens Terminal.app and runs the specified command
- **Copy to clipboard** (`copyToClipboard`): copies a string to the system clipboard

Each trigger can use **interpolation** to pull values from the event payload at click time. Syntax: `${metadata.host}` for a payload field, `${title}` for the event's title, `${startDate}` for its timestamp.

A typical UniFi event might offer these actions:

- **Open dashboard** → `openURL: https://${metadata.controllerIP}:8443/`
- **SSH to AP** → `openURL: ssh://admin@${metadata.deviceIP}`
- **Copy MAC** → `copyToClipboard: ${metadata.clientMac}`
- **Ping client** → `openTerminalWith: ping ${metadata.clientIP}`

Click any one and Tempo resolves the interpolation, then dispatches the action.

Actions in v1 are **always user-triggered**. Tempo never fires an action on its own. v2 will extend this with auto-firing rules (the user defines conditions, Tempo runs the action automatically), but v1 keeps the human in the loop.

> 🛑 **Critical**: actions you write yourself can do anything those three trigger types can do. `openTerminalWith` runs a shell command, so be careful with payload-interpolated content from untrusted sources, since a compromised upstream tool could craft a payload that injects a malicious command. Treat payloads from your LAN as you treat any LAN-reachable input: verify the source, use per-provider tokens, audit unexpected events.

**Where to learn more**: [chapter 6 - Action panel](/docs/06-action-panel) for UI; [chapter 11.4 - Action triggers reference](/docs/11-score-authoring#114---action-triggers-reference) for trigger syntax.

---

## 2.5 - Severity, state, acknowledgment, dismissal

These four words together describe how Tempo characterizes and manages events through their lifecycle.

### Severity

Every event gets a **severity** label. The five values, from quietest to loudest:

| Severity | Meaning | Default color |
|---|---|---|
| `info` | Informational, no action needed | blue |
| `ok` | Positive outcome (a backup succeeded, a probe is up) | green |
| `warning` | Something you should look at, not urgent | yellow |
| `error` | Something failed, attention needed | orange |
| `critical` | Urgent, immediate action recommended | red |

Severity is **assigned by the score**, not by the upstream tool directly. The same Kopia "outcome=error" payload can be severity `error` in one user's score and severity `critical` in another's, depending on how that user calibrated their thresholds.

### State (firing / resolved)

Some sources report **stateful** conditions: Uptime Kuma monitors that go down then come back up, Home Assistant alarm sensors that trip then clear. For these, Tempo tracks whether the condition is currently *firing* (active problem) or *resolved* (cleared).

State is shown in color and meta-text on the row. A monitor that's currently down shows in red with "DOWN" meta-text; once it's back up, the same row updates to green with "UP" or "RESOLVED."

For stateful behavior to work, the upstream source must send updates with a stable `externalID` (so Tempo recognizes updates as belonging to the same condition). The bundled scores for Uptime Kuma and Home Assistant handle this for you.

### Acknowledgment

When an event is shown in the feed, you can **acknowledge** ("ack") it: a user action meaning "I've seen this, I'm leaving it in the feed for now." The card stays visible but its appearance softens (the title becomes lighter, the severity meta-text gets an outlined "Acked" pill) so it stops competing for your attention.

Ack is reversible. Click the same button again to unack. Or use multi-select to ack many at once.

### Dismissal

**Dismissing** removes the event from the active feed entirely. The event isn't deleted from the database (you can still find it via source history), but it stops appearing in the main timeline.

Dismissing is the right move for events you've handled and don't want cluttering your view. Acking is the right move for events you've *seen* but want to leave visible (perhaps because the underlying condition isn't resolved yet). Both can be reversed.

You can also configure **per-source auto-dismiss**: events from a chosen source automatically dismiss after a configurable time window. Useful for noisy informational sources where each event is fine but you don't want them lingering.

> 💡 **Note**: ack and dismiss are user-side state. They don't write back to the source app. Tempo doesn't tell Kopia "the user has seen this backup result" or tell Kuma "the user has acknowledged this monitor outage." They only affect Tempo's local view.

**Where to learn more**: [chapter 5.3 - Acknowledged events](/docs/05-event-panel#53---acknowledged-events); [chapter 8.4 - Maintenance settings](/docs/08-settings-reference#84---maintenance) for auto-dismiss; [glossary entries](/docs/14-glossary#severity).

---

## 2.6 - Stack and grouping

Some sources are chatty. A Uptime Kuma monitor that's down doesn't send one alert and stop; it re-notifies every 60 seconds. A Home Assistant alarm in a fault loop can send 30 events in five minutes. A Hazel rule processing a folder full of files generates a stream of "moved" events.

Without help, these would flood the feed with near-duplicate rows.

Tempo's answer is **stacking**: a cluster of related events shown as a single row with a count badge instead of N separate rows. Click a stack to expand it; the dismiss-all footer at the bottom lets you clear the whole cluster in one action.

Stacking is driven by the score. With the `grouping` primitive, a score declares two things:

1. **What "related" means**: the `grouping` key. A score has **exactly one** grouping, but it's written as an **ordered list of templates**, and Tempo uses the **first one that fully resolves** for a given event (every `${...}` field it names must be present in that event's payload). Order *is* the logic: put the most specific template first and a general fallback last. The Kopia score groups by `${metadata.repo}/${metadata.path}`; the Synology score groups by `${metadata.hostname}/${metadata.subject}`, falling back to `${metadata.hostname}` when an event carries no subject. Events whose chosen template resolves to the same value get clustered
2. **A grouping window**: a `groupingWindow` like `1h` or `6h` or `1d` defines how long a stack stays "open" to absorb new events. After the window closes, the next matching event starts a fresh stack

A simplified slice of the Synology grouping config:

```json
"grouping": ["${metadata.hostname}/${metadata.subject}", "${metadata.hostname}"],
"groupingWindow": "6h"
```

This says: events get clustered by `hostname/subject`; if `subject` is missing from the payload, fall back to grouping by `hostname` alone; new events are absorbed into the stack for six hours.

The result: instead of seven separate rows for seven Synology notifications about the same host in six hours, you see one stack with the count "7" and the latest notification on top.

Some scores use a richer `groupingRules` form instead of the `grouping` primitive. UniFi and Uptime Kuma use it: rather than a fixed template, `groupingRules` opens and closes stacks based on event content (for example, a Kuma `DOWN` event opens a stack that the matching `UP` event closes). The full reference is in [chapter 11 - Score authoring](/docs/11-score-authoring).

> 🛠 **Tip**: stacking is per-source by design. Events from different sources never cluster together, even if their grouping keys happen to collide. This keeps source identity preserved in the feed.

> 💡 **Note**: grouping is configured per-score, in the Score Editor's Stack grouping section. If you find a source generates too many rows, check whether its score declares grouping. If it doesn't, you can add one, or pick a smaller grouping window if it does and you want stacks to close more aggressively.

> 💡 **Note**: in v1 each score carries a **single, built-in stacking criterion**: the grouping key and window come preconfigured with the score, not from some app-wide setting. For template scores you can edit that key and window in the Score Editor, so "built-in" doesn't mean "fixed". What you *can't* do yet is run several stacking criteria in parallel or author fully custom multi-stacking; user-defined multi-stacking is planned for a later version.

**Where to learn more**: [chapter 5.4 - Stacked events](/docs/05-event-panel#54---stacked-events) for UI; [chapter 7.5 - Stack grouping](/docs/07-score-editor#75---stack-grouping) for editor.

---

## Where to go from here

If the concepts feel solid:

- Hands-on: [chapter 3 - Getting started](/docs/03-getting-started)
- Customization: [chapter 7 - Score Editor](/docs/07-score-editor)
- Adding a source you don't have bundled: [chapter 10 - Sources reference](/docs/10-sources-reference)

If a concept didn't quite land, the [glossary](/docs/14-glossary) has tighter one-paragraph definitions for each term used here. Open it in a separate tab and use it as a quick lookup while you read the rest of the guide.
