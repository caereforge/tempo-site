---
title: "Concepts"
description: "The atomic unit Tempo deals with is the **event**."
chapter: 2
order: 2
draft: false
pubDate: 2026-05-05
---
# 2 — Concepts

> If you came in from chapter 1 and the words *score*, *severity*, *stack* feel abstract, this chapter is for you. We define the small vocabulary Tempo uses, explain how the parts connect, and hand you the mental model that makes the rest of the guide make sense.
>
> If you'd rather start hands-on and pick up the concepts as you go, skip to [chapter 3 — Getting started](/docs/03-getting-started). You can always come back. Each concept here links to the chapter that goes deeper.

---

## 2.1 — Events

The atomic unit Tempo deals with is the **event**.

An event is a thing that happened, captured at a point in time, with enough metadata for Tempo to display it and offer you something useful to do about it. A backup that completed is an event. A monitor that fired an alert is an event. A reminder that came due is an event. A script that printed "done" is an event.

Every event has a small set of mandatory fields:

- **Title** — the human-readable label that shows in the timeline
- **Timestamp** — when the event happened (or, for stateful events, when the underlying state changed)
- **Provider identifier** — which system the event came from, like `com.kopia` or `com.unifi`
- **Event type** — one of `alert`, `event`, `task`, `reminder`. Affects rendering and a couple of UI behaviours
- **Payload metadata** — a flexible dict of fields the upstream tool sent: hostname, file size, IP address, status code, whatever

Events also have fields Tempo manages itself: severity, attention state, acknowledgment timestamps, ID. You don't usually think about these.

> 💡 **Note**: an event isn't the same thing as the underlying thing-that-happened. If your Kopia backup runs every night, the backup itself is a process; the event is the *record* of that process completing (or failing) that Kopia sends to Tempo. Events are records, not the things themselves.

