---
title: "Umbrella sources: one score, many senders"
description: "Scripts and Hazel are umbrellas: one parent score covers every sub-source underneath. How that works, how deep it goes, and how it differs from UniFi grouping."
pubDate: 2026-05-23
tags: ["scores", "how-to", "design"]
---

*📅 May 23, 2026 · Updated for Tempo 1.1 · Leo from Caereforge*

Most sources in Tempo are straightforward. Kopia is Kopia. Uptime Kuma is Uptime Kuma. One sender, one score, one row in the source panel.

But some sources are families: one configuration that fits a whole group of related senders. Hazel can watch folders for new files, react to downloads, or pick up messages that a Mail.app rule exported to a folder. Scripts is a single banner over every Bash, Python, or AppleScript one-liner you point at Tempo. For these, one score per sender would be tedious and redundant: you'd end up maintaining dozens of nearly-identical JSON files that differ only in name.

That's what umbrella sources solve.

## Provider identifiers are namespaces

Every source in Tempo is named by a **provider identifier**: a dotted, reverse-DNS string like `com.noodlesoft.hazel` or `scripts.shell.check_disk`. Read left to right, those dots are a hierarchy: a namespace, then progressively more specific names inside it. `com.noodlesoft` is Noodlesoft; `com.noodlesoft.hazel` is their app Hazel; `com.noodlesoft.hazel.mail` is one particular kind of Hazel event.

That hierarchy is the whole trick. An **umbrella source is a single score placed at a namespace prefix**, and every sender whose identifier sits *underneath* that prefix inherits the score automatically. The file lives at the parent level (`scripts.json`, `com.noodlesoft.hazel.json`), and `scripts.shell.check_disk`, `scripts.ruby.deploy`, `com.noodlesoft.hazel.mail` all fall under it.

Tempo has **exactly two** umbrellas, and that's deliberate:

| Umbrella | Example senders |
|---|---|
| **Scripts** | `scripts.shell.check_disk`, `scripts.ruby.deploy` |
| **Hazel** | `com.noodlesoft.hazel.mail`, `com.noodlesoft.hazel.downloads` |

They're the two sources where a single configuration genuinely fits a whole family of senders you create yourself. Everything else is a single source, or a vendor *container* (more on that next). You don't turn an arbitrary namespace into a third umbrella.

## Umbrella vs. a vendor grouping

Sharing a namespace does **not** make something an umbrella. The test is one question: *is there a score at the parent?*

- An **umbrella** has a score at the parent identifier (`scripts.json`, `com.noodlesoft.hazel.json`). One configuration, and every sender beneath it inherits that one score.
- A **semantic container** has *no* score at the parent: the parent is only a grouping label. UniFi is the example: there is no `com.ubiquiti.unifi` score. There are two independent scores, `com.ubiquiti.unifi.network` and `com.ubiquiti.unifi.protect`, each with its own color, rules, and actions. The panel *displays* them under a shared **UniFi** heading because they share the namespace. Apple (Calendar, Reminders) and CalDAV (one child per configured provider) are containers too.

So: umbrella = **one** score for many senders; container = **many** scores that happen to share a family name. Both look like a tidy group in the panel; only the umbrella has a single config behind it.

## How the resolution works

When an event arrives, Tempo finds its score by walking up the namespace until it hits one that exists. For `scripts.shell.check_disk`, with only the bundled `scripts` score installed:

1. Is there a score for `scripts.shell.check_disk`? No.
2. Drop a segment, a score for `scripts.shell`? No.
3. Drop again, a score for `scripts`? Yes. Use it.

The **nearest ancestor that has a score wins**. Install a `scripts.shell` score and step 2 would stop there instead; with nothing but `scripts`, everything beneath it lands on the umbrella. (These are lookups against the scores already loaded in memory, not a filesystem search on every event.) The pattern is the same however deep the identifier goes.

## One level deep, and why

Resolution spans any depth, but the **source list nests exactly one level** under an umbrella. Under Scripts you get a row per first segment: `scripts.shell` is **Shell**, `scripts.ruby` is **Ruby**, `scripts.go` is **Go**, whatever you name it. Anything deeper rolls up into that row: `scripts.ruby.deploy` and `scripts.ruby.migrate` both live under **Ruby**. Hazel works the same way, so `com.noodlesoft.hazel.mail`, `com.noodlesoft.hazel.downloads` become **Mail**, **Downloads**.

Why cap it at one level? Because one level lets you split a source *logically* (your shell checks apart from your Python pollers, your Mail rules apart from your download rules) without letting a deep or auto-generated identifier sprout a tree of rows the source list could never sensibly hold. **Breadth is your call** (make thirty sub-sources if you like); **depth is fixed at one** so the list stays readable and Tempo's current UI can manage it.

