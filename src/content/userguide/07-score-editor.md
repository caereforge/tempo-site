---
title: "Score Editor"
description: "The Score Editor is where you teach Tempo about a source."
chapter: 7
order: 7
draft: false
pubDate: 2026-05-05
---
# 7 — Score Editor

The Score Editor is where you teach Tempo about a source. Open it once and you can decide, in five minutes, what every event from a given provider should look like: its color, its severity, the headline metric it surfaces, the actions it offers, and how it groups with related events. Save, and the changes apply to the next event that arrives. No restart, no re-deploy, no JSON file you forgot to format.

This chapter walks the editor section by section. It assumes you've read [§2.3 — Scores](/docs/02-concepts#23--scores) for the conceptual framing.

> 🛠 **Tip**: the editor is the *hands-on* surface. Every score is also a JSON file you can edit by hand or contribute back to the public catalog. The editor is built so you don't *have* to touch JSON; the JSON is there if you want it. See [§11 — Score authoring](/docs/11-score-authoring) for the deeper dive.

---

## 7.1 — What a score does for you

Without a score, an event from your homelab is raw payload: a JSON blob with whatever fields the upstream tool decided to send. Tempo can still display it (title + timestamp + provider + raw metadata), but it won't know what the event *means*. Severity is unset. There's no headline metric. There are no useful actions. Repeated events from the same source don't stack. Cards look bland because the score system is the layer that *interprets* payloads.

A score answers, for one provider:

- **What's the severity of this event?** by matching against payload fields and assigning info / ok / warning / error / critical
- **What should the card show?** a custom title (using payload fields), a custom subtitle, a headline metric, a color
- **What buttons should the action panel offer?** and what URLs/commands should those buttons invoke (using payload fields again)
- **Should this event stack with related ones?** and if so, what defines "related," and how long does a stack stay open?
- **What's the source's overall identity?** its display name, its color, its icon

The editor is one form for all of these.

### Before / after

A Kopia backup payload arrives:

```json
{
  "title": "snapshot completed",
  "providerIdentifier": "com.kopia",
  "metadata": {
    "outcome": "ok",
    "target": "/Users/leo/Documents",
    "delta": "+147KB",
    "duration": "1.2s"
  }
}
```

**Without a score**, Tempo shows: a card titled "snapshot completed," no severity, no headline. The actions list is empty.

**With the bundled Kopia score**, Tempo shows: a green card with the title `Documents backed up (+147KB)`, severity `OK`, headline metric `+147KB`, subtitle `1.2s · /Users/leo/Documents`. The action panel offers: "Open repo," "Show snapshot list," "Copy snapshot ID."

The payload didn't change. The score did.

---

## 7.2 — Editor overview

The Score Editor lives as one of the **tabs in the center panel**, alongside Timeline (the default) and Search. Click the **Score Editor** tab to switch into it; click **Timeline** to switch back. The source panel on the left and the action panel on the right stay in place: the editor only takes over the center column.

A second entry point: when you double-click a `.tempo-score` file, Tempo opens a Score Review Sheet (a modal dialog) for one-click installation. That sheet is a different surface: it shows a preview of an incoming score before you install it. The Score Editor in this chapter is for editing scores you've already installed.

The editor has three regions:

```
┌─────────────────────────────────────────────────────┐
│  [Score chip bar — pick which score to edit]        │
├──────────────────────────────────────┬──────────────┤
│  [Tab bar: Source · Grouping ·       │              │
│   Severity · Tags & emoji ·          │  Try panel  │
│   Ack and dismiss · Actions]          │              │
│                                      │  (preview    │
│  Editor (one tab at a time)           │   on recent  │
│                                      │   events)    │
│                                      │              │
└──────────────────────────────────────┴──────────────┘
```