**Where to learn more**: [chapter 5 — Event panel](/docs/05-event-panel) covers how events render in the UI; [glossary entry for event](/docs/14-glossary#event) is the quick reference.

---

## 2.2 — Sources and providers

Tempo uses two related but distinct words: **source** and **provider**.

A **provider** is a category of system — Kopia (backup), UniFi (network), Home Assistant (home automation), Uptime Kuma (monitoring), GitHub Actions (CI). Each provider has a unique identifier, conventionally in reverse-DNS form: `com.kopia`, `com.unifi`, `com.uptime-kuma`, `org.home-assistant`.

A **source** is one specific instance of a provider. You might have:

- Three Kopia repositories backing up different folders → three sources, all under provider `com.kopia`
- One UniFi controller managing your network → one source under provider `com.unifi`
- Two Home Assistant instances (main house + cottage) → two sources under provider `org.home-assistant`

In the source panel (the leftmost column in Tempo), each source gets its own row. Click a source to filter the timeline to events from that source only.

The provider/source distinction matters because:

1. The **score** (see §2.3) is defined per *provider*, not per source. All your Kopia repos use the same Kopia score — same display logic, same actions, same severity rules
2. **Sources can be hidden, soloed, or coloured individually**. You might mute one noisy Kopia repo while keeping the other two visible
3. Source-level customisation (custom display name, custom colour, per-source auto-dismiss) lives at the source level

> 🛠 **Tip**: if you have a vendor that sells multiple distinct products, the convention is one provider with a `sourceGroup` metadata field distinguishing products, rather than one provider per product. For example, Synology has DSM (NAS), Surveillance Station, and various others — all under provider `com.synology` with `sourceGroup: "DSM"`, `sourceGroup: "SurveillanceStation"`, etc.

**Where to learn more**: [chapter 4 — Source panel](/docs/04-source-panel) covers the UI; [glossary entries for source and provider](/docs/14-glossary#provider) are the quick reference.

---

## 2.3 — Scores

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

1. Tags it with the colour `#30D158` (green) for the source badge
2. Looks at the payload's `outcome` field and assigns severity + a custom label accordingly
3. Builds the action button "Open repo" using the `repoUrl` from the payload

Scores live as files in `~/Library/Application Support/Tempo/Scores/`. Tempo loads them at launch and reloads automatically when files change. You can edit a bundled score (Tempo ships with seven), drop in a community score from the [public catalog](https://github.com/caereforge/tempo-scores), or write your own from scratch.

The score system is **the canonical configuration surface** between raw payload and what you see and do in Tempo. If you want Tempo to react differently to a source — different colours, different labels, different action buttons — the answer is almost always "edit the score."

> 💡 **Note**: scores are the V1 way to customise Tempo. We ship a [Score Editor UI](/docs/07-score-editor) (chapter 7) for hands-on editing without touching JSON directly. A visual score builder is on the V2 roadmap; until then, the editor + manual JSON cover all use cases.

**Where to learn more**: [chapter 7 — Score Editor](/docs/07-score-editor) for hands-on editing; [chapter 11 — Score authoring](/docs/11-score-authoring) for the full JSON reference; [glossary entry for score](/docs/14-glossary#score).

---

## 2.4 — Actions

Every event in Tempo can carry a set of **actions** — buttons that do something useful when clicked. The action set is declared in the source's score; click an event in the timeline and the action panel on the right shows the buttons.

In v1, three action trigger types are supported:

- **Open URL** (`openURL`) — opens any URL the user's Mac knows how to handle. Examples: `https://...` (browser), `ssh://admin@10.0.1.42` (Terminal SSH), `vnc://server.local` (Screen Sharing), `obsidian://open?vault=...` (Obsidian deep link), or any custom app URL scheme
- **Open Terminal with command** (`openTerminalWith`) — opens Terminal.app and runs the specified command
- **Copy to clipboard** (`copyToClipboard`) — copies a string to the system clipboard

Each trigger can use **interpolation** to pull values from the event payload at click time. Syntax: `${metadata.host}` for a payload field, `${title}` for the event's title, `${startDate}` for its timestamp.

A typical UniFi event might offer these actions:

- **Open dashboard** → `openURL: https://${metadata.controllerIP}:8443/`
- **SSH to AP** → `openURL: ssh://admin@${metadata.deviceIP}`
- **Copy MAC** → `copyToClipboard: ${metadata.clientMac}`
- **Ping client** → `openTerminalWith: ping ${metadata.clientIP}`

Click any one and Tempo resolves the interpolation, then dispatches the action. Total time from "I see the event" to "I'm acting on it": about a second.

Actions in v1 are **always user-triggered**. Tempo never fires an action on its own. v2 will extend this with auto-firing rules (the user defines conditions, Tempo runs the action automatically), but v1 keeps the human in the loop.

> 🛑 **Critical**: actions you write yourself can do anything those three trigger types can do. `openTerminalWith` runs a shell command — be careful with payload-interpolated content from untrusted sources, since a compromised upstream tool could craft a payload that injects a malicious command. Treat payloads from your LAN as you treat any LAN-reachable input: verify the source, use per-provider tokens, audit unexpected events.

**Where to learn more**: [chapter 6 — Action panel](/docs/06-action-panel) for UI; [chapter 11.4 — Action triggers reference](/docs/11-score-authoring#114-action-triggers-reference) for trigger syntax.

---

## 2.5 — Severity, state, acknowledgment, dismissal

These four words together describe how Tempo characterises and manages events through their lifecycle.

### Severity

Every event gets a **severity** label. The five values, from quietest to loudest:

| Severity | Meaning | Default colour |
|---|---|---|
| `info` | Informational, no action needed | green / neutral |
| `ok` | Positive outcome (a backup succeeded, a probe is up) | green |
| `warning` | Something you should look at, not urgent | yellow |
| `error` | Something failed, attention needed | red |
| `critical` | Urgent, immediate action recommended | red |

Severity is **assigned by the score**, not by the upstream tool directly. The same Kopia "outcome=error" payload can be severity `error` in one user's score and severity `critical` in another's, depending on how that user calibrated their thresholds.

### State (firing / resolved)

Some sources report **stateful** conditions — Uptime Kuma monitors that go down then come back up, Home Assistant alarm sensors that trip then clear. For these, Tempo tracks whether the condition is currently *firing* (active problem) or *resolved* (cleared).

State is shown in colour and meta-text on the card. A monitor that's currently down shows in red with "DOWN" meta-text; once it's back up, the same row updates to green with "UP" or "RESOLVED."

For stateful behaviour to work, the upstream source must send updates with a stable `externalID` (so Tempo recognises updates as belonging to the same condition). The bundled scores for Uptime Kuma and Home Assistant handle this for you.

### Acknowledgment

When an event is shown in the feed, you can **acknowledge** ("ack") it: a user action meaning "I've seen this, I'm leaving it in the feed for now." The card stays visible but its appearance softens — the title becomes lighter, the severity meta-text gets an outlined "Acked" pill — so it stops competing for your attention.

Ack is reversible. Click the same button again to unack. Or use multi-select to ack many at once.

### Dismissal

**Dismissing** removes the event from the active feed entirely. The event isn't deleted from the database — you can still find it via source history — but it stops appearing in the main timeline.

Dismissing is the right move for events you've handled and don't want cluttering your view. Acking is the right move for events you've *seen* but want to leave visible (perhaps because the underlying condition isn't resolved yet). Both can be reversed.

You can also configure **per-source auto-dismiss**: events from a chosen source automatically dismiss after a configurable time window. Useful for noisy informational sources where each event is fine but you don't want them lingering.

> 💡 **Note**: ack and dismiss are user-side state. They don't write back to the source app — Tempo doesn't tell Kopia "the user has seen this backup result" or tell Kuma "the user has acknowledged this monitor outage." They only affect Tempo's local view.

**Where to learn more**: [chapter 5.3 — Acknowledged events](/docs/05-event-panel#53-acknowledged-events); [chapter 8.4 — Maintenance settings](/docs/08-settings-reference#84-maintenance) for auto-dismiss; [glossary entries](/docs/14-glossary#severity).

---

## 2.6 — Stack and grouping

Some sources are chatty. A Uptime Kuma monitor that's down doesn't send one alert and stop — it re-notifies every 60 seconds. A Home Assistant alarm in a fault loop can send 30 events in five minutes. A Hazel rule processing a folder full of files generates a stream of "moved" events.

Without help, these would flood the feed with near-duplicate cards.

Tempo's answer is **stacking**: a cluster of related events shown as a single card with a count badge instead of N separate cards. Click a stack to expand it; the dismiss-all footer at the bottom lets you clear the whole cluster in one action.

Stacking is driven by the score — each score declares two things:

1. **What "related" means** — a `grouping` template (or a list of fallback templates), like `${metadata.monitorID}` for Uptime Kuma or `[${metadata.clientMac}, ${metadata.deviceMac}]` for UniFi. Events with the same resolved value get clustered
2. **A grouping window** — a `groupingWindow` like `1h` or `6h` or `1d` defines how long a stack stays "open" to absorb new events. After the window closes, the next matching event starts a fresh stack

A simplified Kopia grouping config:

```json
"grouping": ["${metadata.repo}/${metadata.path}", "${metadata.path}"],
"groupingWindow": "1d"
```

This says: events get clustered by `repo/path` (e.g., `prod-backup/Documents`); if that path is missing from the payload, fall back to grouping by `path` alone; new events are absorbed into the stack for one day.

The result: instead of seven separate cards for seven Kopia runs of the same path in one day, you see one stack with the count "7" and the latest run on top.

> 🛠 **Tip**: stacking is per-source by design. Events from different sources never cluster together, even if their grouping keys happen to collide. This keeps source identity preserved in the feed.

> 💡 **Note**: grouping is configured per-score, in the Score Editor's Stack grouping section. If you find a source generates too many cards, check whether its score declares grouping. If it doesn't, you can add one — or pick a smaller grouping window if it does and you want stacks to close more aggressively.

**Where to learn more**: [chapter 5.4 — Stacked events](/docs/05-event-panel#54-stacked-events) for UI; [chapter 7.5 — Stack grouping](/docs/07-score-editor#75-stack-grouping) for editor.

---

## Where to go from here

If the concepts feel solid:

- Hands-on: [chapter 3 — Getting started](/docs/03-getting-started)
- Customisation: [chapter 7 — Score Editor](/docs/07-score-editor)
- Adding a source you don't have bundled: [chapter 10 — Sources reference](/docs/10-sources-reference)

If a concept didn't quite land, the [glossary](/docs/14-glossary) has tighter one-paragraph definitions for each term used here. Open it in a separate tab and use it as a quick lookup while you read the rest of the guide.
