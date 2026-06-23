---
title: "Umbrella sources: one score, many senders"
description: "Some sources in Tempo aren't a single row, they're a family. Scripts, Hazel, UniFi: one parent score covers every sub-source underneath. Here's how it works and how to use it."
pubDate: 2026-05-23
tags: ["scores", "how-to", "design"]
---

*📅 May 23, 2026 · Tempo 1.0.6 · Leo from Caereforge*

Most sources in Tempo are straightforward. Kopia is Kopia. Uptime Kuma is Uptime Kuma. One sender, one score, one row in the source panel.

But some sources are families: one configuration that fits a whole group of related senders. Hazel can watch folders for new files, react to downloads, or pick up messages that a Mail.app rule exported to a folder. Scripts is a single banner over every Bash, Python, or AppleScript one-liner you point at Tempo. For these, one score per sender would be tedious and redundant — you'd end up maintaining dozens of nearly-identical JSON files that differ only in name.

That's what umbrella sources solve.

## Provider identifiers are namespaces

Every source in Tempo is named by a **provider identifier** — a dotted, reverse-DNS string like `com.noodlesoft.hazel` or `scripts.shell.check_disk`. Read left to right, those dots are a hierarchy: a namespace, then progressively more specific names inside it. `com.noodlesoft` is Noodlesoft; `com.noodlesoft.hazel` is their app Hazel; `com.noodlesoft.hazel.mail` is one particular kind of Hazel event.

That hierarchy is the whole trick. An **umbrella source is a single score placed at a namespace prefix** — and every sender whose identifier sits *underneath* that prefix inherits the score automatically. The file lives at the parent level (`scripts.json`, `com.noodlesoft.hazel.json`), and `scripts.shell.check_disk`, `scripts.python.sensor_poll`, `com.noodlesoft.hazel.mail` all fall under it.

Two umbrellas ship out of the box:

| Umbrella | Example senders |
|---|---|
| **Scripts** | `scripts.shell.check_disk`, `scripts.python.sensor_poll` |
| **Hazel** | `com.noodlesoft.hazel.mail`, `com.noodlesoft.hazel.scanner` |

In the source panel, each sender still gets its own row — you see Shell, Python, Mail, Scanner as distinct sub-sources, grouped under their parent. But there's one score behind them. The parent defines the severity rules, the action buttons, and the grouping policy, and every child inherits all of it.

**Sharing a namespace doesn't *require* one umbrella score.** It's a choice. A vendor with two genuinely different products — UniFi Network and UniFi Protect, say — shares the `com.ubiquiti.unifi` namespace but ships as **two separate scores** (`com.ubiquiti.unifi.network`, `com.ubiquiti.unifi.protect`), each with its own colour, rules, and actions, still grouped visually under one **UniFi** parent in the panel. Umbrella = *one* score for many similar senders; separate scores under a shared namespace = *many* scores that just live in the same family. Both read as a tidy group; they differ in whether one configuration fits all the children or each child needs its own.

## How the resolution works

When Tempo receives an event, it looks for a score matching the event's provider identifier. The lookup walks up the dot-separated hierarchy until it finds a match:

1. Look for `scripts.shell.check_disk.json`, not found.
2. Drop the last segment: look for `scripts.shell.json`, not found.
3. Drop again: look for `scripts.json`, found. Use it.

This is prefix walking. The most specific score wins, and the parent catches everything that doesn't have a dedicated override. It's the same resolution pattern regardless of how deep the identifier goes.

## What the parent controls

A single umbrella score gives you quite a lot of control over how different senders behave, without needing separate score files:

**Severity rules with metadata matching.** The `severityRules` array can match on any metadata field. The bundled Scripts score uses `metadata.keyword` to assign severity per script type:

```json
{
  "match": { "script_name": "backup_check", "keyword": "Failed" },
  "severity": "critical",
  "label": "Backup failed"
}
```

This makes `backup_check` events with keyword `Failed` render as critical, while a `disk_usage` event with keyword `OK` renders as green, same score, different presentation.

**Per-match labels and styling.** A matching rule does more than set severity — it can override the badge `label`, the card `title` and `subtitle`, and tint the badge with its own `color`, all per match. One score dresses a `backup_check` failure and a routine `disk_usage` check into two distinct, readable cards:

```json
{
  "match": { "keyword": "Critical" },
  "severity": "critical",
  "label": "Needs attention",
  "color": "#E74C3C"
}
```