- **Score chip bar** at the top: every score Tempo knows about, click one to load it
- **Editor pane** on the left: organized into **six tabs**, one shown at a time
- **Try panel** on the right: picks a recent event from this provider and shows you what the current draft would render for it. Live preview as you edit

> ⚠️ **Try-panel caveat**: the Try panel's severity preview deliberately ignores **Sender severity wins**: it always runs your rules so you can see what they produce. With that toggle on, a live event carrying its own non-`info` severity may resolve differently than the preview shows.

The six tabs, left to right:

- **Source**: the score's overall identity: provider identifier, display name, color, and (for sources that use them) field **aliases**. This is the tab the editor opens on
- **Grouping**: whether and how related events from this provider collapse into stacks (template grouping; see §7.5)
- **Severity**: severity rules, badge labels, pill colors, presentation overrides, and the **Sender severity wins** toggle (the heart of a score; see §7.3)
- **Tags & emoji**: `indicatorRules` and `tagRules`: payload-driven emoji indicators and tags attached to matching events
- **Ack and dismiss**: `ackRules` and `dismissRules`: payload conditions that auto-acknowledge or auto-dismiss events. Any matching rule fires (logical OR across rules); when both an ack rule and a dismiss rule match the same event, **dismiss wins**
- **Actions**: the buttons the action panel offers: add, edit, remove, reorder; pick a trigger type and write its value with `${metadata.xxx}` interpolation (see §7.6)

> 💡 **Agenda scores** (Apple Calendar / Reminders, Todoist, Fastmail and other `surface: "agenda"` sources) show only the **Source** and **Actions** tabs: the severity/grouping/tag/ack machinery doesn't apply to a day-view agenda source.

Edits don't apply to the live feed until you click **Save** in the top toolbar. **Discard** reverts the draft to whatever's currently saved.

> 💡 **Note**: edits persist across app restarts and across Tempo updates. Tempo keeps the last-saved version on disk so you can roll back, and you can always recover a bundled score's factory state. See [§7.8](#78--persistence-and-recovery).

### The score chip bar

The chip bar at the top is your score selector. Each chip shows the provider's display name; click to switch. Edits to one score are scoped to that score; switching scores prompts you to save or discard if there are unsaved changes.

The left of the chip bar has a **+ New** chip for creating a score from scratch (covered in [§11 — Score authoring](/docs/11-score-authoring)). The right end carries file-action chips for the selected score, most usefully **Open score location in Finder**, which reveals the score's JSON in `~/Library/Application Support/Tempo/Scores/`, and a shortcut to open the source's README where one exists.

> ⚠️ **V1 sweet spot: ~15 scores**. The current chip-bar design works well up to roughly 15 active scores. Past that, scrolling the strip and switching between scores starts to feel sluggish; at 25–30 scores it becomes a real friction point. A redesigned picker (dropdown with search and category grouping) is on the **V1.x roadmap** and will lift this ceiling. If you find yourself hitting that wall, two interim suggestions: **(a)** keep your active scores trimmed to what you actually edit, and **(b)** if you have a lot of variant-of-one-thing scores (eight different `scripts.*` providers, say), consider whether a single broader score with metadata-driven severity rules can cover them: fewer files, same coverage.

---

## 7.3 — Severity rules

The Severity rules section is the heart of a score. It's where you decide what each kind of event from this provider gets tagged with.

### How rules work

Rules evaluate **top-to-bottom; first match wins**. Each rule has:

