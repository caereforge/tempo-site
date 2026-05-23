---
title: "Umbrella sources: one score, many senders"
description: "Some sources in Tempo aren't a single row — they're a family. Scripts, Hazel, UniFi: one parent score covers every sub-source underneath. Here's how it works and how to use it."
pubDate: 2026-05-23
tags: ["scores", "how-to", "design"]
---

*📅 May 23, 2026 · Tempo 1.0.6 · Leo from Caereforge*

Most sources in Tempo are straightforward. Kopia is Kopia. Uptime Kuma is Uptime Kuma. One sender, one score, one row in the source panel.

But some sources are families. UniFi covers Network and Protect — very different signals under one vendor. Hazel can watch folders for new files, react to downloads, or pick up messages that a Mail.app rule exported to a folder. Scripts is a single banner over every Bash, Python, or AppleScript one-liner you point at Tempo. For these, one score per sender would be tedious and redundant. You'd end up maintaining dozens of nearly-identical JSON files that differ only in name.

That's what umbrella sources solve.

## The idea

An umbrella source is a single score that covers a whole family of senders. The score file lives at the parent level — `scripts.json`, `com.noodlesoft.hazel.json`, `com.ubiquiti.unifi.json` — and every sender whose provider identifier starts with that prefix inherits the parent's configuration automatically.

Three umbrellas ship out of the box:

| Umbrella | Example senders |
|---|---|
| **Scripts** | `scripts.shell.check_disk`, `scripts.python.sensor_poll` |
| **Hazel** | `com.noodlesoft.hazel.mail`, `com.noodlesoft.hazel.scanner` |
| **UniFi** | `com.ubiquiti.unifi.network`, `com.ubiquiti.unifi.protect` |

In the source panel, each sender still gets its own row — you see Shell, Python, Mail, Scanner as distinct sub-sources. But in the Score Editor, there's one score. The parent defines the severity rules, the action buttons, and the grouping policy. Every child inherits all of it.

## How the resolution works

When Tempo receives an event, it looks for a score matching the event's provider identifier. The lookup walks up the dot-separated hierarchy until it finds a match:

1. Look for `scripts.shell.check_disk.json` — not found.
2. Drop the last segment: look for `scripts.shell.json` — not found.
3. Drop again: look for `scripts.json` — found. Use it.

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

This makes `backup_check` events with keyword `Failed` render as critical, while a `disk_usage` event with keyword `OK` renders as green — same score, different presentation.

**Conditional actions (new in 1.0.5).** Individual severity rules can now carry their own action buttons. A critical match can surface an SSH button that a routine OK match doesn't show:

```json
{
  "match": { "keyword": "Critical" },
  "severity": "critical",
  "actions": [
    { "label": "SSH to host", "trigger": { "openURL": "ssh://${metadata.host}" } }
  ],
  "actionsMode": "extend"
}
```

The `"extend"` mode adds these buttons alongside the score's default actions. Use `"replace"` to show only the rule-specific buttons when that rule matches.

**Grouping.** The `grouping` array controls how events stack in the timeline. Hazel groups by `["${metadata.rule}", "${metadata.folder}"]`, so events from the same rule acting on the same folder collapse into one row. Scripts groups by `["${metadata.script_name}"]`.

## What requires a separate score

A few things live at the score level and apply uniformly to every sub-source under the umbrella:

- **Card colour.** The tint of event cards comes from the score's top-level `color` field. Sub-sources that share an umbrella share the colour today. Per-sub-source colour overrides from the source panel are planned for a future release.
- **Display name and default actions.** One `displayName`, one `defaultActions` array per score file.

If you need a specific sub-source to look visually distinct right now, drop a dedicated score file for it (see the escape hatch below). For severity, badge, and conditional actions, the umbrella score's `severityRules` with metadata matching already covers per-sub-source differentiation without extra files.

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

For umbrellas with many senders — Scripts especially — one token at the parent level is the practical choice. For umbrellas with two or three well-known children — UniFi Network and Protect — a token per child is worth the extra minute in Settings.

## Writing your own umbrella

You're not limited to the bundled umbrellas. Any score becomes an umbrella the moment a sender POSTs with a provider identifier that extends the score's own identifier:

1. Write `com.example.mystack.json` with your preferred colour, rules, and actions.
2. Have your senders POST as `com.example.mystack.web`, `com.example.mystack.api`, `com.example.mystack.worker`.
3. Each sender appears as its own sub-source in the panel, all inheriting the parent score.

No special flag, no configuration — the prefix hierarchy is implicit. If the identifiers share a prefix and a score exists at that prefix, you have an umbrella.

## Further reading

- **[What to type when Tempo asks for a provider](/blog/provider-identifiers-explained/)** covers the full provider identifier system, including the bundled source table and naming conventions.
- **[Why we call them scores](/blog/why-we-call-them-scores/)** explains the score concept and lists every score shipping at launch.
- **User Guide §11 — Score authoring** is the field-by-field spec: [/docs/score-authoring/](/docs/score-authoring/)

Leo from [Caereforge](https://caereforge.com)