**Actions that show themselves only when they apply.** Action buttons live at the score level (`defaultActions`) and reach every sub-source — but a button whose `${metadata.xxx}` template doesn't resolve is hidden automatically. An "SSH to host" button keyed on `${metadata.host}` appears only on events that actually carry a host, and stays out of the way everywhere else.

**Grouping.** The `grouping` array controls how events stack in the timeline. Hazel groups by `["${metadata.rule}", "${metadata.folder}"]`, so events from the same rule acting on the same folder collapse into one row. Scripts groups by `["${metadata.script_name}"]`.

## What requires a separate score

A few things live at the score level and apply uniformly to every sub-source under the umbrella:

- **Card colour.** The tint of event cards comes from the score's top-level `color` field. Sub-sources that share an umbrella share the colour today. Per-sub-source colour overrides from the source panel are planned for a future release.
- **Display name and default actions.** One `displayName`, one `defaultActions` array per score file.

If you need a specific sub-source to look visually distinct right now, drop a dedicated score file for it (see the escape hatch below). For severity, badge text, and styling, the umbrella score's `severityRules` with metadata matching already covers per-sub-source differentiation without extra files.

## The escape hatch

Drop a more specific score file alongside the umbrella, and it wins for that sender only:

```
~/Library/Application Support/Tempo/Scores/
  scripts.json                    ← umbrella (catches everything)
  scripts.shell.disk_check.json   ← override (just for this one script)
```

Events from `scripts.shell.disk_check` use the override. Events from every other `scripts.*` sender still fall through to the umbrella. You get per-source customization exactly where you need it, without maintaining a score file for every sender.

The same works for any umbrella. Drop `com.noodlesoft.hazel.mail.json` next to `com.noodlesoft.hazel.json` and Mail-rule events get their own colour and actions while everything else Hazel-driven stays on the parent's defaults.

## Tokens follow the same prefix logic

When you create a token in Settings → Ingestion, the provider field uses the same prefix binding. A token bound to `scripts` authorises every `scripts.*` sender. A token bound to `scripts.shell` only authorises Shell senders. The trade-off is convenience versus blast radius if the token leaks.

For umbrellas with many senders, Scripts especially, one token at the parent level is the practical choice. For an umbrella with just a couple of well-known children, a token per child is worth the extra minute in Settings.

## Writing your own umbrella

You're not limited to the bundled umbrellas. Any score becomes an umbrella the moment a sender POSTs with a provider identifier that extends the score's own identifier:

1. Write `com.example.mystack.json` with your preferred colour, rules, and actions.
2. Have your senders POST as `com.example.mystack.web`, `com.example.mystack.api`, `com.example.mystack.worker`.
3. Each sender appears as its own sub-source in the panel, all inheriting the parent score.

No special flag, no configuration, the prefix hierarchy is implicit. If the identifiers share a prefix and a score exists at that prefix, you have an umbrella.

## How sub-sources appear in the panel

Score resolution always works by prefix walking, however deep the identifier goes — `scripts.json` catches every `scripts.*` sender regardless. How those senders *display* in the source panel is where there are still a few rough edges:

**Hazel** lets you create any sub-source freely. POST as `com.noodlesoft.hazel.invoices` or `com.noodlesoft.hazel.receipts` and each appears as its own named row under the Hazel parent. (The Apple and Shortcuts families group the same way.)

**Scripts** is more constrained. The panel groups its sub-sources by a fixed set of recognised languages — Shell, Python, AppleScript. `scripts.shell.check_disk` appears under "Shell", but a custom second segment like `scripts.backup.restic` lands under "Other" instead of getting its own "Backup" row. Resolution is unaffected; only the panel's labelling is.

**Your own umbrellas** (like `com.example.mystack`) resolve correctly via prefix walking, but their sub-sources currently render as flat rows rather than nested under a parent.

## Still on the roadmap

Tempo ships a visual Score Editor, so you can author and tune an umbrella score without ever opening JSON. Two refinements are not in yet: per-sub-source card-colour overrides (today the colour is set once per score), and source-panel grouping that derives entirely from your provider identifiers — no built-in special cases — so any namespace nests the way Hazel does. Until those land, the colour escape hatch above and the bundled families cover most needs.

## Further reading

- **[What to type when Tempo asks for a provider](/blog/provider-identifiers-explained/)** covers the full provider identifier system, including the bundled source table and naming conventions.
- **[Why we call them scores](/blog/why-we-call-them-scores/)** explains the score concept and lists every score shipping at launch.
- **User Guide §11, Score authoring** is the field-by-field spec: [/docs/11-score-authoring/](/docs/11-score-authoring/)

Leo from [Caereforge](https://caereforge.com)