- A **severity**: one of info, ok, warning, error, critical
- A **badge label** (optional): the custom text on the severity pill ("Backup OK," "Connection failed"). Defaults to the severity name uppercased
- A **pill color** (optional): overrides the default severity color. Useful for "this is a warning, but not the kind that should look red-adjacent" cases (a Sky decoder disconnecting at night is a warning by the rules, but you want it gray-pill rather than yellow because it's expected)
- A **set of conditions** under "When all of these match": payload field checks. Every condition must match for the rule to fire (logical AND across conditions; logical OR across rules, so the next rule fires if this one didn't)
- A **presentation block** (optional): title and subtitle templates that override the event's defaults when this rule fires

### The condition row

Each condition is a key/value pair:

```
[metadata key] = [value (supports * and ?)]
```

- **Key** is the name of a payload field, like `outcome`, `severity`, `alarmKey`, `host`
- **Value** is what to match: exact string, or a shell-style wildcard pattern. `error` matches the literal string `error`. `STA_*` matches anything starting with `STA_`. `*FAILURE` matches anything ending with `FAILURE`. `?` matches a single character

Tempo also flags conditions whose **key was never seen in recent events** from this provider: a small orange warning triangle next to the row, with a tooltip: *"Key 'X' was not observed in recent events from this provider; the rule may never fire."* This catches typos before they bite (was it `outcome` or `result`?).

### Rule order and the "first match wins" model

Rules are evaluated in display order. Use the up/down arrows on each rule to move it; rules that need to take precedence (more specific patterns) should be above rules they're a special case of (more general patterns).

Common ordering pattern:

```
#1  CRITICAL  outcome=error AND severity=critical
#2  ERROR     outcome=error
#3  WARNING   outcome=warning
#4  OK        outcome=ok
```

Without #1, an event with `outcome=error AND severity=critical` would match #2 and stop, never reaching the more-specific case. Putting #1 first ensures the special case is handled.

### Adding, moving, removing rules

- **Add rule** at the bottom of the list creates a new empty rule with severity `info`, no conditions, no label. Fill it in
- **Up/down arrows** on each rule move it in the list (grayed when at the boundary)
- **Trash icon** removes a rule. No undo; if you remove the wrong one, **Discard** in the toolbar reverts the whole draft

### The Available keys strip

Above the rule list, the editor shows a horizontal strip of **chips**, each labeled with a metadata key Tempo has actually seen in recent events from this provider:

```
[host] [outcome] [target] [delta] [duration] [snapshotID] · sampled from the last 10 events
```

Click any chip to copy `${metadata.<key>}` to your clipboard, ready to paste into a title template or an action trigger. The strip is purely informational: it doesn't constrain what keys you can reference (you can type any key into a rule), it just shows you what's available.

If a provider has never sent an event, the strip is empty: send an event (real traffic, or via the demo scripts under `demo/`) and the strip populates.

### Presentation block

Each rule can override the event's title and subtitle when it matches. Both fields support `${metadata.xxx}` interpolation:

```
Title:    ${metadata.target} backed up (${metadata.delta})
Subtitle: ${metadata.duration} · ${metadata.repoSize}
```

The placeholder text in these fields adapts to the provider (Kopia gets Kopia-shaped examples, UniFi gets UniFi-shaped examples, etc.) so you have a starting point that's actually relevant.

If a referenced field is missing from the payload, Tempo substitutes a placeholder rather than failing. You'll see the literal `${metadata.target}` in the rendered card; that's a cue to either fix the upstream payload or change the template to reference a field that's actually present.

### The "Sender severity wins" toggle

At the top of the **Severity** tab, above the rule list, there's a toggle: **"Sender severity wins"**.

- **On** (default): if the payload includes an explicit non-`info` severity field, that severity short-circuits the rules below. Useful when the upstream tool already classifies events well
- **Off**: the score's rules always run, regardless of what the payload says

Turn it off when you have a sender that over-declares severity (every event arrives with `severity=critical` even though they're mostly informational). Your rules then become authoritative.

---

## 7.4 — Presentation and custom labels

The presentation aspects of a score are split between the rule's per-match presentation block (covered above, on the Severity tab) and the score-wide defaults on the **Source** tab.

The Source tab gives the score's overall identity:

- **Provider identifier**: read-only display of the score's provider ID (`com.kopia`, `com.unifi`, etc.)
- **Display name**: the human-readable name shown on source rows ("Kopia," "UniFi")
- **Color**: the source color, picked via the macOS color picker or typed as `#RRGGBB` hex

The color appears on source rows, on event-card stripes, and on heatmap segments (when the heatmap is set to source-coloring mode).

### Custom badge labels

For each severity rule, the **badge label** field replaces the universal severity label on the card's severity pill. So instead of every backup-related severity reading `OK`, `WARNING`, `ERROR`, you can have:

- `BACKUP OK · +147KB`
- `WARN: 3 SKIPPED FILES`
- `BACKUP FAILED`

The pill color stays driven by severity (so a yellow pill labeled "WARN: 3 SKIPPED FILES" still reads as a warning at a glance), but the *language* communicates context.

You can use `${metadata.xxx}` interpolation in badge labels too, so a single rule can produce different labels depending on the payload:

```
label: BACKUP OK · ${metadata.delta}
```

→ renders as `BACKUP OK · +147KB`, `BACKUP OK · +2.3MB`, etc., depending on the actual event.

### Custom pill color override

The **pill color** field on each rule overrides the default severity color for that pill. Default behavior: warning pills are yellow, error pills are red, etc. The override lets you pick any hex color.

Use case: an event that's *technically* a warning by your rules but you don't want it shouting yellow because it's expected. A Sky decoder going `Disconnected` at 03:00 every night is one of those: the rule fires, the severity is `warning`, but you want the pill gray or blue so it doesn't visually compete with actual warnings.

The override is per-rule. Different severities of the same kind of event can have different colors.

> 💡 **Note**: keep color overrides used sparingly. The whole point of universal severity colors is that "yellow = warning" reads at a glance across all your sources. Override when there's a real semantic reason (the event is genuinely *less* alarming than its severity suggests), not as decoration.

---

## 7.5 — Stack grouping

The Stack grouping section configures whether and how related events from this provider collapse into stacks (see [§5.4 — Stacked events](/docs/05-event-panel#54-stacked-events)).

### The toggle

**Stack repeated events** is a single toggle at the top of the section:

- **Off**: every event from this provider renders as its own card, regardless of similarity
- **On**: events sharing a resolved grouping key collapse into stacks

Turning the toggle on reveals the grouping editor below. Turning it off clears any grouping templates and the time window.

### Grouping key templates

Each grouping template is a string with `${metadata.xxx}` placeholders. When an event arrives, Tempo:

1. Walks the templates from top to bottom
2. Picks the first one that **fully resolves** (every referenced metadata field is present in the payload)
3. Uses the resolved string as the event's "stack identity"

Events with the same stack identity, within the time window, become a stack.

### Why a fallback chain

Some sources emit different event shapes from the same provider: a UniFi controller sends both client-association events (with `clientMac` and `deviceMac`) and device-status events (with only `deviceMac`). A single template `${metadata.clientMac}` would fail to resolve for device-status events; a single template `${metadata.deviceMac}` would conflate every event from the same AP regardless of client.

The fallback chain solves this:

```
${metadata.clientMac}/${metadata.deviceMac}
${metadata.deviceMac}
```

→ Client-association events resolve to `aa:bb:cc/11:22:33` (template 1).
→ Device-status events resolve to `11:22:33` (template 2, since template 1 has a missing `clientMac` field).

You get correct grouping for both event shapes without writing code.

### Add / remove templates

- **Add fallback template** at the bottom adds a new empty template row
- **Minus icon** on each row removes that template

A score with no templates has stacking off (the toggle reflects this). A score with at least one template has stacking on.

### Time window

The time window controls how aggressively stacks close:

| Window | Use case |
|---|---|
| **No cutoff (always stack)** | History-of-one-target style, like Kopia's "all backups of /Users/leo/Documents stack forever". Useful when each event represents a discrete run of something that happens infrequently |
| **15 min, 30 min, 1 hour** | Live monitoring, like Uptime Kuma flapping or UniFi reconnects. Stacks close fast so a fresh problem starts a fresh stack |
| **6 hours, 1 day** | Cron-job style, like backups or scheduled tasks. Stacks span a single "session" of activity |
| **1 week** | Weekly maintenance, logrotate, periodic cleanups |

Pick the smallest window that still feels right for the source. Smaller = more responsive (a new spike of activity is a new stack); bigger = quieter feed (related events keep clustering).

### Try the grouping in the side panel

The Try panel on the right shows you a sample event from this provider and tells you what stack identity it would resolve to under the current draft. Useful when you're editing templates and want to confirm the resolution actually matches what you expected.

---

## 7.6 — Actions

The **Actions** tab declares the buttons that appear on every event from this provider (the score's `defaultActions`). The editor authors them visually: **Add action** creates a new button, each row lets you set the label and SF Symbol, pick the trigger type from a menu, and write the trigger's value (URL, terminal command, or clipboard string) with `${metadata.xxx}` interpolation. You can remove a button with its trash icon and reorder buttons with the up/down arrows.

The JSON file stays a valid alternate surface: the `defaultActions` block you author in the editor is exactly what lands in the file, and hand-editing it produces the same result. Use whichever you prefer. See [§11.4 — Action triggers reference](/docs/11-score-authoring#114-action-triggers-reference) for the full trigger and interpolation reference.

### Order recap

Score-declared default actions render first in the action panel, in the order declared in the JSON. Per-event actions (sent in the payload itself by the upstream tool) render after. If a per-event action has the same label as a default, the per-event version wins.

The convention: defaults are stable across events of the same provider (build muscle memory, so "the SSH button is always there for UniFi"); per-event actions are exceptional ("this particular alert needs a special URL because it's about a specific incident").

---

## 7.7 — Available keys strip

The Available keys strip is a small but high-leverage feature: it shows you which metadata keys this provider actually emits, sampled from the last 10 events.

### Where it appears

Above the Severity rules section, and again on relevant condition rows when you're typing a key.

### What it tells you

Each chip is a metadata key seen in real recent events:

```
[host] [outcome] [target] [delta] [duration] [snapshotID]
```

Chips reflect *observed* keys, not theoretical ones. If your Kopia config doesn't emit `delta`, you won't see it. If your custom webhook adds `correlation_id`, you will.

### How to use it

- **Click a chip** to copy `${metadata.<key>}` to your clipboard. Paste into title templates, subtitle templates, action trigger values, grouping templates, anywhere `${metadata.xxx}` is valid
- **Glance at it** before adding a condition. If you're about to write a condition on `outcome` but the strip shows `result` instead, you've caught a typo before it bites

The strip is also a hint for the **completeness** of your score. If your rules reference 4 keys and the strip shows 12 keys, you might be ignoring useful payload information that could feed into custom labels or action triggers.

> 🛠 **Tip**: send a real event (not just a synthetic test) before authoring rules. The strip needs real traffic to populate. The bundled scores were authored with real traffic from each provider during V1 development.

---

## 7.8 — Persistence and recovery

Score edits persist across app restarts and Tempo updates. Tempo writes the saved score to `~/Library/Application Support/Tempo/Scores/<provider>.json`; the bundled defaults live inside the app bundle and are written to the user-scores directory on first launch (with a version marker so the seeder knows they came from the bundle).

### When you save

Click **Save** in the toolbar. The draft is written to disk, the file watcher picks it up, and the next event from this provider runs through the new score. The Try panel updates immediately so you can confirm the result before traffic arrives.

### Discard

Click **Discard** in the toolbar to revert the draft to whatever's currently saved. Useful when you've gone down a wrong path and want to start from the last good state.

### Recovering a bundled score

If you've edited a bundled score and want the factory version back, recover it from the bundle:

1. **Quit Tempo**
2. Delete the score's file: `~/Library/Application Support/Tempo/Scores/<provider>.json`
3. **Relaunch Tempo**: on launch it reseeds the missing bundled score from the app bundle, restoring the shipped defaults

This only works for bundled scores (those Tempo ships with). A user-authored score (one you created from scratch) has no factory version to fall back to; if you want a safety copy before experimenting, duplicate the file in Finder first.

### File-system access

You can also work on score files outside the editor:

- **Open score location in Finder** in the chip bar opens `~/Library/Application Support/Tempo/Scores/` with the score selected
- Open the file in any text editor: it's plain JSON
- Save changes; Tempo's file watcher reloads automatically

If your hand edits produce invalid JSON, Tempo logs a parse error to OSLog and falls back to the previous valid version. The audit log captures the error. See [§12.3 — A score isn't appearing](/docs/12-troubleshooting#123-a-score-isnt-appearing).

> 💡 **Note**: hand-editing is fully supported, not a workaround. The editor and the JSON file are two surfaces over the same underlying data; whichever you prefer for a given task is the right one. Some users do conditions in the editor and presentation in the JSON; that's fine.

---

## A worked tour: customizing the Kopia score

A short walk through the editor, end-to-end, using Kopia as the example.

1. **Open the editor**: click the **Score Editor** tab at the top of the center panel, then pick **Kopia** from the chip bar
2. **Set the color**: Click the color picker in the Header, pick a green that matches your aesthetic, or paste `#30D158` (the bundled default)
3. **Inspect the rules**: the Kopia bundled score has rules for `outcome=error`, `outcome=warning`, `outcome=ok`. Click the Available keys strip to see what other metadata Kopia is emitting (`target`, `delta`, `duration`, `repoSize`)
4. **Add a custom label**: click into the `outcome=ok` rule's "badge label" field, type `Backup OK · ${metadata.delta}`. Save. The next ok event will render with `BACKUP OK · +147KB` on its severity pill
5. **Tighten grouping**: scroll to Stack grouping. The bundled template is `${metadata.repo}/${metadata.target}` with a `1d` window. If you'd rather have one stack per repo regardless of target, add a fallback `${metadata.repo}` and bump the window to `1w`
6. **Confirm in the Try panel**: the right-side panel shows a recent Kopia event with the new draft applied. If it looks right, save. If not, tweak and re-check

The whole loop took five minutes. No restart, no JSON, no documentation cross-reference needed.

---

## A note on action buttons

The Score Editor authors action **buttons** (the entries in `defaultActions`) visually on the **Actions** tab: add, edit, reorder, and remove buttons, pick the trigger type, and write its value with `${metadata.xxx}` interpolation. The score JSON stays a valid alternate surface: whatever you author in the editor is exactly what lands in the file, and hand-editing it gives the same result.

If you'd rather work in JSON, see the walkthrough on the blog: [Adding a button to Tempo events](/blog/adding-a-custom-action-button/), a concrete example, ~5 minutes end to end. The full field reference lives in [§11.4 — Action triggers reference](/docs/11-score-authoring#114-action-triggers-reference).

---

## Where to go from here

- **Adding a custom button via JSON** → blog post [Adding a button to Tempo events](/blog/adding-a-custom-action-button/)
- **Writing a brand-new score from scratch** → [§11 — Score authoring](/docs/11-score-authoring)
- **The JSON schema underneath the editor** → [§11.1 — JSON schema overview](/docs/11-score-authoring#111-json-schema-overview)
- **The action triggers reference** → [§11.4 — Action triggers reference](/docs/11-score-authoring#114-action-triggers-reference)
- **Troubleshooting a score that isn't behaving** → [§12.3 — A score isn't appearing](/docs/12-troubleshooting#123-a-score-isnt-appearing)
- **Sharing or installing community scores** → the public catalog at [github.com/caereforge/tempo-scores](https://github.com/caereforge/tempo-scores)