## What shows where

The one-level name is what you see in the two busy surfaces; the specific sub-name is kept for when you actually want it:

- **Source panel** (left): the umbrella, then one row per first-level sub-source: Ruby, Shell, Mail.
- **Live feed**: each event is labeled with that same first-level name. `scripts.ruby.deploy` reads **Ruby**, matching the panel; the deep tail never leaks into the feed.
- **Action panel** (open an event): the specific sub-name (**Deploy**, **Migrate**) so you still see exactly which script or rule fired.

## What the parent controls

A single umbrella score gives you quite a lot of control over how different senders behave, without needing separate score files:

**Severity rules with metadata matching.** The `severityRules` array can match on any metadata field. The bundled Scripts score keys off `metadata.label`, the word your script reports, to pick a severity:

```json
{ "match": { "label": "Critical" }, "severity": "error", "label": "Critical" }
```

A script that reports `label: "Critical"` renders red; one that reports `label: "OK"` renders green: same score, different presentation, driven entirely by what the sender puts in the payload.

**Per-match labels and styling.** A matching rule does more than set severity: it can override the badge `label`, the card `title` and `subtitle`, and tint the badge with its own `color`, all per match. One score dresses a failed check and a routine one into two distinct, readable cards:

```json
{
  "match": { "label": "Critical" },
  "severity": "critical",
  "label": "Needs attention",
  "color": "#E74C3C"
}
```

**Actions that show themselves only when they apply.** Action buttons live at the score level (`defaultActions`) and reach every sub-source, but a button whose `${metadata.xxx}` template doesn't resolve is hidden automatically. An "SSH to host" button keyed on `${metadata.host}` appears only on events that actually carry a host, and stays out of the way everywhere else.

**Grouping.** The `grouping` template controls how events stack in the timeline. The Scripts score groups by `${metadata.script_name}`, so repeated runs of the same script collapse into one row; Hazel groups by its run and rule, so a burst of files moved by one rule reads as a single entry.

## What requires a separate score

A few things live at the score level and apply uniformly to every sub-source under the umbrella:

- **Card color.** The tint of event cards comes from the score's top-level `color` field. Sub-sources under one umbrella share the color today.
- **Display name and default actions.** One `displayName`, one `defaultActions` array per score file.

If you need a specific sub-source to look visually distinct, drop a dedicated score file for it (the escape hatch below). For severity, badge text, and styling, the umbrella score's `severityRules` with metadata matching already covers per-sub-source differentiation without extra files.

## The escape hatch

Drop a more specific score file alongside the umbrella, and it wins for that sender only:

```
~/Library/Application Support/Tempo/Scores/
  scripts.json                    ← umbrella (catches everything)
  scripts.shell.disk_check.json   ← override (just for this one script)
```

Events from `scripts.shell.disk_check` use the override; events from every other `scripts.*` sender still fall through to the umbrella. You get per-source customization exactly where you need it, without maintaining a score file for every sender. This refines a child *inside* one of the two umbrellas; it doesn't create a new one.

The same works for Hazel: drop `com.noodlesoft.hazel.mail.json` next to `com.noodlesoft.hazel.json` and Mail-rule events get their own color and actions while everything else Hazel-driven stays on the parent's defaults.

## Tokens bind to the namespace too

A token is **always bound to a provider identifier**; there are no generic, anything-goes tokens. An unbound token authorizes *nothing*. What a bound token covers follows the same namespace logic as scores: a token bound to `scripts` authorizes every `scripts.*` sender; a token bound to `scripts.shell` authorizes `scripts.shell` and what's beneath it, but not `scripts.ruby`. It never reaches a sibling, and never reaches the parent.

So the binding depth is a security dial. Bind a token at the umbrella (`scripts`) for convenience when one process drives many sub-sources; bind it deep (`scripts.shell.disk_check`) to keep the blast radius tiny if that one token ever leaks. (It also means a new sub-source under a narrowly-bound token needs its own token: `scripts.shell` can't post as `scripts.ruby`.)

## Further reading

- **[What to type when Tempo asks for a provider](/blog/provider-identifiers-explained/)** covers the full provider identifier system, including the bundled source table and naming conventions.
- **[Why we call them scores](/blog/why-we-call-them-scores/)** explains the score concept and lists every score shipping at launch.
- **User Guide §11, Score authoring** is the field-by-field spec: [/docs/11-score-authoring/](/docs/11-score-authoring/)

Leo from [Caereforge](https://caereforge.com)
