---
title: "Score authoring"
description: "This chapter is the developer reference for writing Tempo scores from scratch."
chapter: 11
order: 11
draft: false
pubDate: 2026-05-05
---
# 11 - Score authoring

This chapter is the developer reference for writing Tempo scores from scratch. It assumes you've read [§2.3 - Scores](/docs/02-concepts#23---scores) and [§7 - Score Editor](/docs/07-score-editor). The Score Editor covers most use cases without you ever opening a JSON file; this chapter is for the cases where you want to author a score the editor can't fully express, or you want to share a score with the community via the public catalog.

The canonical machine-readable schema lives at [`schema/score.schema.json`](https://github.com/caereforge/tempo-scores/blob/main/schema/score.schema.json) in the public catalog repo. This chapter is the prose narration of that schema, plus the unwritten rules of "what makes a good score."

---

## 11.1 - JSON schema overview

A score is a single JSON object. The minimum viable score:

```json
{
  "providerIdentifier": "com.example.my-tool",
  "displayName": "My Tool"
}
```

That's a valid score. It does almost nothing (every event from `com.example.my-tool` would render with the default Tempo styling, no severity logic, no custom actions) but it's enough to show "My Tool" in the source panel and to load without errors.

A score with all the bells:

```json
{
  "providerIdentifier": "com.example.my-tool",
  "displayName": "My Tool",
  "color": "#8E8E93",
  "severityDefault": {
    "severity": "info",
    "label": "Info"
  },
  "severityRules": [
    {
      "match": { "status": "error" },
      "severity": "error",
      "label": "Failed"
    },
    {
      "match": { "status": "warning" },
      "severity": "warning",
      "label": "Warn"
    }
  ],
  "grouping": ["${metadata.host}/${metadata.run_id}"],
  "groupingWindow": "6h",
  "defaultActions": [
    {
      "label": "Open dashboard",
      "systemIcon": "globe",
      "trigger": { "openURL": "https://example.com/dashboard" }
    },
    {
      "label": "Copy host",
      "systemIcon": "doc.on.clipboard",
      "trigger": { "copyToClipboard": "${metadata.host}" }
    }
  ]
}
```

Every top-level field other than `providerIdentifier` and `displayName` is optional. Tempo applies sensible defaults when a field is missing.

### Where score files live

User-installed scores live in `~/Library/Application Support/Tempo/Scores/`. Tempo loads them at launch and reloads when files change. The file name should match `<providerIdentifier>.json`. Tempo doesn't enforce this strictly, but the convention makes the directory navigable and the score-vs-provider relationship clear at a glance.

Bundled scores ship with the app in `Tempo.app/Contents/Resources/Scores/*.json`. Only `scripts.json` auto-seeds into the user-scores directory on first launch (with a version marker so the seeder doesn't overwrite user edits); the rest install on demand from **Manage Sources**.

---

## 11.2 - Field reference

### `providerIdentifier` (required)

A stable, namespaced identifier for the source.

The actual validator is permissive: `^[A-Za-z0-9._\-]{1,128}$`, so uppercase is allowed, and the length ceiling is 128 characters. The lowercase reverse-DNS form below is a **catalog naming convention**, not a hard rule; it keeps the public catalog tidy and the directory navigable, but Tempo will accept any identifier that matches the validator.

**Conventions**:

- **Reverse-DNS** for vendors and well-known tools: `com.kopia`, `com.ubiquiti.unifi`, `com.home-assistant`, `com.uptime-kuma`
- **`scripts.<category>.<name>`** for scripts you write yourself, grouping by what they watch. The category is a name you pick, not a fixed set (for example `hardware`, `hosts`, `backups`): `scripts.hosts.disk_space`, `scripts.backups.nightly`
- **`local.<name>`** for senders running on the same Mac as Tempo: `local.check_disk`, `local.backup_notify`
- **`lab.<host>.<name>`** for senders on other LAN hosts: `lab.nas01.smart_check`

The identifier is the **machine identity** of the sender. It's used for token binding (a token bound to `com.kopia` rejects events declaring `com.example`), for upsert deduplication, and for prefix-walking score resolution (a score for `scripts` covers every `scripts.*.*`).

### `displayName` (required)

Human-readable label shown in the source panel. Free text, minimum 1 character.

If you don't want to set this in the score, the user can override it in their local install via Manage Sources → rename source. The score's `displayName` is the default.

### `color`

Accent color for the source, as `#RRGGBB` hex. Pattern enforced.

If omitted, Tempo uses a neutral gray (`#8E8E93` is a common fallback). Strongly recommended to set this: distinct colors are how the source panel stays scannable.

### `severityDefault`

Fallback severity assigned to events when no `severityRules` rule matches. Object with two fields:

```json
{
  "severity": "info",
  "label": "Info"
}
```

- **`severity`** (required): one of `info`, `ok`, `warning`, `error`, `critical`
- **`label`** (optional): custom badge text. If omitted, the severity name uppercased

### `severityRules`

An ordered array of rules. Each rule has:

- **`match`** (required): an object of key/value conditions. All conditions must match (logical AND). Values support glob-style wildcards (`*`, `?`)
- **`severity`** (required): the severity to assign when this rule matches
- **`label`** (optional): custom badge text for this rule

```json
"severityRules": [
  { "match": { "outcome": "error" }, "severity": "error", "label": "Failed" },
  { "match": { "outcome": "warning" }, "severity": "warning", "label": "Warn" },
  { "match": { "outcome": "ok" }, "severity": "info", "label": "OK" }
]
```

Evaluation: top-to-bottom, first match wins. Order matters: put more specific rules above more general ones.

> 💡 **Note**: the runtime also supports a richer rule shape with a `color` override and presentation templates (the JSON keys are `title` and `subtitle`). The public catalog schema is intentionally narrower: those features are local-only and don't ship in catalog scores. Use the Score Editor for the richer shape; manage your own scores in `~/Library/Application Support/Tempo/Scores/` for distribution.

### `grouping` and `groupingWindow`

Stack grouping configuration. See [§2.6 - Stack and grouping](/docs/02-concepts#26---stack-and-grouping) and [§7.5 - Stack grouping](/docs/07-score-editor#75---stack-grouping).

- **`grouping`**: a single template string, or an array of fallback templates, with `${metadata.xxx}` placeholders. Tempo picks the first one that fully resolves
- **`groupingWindow`**: duration string: `15m`, `30m`, `1h`, `6h`, `1d`, `1w`, or empty (no cutoff)

```json
"grouping": [
  "${metadata.repo}/${metadata.path}",
  "${metadata.repo}",
  "${metadata.host}"
],
"groupingWindow": "1d"
```

Omit both for no grouping (every event renders as its own card).

### `defaultActions`

Array of action buttons that appear on every event from this provider. Each action has:

- **`label`** (required, ≥1 char): button text
- **`systemIcon`** (required, ≥1 char): SF Symbol name
- **`trigger`** (required): an object with one of three shapes (covered in §11.4)
- **`_disabled`** (optional boolean): when `true`, the action ships present but inactive. It does not render in the action panel until the user enables it in the Score Editor. Useful for shipping an action that only works on some setups (the bundled Kopia score ships its web-UI and docs actions disabled). This flag is per-action, not per-score.

```json
"defaultActions": [
  {
    "label": "Open dashboard",
    "systemIcon": "globe",
    "trigger": { "openURL": "https://example.com/" }
  }
]
```

Per-event actions sent in the payload itself are *appended* after the default actions, and override defaults of the same label.

### The grown schema - additional top-level blocks

Beyond the basics above, a real bundled score can use the following blocks. They're all optional, and most of them are also editable from the Score Editor (the exceptions are noted). A shipped score like `com.beszel.json` uses `senderSeverityWins`, `groupingRules`, `helper` and `surface` together; these are what you'll find.

- **`senderSeverityWins`** (boolean, default `true`): when `true`, a payload that carries its own non-`info` severity field short-circuits `severityRules` and uses the sender's severity directly. Set `false` to make your rules authoritative for a source that over-declares severity. Editable on the Severity tab.
- **`groupingRules`** / **`restStateOverrides`**: *session* grouping, distinct from the template `grouping` above. `groupingRules` assign each event a role keyed off `${metadata.x}` values, so a monitor that goes down and later recovers folds into one episode. The session roles are `opens` / `closes` / `continues`; the punctual roles `single` (never stacks) and `repeats` (stacks repetitions within a window) also exist for events complete in themselves. Used by stateful sources (Uptime Kuma, Beszel, UniFi). `restStateOverrides` swaps the `opens` / `closes` orientation for natural-off subjects and can set a per-subject resolved-cycle severity. **File-authored and read-only in the editor**: the editor preserves them but does not expose a UI for them. Session grouping is an advanced mechanism the bundled stateful scores rely on; it is not yet a supported surface for user-authored scores and may change. The grouping available and supported today is the template `grouping` above.
- **`indicatorRules`** / **`tagRules`**: payload-driven emoji indicators and tags attached to matching events. Edited on the **Tags & emoji** tab.
- **`ackRules`** / **`dismissRules`**: payload conditions that auto-acknowledge or auto-dismiss matching events. Evaluation is **any-rule-matches** (logical OR across rules); when both an ack rule and a dismiss rule match the same event, **dismiss wins**. Edited on the **Ack and dismiss** tab.
- **`eventPattern`**: `"episodic"` (default), `"entity"`, or `"run-bound"`. `episodic` treats each event as a standalone occurrence. `run-bound` activates the lifecycle UI layer for finite multi-step runs (step/total subtitle, run-status badge, timeout check) and is driven by reserved `runTotal` / `runTimeout` / `runComplete` / `runStatus` metadata keys. `entity` is reserved for long-lived stateful subjects driven via `externalID` upsert. **File-authored**.
- **`stackTitle`**: a `${...}` template that overrides the title of a grouped stack's primary row (single-event rows ignore it). Resolved against the primary event with the standard `${metadata.x}`, `${title}`, and `${providerIdentifier}` placeholders.
- **`helper`**: an object describing the companion helper or adapter associated with the source (informational / catalog metadata only; Tempo never installs or runs it). Optional fields: **`summary`** (one-line description), **`platforms`** (array of file-extension hints for the shipped variants, e.g. `"sh"`, `"py"`, `"ps1"`), **`url`** (external location when the helper is hosted elsewhere rather than bundled beside the score). The bundled `com.beszel.json` ships `"helper": { "platforms": ["py"], "summary": "Polls the Beszel hub for triggered alerts and posts them to Tempo." }`.
- **`surface`**: `"timeline"` or `"agenda"`. When omitted, the default is derived from the event's `eventType` (`alert` → timeline, everything else → agenda). An `agenda` score is a day-view source (calendar/reminders-style); it only exposes the Source and Actions tabs in the editor and skips the severity/grouping/tag/ack machinery.
- **Meta keys**: top-level keys prefixed with `_` are reserved metadata and are ignored by the runtime logic: **`_comment`** (free-text note for authors/reviewers) and **`_bundledVersion`** (version marker the seeder uses to track bundled-vs-user state). (The per-action **`_disabled`** flag is documented under `defaultActions` in §11.2.)

---

## 11.3 - Severity rule syntax

### Match conditions

A `match` object is a flat key/value map. Each key is a metadata field name; each value is a pattern to match.

#### Exact match

```json
"match": { "outcome": "error" }
```

Matches when `metadata.outcome` equals `"error"`. Case-insensitive (`error` matches `Error`, `ERROR`).

#### Wildcards

`*` matches any sequence of characters; `?` matches any single character. (Glob-style, not regex.)

```json
"match": { "alarmKey": "STA_*" }
```

Matches `STA_ASSOC_FAILURE`, `STA_AUTH_FAILURE`, `STA_DEAUTH`, etc.

```json
"match": { "alarmKey": "*FAILURE" }
```

Matches anything ending in `FAILURE`.

```json
"match": { "code": "E?00" }
```

Matches `E100`, `E200`, `E300`, etc.

#### Multiple conditions in one rule

```json
{
  "match": { "outcome": "error", "severity": "critical" },
  "severity": "critical",
  "label": "CRITICAL FAILURE"
}
```

Logical **AND**: both `outcome=error` and `severity=critical` must be present in the metadata for the rule to fire.

#### Multiple rules

The rule array itself is logical **OR**: rule 2 fires if rule 1 didn't, etc. First match wins.

### Naming conditions

Match keys reference top-level metadata fields by name, no prefix required. Whatever your payload puts in `metadata`, the rule's `match` object names it directly. For example, the bundled Kopia score uses `"match": { "outcome": "error" }` because the Kopia ingestion module emits an `outcome` field at the top of the metadata object; the rule names it as is.

Stringification is implicit: numbers, booleans and strings all collapse to their textual form, so a rule `{"exit_code": 0}` matches metadata values of `0`, `"0"`, or `0.0` interchangeably. Glob wildcards `*` and `?` are supported in string values (`{"key": "EVT_*_Connected"}` collapses a family of provider-specific event keys).

---

## 11.4 - Action triggers reference

A score-authored trigger accepts exactly three shapes: `openURL`, `openTerminalWith`, and `copyToClipboard`. Each is mutually exclusive: an action has exactly one trigger. (Tempo also has two runtime triggers, `completeReminder` and `uncompleteReminder`, which flip an Apple Reminder's completed flag. They are synthesized by the EventKit provider and are not writable in a `.tempo-score` file; the three above are the ones you author for ingested sources.)

### `openURL`

Opens a URL. macOS picks the handler based on the scheme.

```json
"trigger": { "openURL": "https://example.com/" }
```

**Allowed schemes** (the complete allowlist):

`http`, `https`, `ssh`, `sftp`, `ftp`, `mailto`, `tel`, `sms`, `facetime`, `facetime-audio`, `obsidian`, `bear`, `things`, `omnifocus`, `ticktick`, `notion`, `todoist`, `slack`, `msteams`, `zoom`, `zoommtg`, `tg`, `discord`, `vscode`, `vscode-insiders`, `cursor`.

Anything outside this list is rejected, including `javascript:`, `data:`, `vbscript:`. Note that `vnc` and `rdp` are **not** allowed, and meeting-join schemes like `webex`, `jitsi`, and `gotomeeting` are **not** allowlisted either.

**Two layers for `file://`.** The allowlist above is what a **remote-ingested payload action** is validated against: an action that arrives over `/ingest` from another host. There, `file://` is blocked. A **locally-installed score** (a score file you placed in `~/Library/Application Support/Tempo/Scores/`) additionally permits `file://` at click time, with percent-encoding applied to the path. The distinction is trust: a score on your own disk is your own decision; an action pushed in over the network is not.

The allowlist exists because URL handlers can do anything an app can do. Restricting remote payloads to network and communication schemes keeps the over-the-wire action surface contained.

### `openTerminalWith`

Opens Terminal.app and runs a command.

```json
"trigger": { "openTerminalWith": "kopia snapshot list ${metadata.path}" }
```

**Important**: this trigger is **not allowed in scores submitted to the public catalog**. The public catalog reviews scores for safety, and a score that runs arbitrary shell commands is too high-risk to vet thoroughly. Catalog scores must use `openURL` (with `ssh://` for shell access if needed) or `copyToClipboard`.

For your **local** install (drop a score into `~/Library/Application Support/Tempo/Scores/`), `openTerminalWith` is fully supported. The restriction is purely about distribution: anything you run on your own Mac is your own decision.

### `copyToClipboard`

Copies a string to the system clipboard.

```json
"trigger": { "copyToClipboard": "${metadata.host}" }
```

No scheme restrictions: the value is a string, not a URL.

### Interpolation

The three string-based triggers (`openURL`, `openTerminalWith`, `copyToClipboard`) support `${metadata.xxx}` placeholder substitution at click time:

- `${metadata.host}` → the value of `metadata.host` from the event payload
- `${title}` → the event's title
- `${startDate}` → the event's timestamp (ISO 8601)
- `${metadata.custom.disk_usage_percent}` → reaches into the custom bucket

If a referenced field is missing from the payload, the action does **not** fire with a malformed value. Tempo disables the button: it renders grayed out (about 55% opacity) and unclickable, with a tooltip that names the missing field(s): *"Can't run: the event is missing `host`."* This means an action whose template can't resolve can't be invoked, rather than firing a broken `ssh://admin@` with an empty host. Fix the upstream payload or reference a field that's actually present, and the button re-enables.

### `systemIcon`

Each action takes an SF Symbol name as its icon. Common choices:

| SF Symbol | Use case |
|---|---|
| `globe` | Open URL (web) |
| `lock` | SSH / login |
| `terminal` | Terminal command |
| `doc.on.clipboard` | Copy something |
| `network` | Network-related |
| `house` | Home (HA dashboard) |
| `book` | Documentation |
| `arrow.clockwise` | Re-run / refresh |
| `list.bullet` | List / log view |
| `cloud` | Cloud service |
| `square.and.arrow.up` | Open in another app |

The full SF Symbols catalog is browsable in the **SF Symbols** app from Apple. Pick names that visually convey what the button does.

---

## 11.5 - `.tempo-score` installer file

A `.tempo-score` file is a single JSON file with the same shape as a regular score, but with a custom file extension. macOS recognizes the extension via Tempo's UTI registration; double-clicking a `.tempo-score` file opens Tempo and triggers the **Score Review Sheet**, a preview UI showing what's about to be installed:

- The provider identifier
- The display name and color
- A preview of the rules and default actions
- A diff if a score with this provider identifier is already installed (existing rules vs incoming rules)

The user clicks **Install** to apply, or **Cancel** to skip.

### Why the special extension

A `.tempo-score` file is the friction-free distribution format. A user can:

1. Click a `.tempo-score` link on a webpage
2. Their browser downloads the file
3. They double-click in Finder
4. Tempo opens the review sheet
5. They click Install

Total time: about ten seconds. No editor, no JSON, no reading docs.

### Distribution

The public catalog at [github.com/caereforge/tempo-scores](https://github.com/caereforge/tempo-scores) hosts vetted `.tempo-score` files for community-contributed sources. Click a file in the GitHub UI → Raw → save as `.tempo-score` → double-click to install.

For your own scores you want to share, the same pattern works: put the file somewhere reachable (a Gist, a personal website, a Discord file upload), share the link, recipients double-click.

### `.tempo-score` vs `.json`

Functionally identical content. The difference is the file extension:

- `.json`: opens in your text editor by default; you'd have to manually copy it to `~/Library/Application Support/Tempo/Scores/`
- `.tempo-score`: opens in Tempo's review sheet by default; one-click install

Use `.tempo-score` for distribution, `.json` for local editing in `~/Library/Application Support/Tempo/Scores/`.

---

## 11.6 - `tempo-validate` CLI

Tempo ships an offline score linter, `tempo-validate`, for sanity-checking a score before you install or distribute it. It's useful for CI pipelines that vet community contributions to the public catalog, and for a quick local check after hand-editing a score.

### Where to get it

- **Bundled in the app**: `Tempo.app/Contents/Resources/Utilities/shell/tempo-validate`
- **Downloadable**: from [tempoapp.app/utilities/](https://tempoapp.app/utilities/)

### Usage

```bash
tempo-validate path/to/score.json
```

It validates the score against the schema and exits `0` on valid, non-zero with a descriptive error on invalid. Point it at a single file or a directory of scores.

If you'd rather not run the linter, you can also spot-check a score by:

1. Loading it in Tempo (the file watcher picks up changes; parse errors land in OSLog, filterable by `app.tempoapp.Tempo`)
2. Running `jq . path/to/score.json` to confirm the JSON at least parses

---

## 11.7 - Best practices

A score that's good to use is a score that's been thought about. A few patterns worth following:

### Severity calibration

- **`critical` is for the things that wake you up.** WAN_DISCONNECTED, smoke detector, RAID degraded, root volume 100% full
- **`error` is for "something I need to look at today."** Backup failed, monitor down, build broken
- **`warning` is for "something I should be aware of, not urgent."** Low disk, one of three runs failed, deprecated API used
- **`info` is for "this happened, no action needed."** Backup succeeded, deploy completed, login event
- **`ok` is the same as `info` but signals positive outcome explicitly.** Useful when the green "succeeded" pill is meaningful UX

If every event is `critical`, none of them are. The five severities matter only if you use them with discipline.

### Action design

- **Idempotent**. Clicking the action button twice in quick succession should not produce a double effect on the upstream side. (`openURL` is idempotent; `openTerminalWith` running a destructive command is not, so be careful)
- **Visible side effects**. The action's label and SF Symbol should give the user a clear mental picture of what's about to happen. "Open dashboard" is good; "Run thing" is not
- **Safe by default**. Prefer read-only or transient actions (open URL, copy to clipboard, ping) over destructive ones (delete, restart, force-update). The action panel is one click away, so keep destructive actions out of the default set

### Naming

- **Provider identifier**: reverse-DNS for tools, `local.*` / `lab.*` for personal scripts, `scripts.<lang>.<name>` for language-specific senders
- **Display name**: the brand name everyone uses. "Kopia" not "kopia-backup-tool". "GitHub" not "GitHub Actions Webhook Adapter"
- **Action labels**: short, verb-led. "Open dashboard" not "Click here to open the dashboard". "Copy MAC" not "Copy device MAC address to clipboard"

### Don't overdo grouping

The temptation when writing your first score is to set up elaborate fallback chains. Resist. Most sources work fine with one or two grouping templates.

A good rule of thumb: write grouping that handles the **most common** event shape from your source. Add fallbacks only when you observe in the real feed that some events aren't grouping the way you expected.

### Use the Available keys strip

Before writing rules, send a few real events from the source. Open the Score Editor, look at the Available keys strip: those are the keys actually present in your events. Write rules against those, not against keys you imagine might be there.

### Don't ship secrets in the score

Scores are JSON. They're shared via the public catalog, copy-pasted in Discord, attached to GitHub issues. Never put a token, an API key, or a credential in a score's action triggers.

If you need a secret in an action, the right pattern is:

- The user creates the token/secret on their own Mac (Keychain, env var, dotfile)
- The action references the user-side secret indirectly (a script file the user wrote that reads from their Keychain)
- The score itself is purely about *which* action runs, not about the secret it uses

---

## 11.8 - Worked example

Let's write a score from scratch for a fictional tool: a custom log-scanning script that POSTs results.

### The payload

The script POSTs:

```json
{
  "title": "log_scan completed",
  "providerIdentifier": "scripts.security.log_scan",
  "metadata": {
    "host": "monitor-01.lab",
    "label": "Warning",
    "duration_ms": 3400,
    "custom": {
      "matches_found": 12,
      "log_file": "/var/log/syslog",
      "scan_pattern": "ERROR|FAIL"
    }
  }
}
```

### Goal

A card that:

- Shows "Log scan · {matches_found} matches" as the title
- Colored by severity: 0 matches → ok green, 1-9 → warning yellow, 10+ → error red
- Has actions: "Open log file" (opens the scanned file via `file://`, permitted here because this is a locally-installed score; `file://` would be blocked only for a remote-ingested payload action), "Copy log file path", "SSH to host"

### The score

`~/Library/Application Support/Tempo/Scores/scripts.security.log_scan.json`:

```json
{
  "providerIdentifier": "scripts.security.log_scan",
  "displayName": "Log Scan",
  "color": "#FF9F0A",
  "severityDefault": {
    "severity": "info",
    "label": "OK"
  },
  "severityRules": [
    {
      "match": { "label": "Critical" },
      "severity": "critical",
      "label": "${metadata.custom.matches_found} matches"
    },
    {
      "match": { "label": "Error" },
      "severity": "error",
      "label": "${metadata.custom.matches_found} matches"
    },
    {
      "match": { "label": "Warning" },
      "severity": "warning",
      "label": "${metadata.custom.matches_found} matches"
    },
    {
      "match": { "label": "OK" },
      "severity": "info",
      "label": "Clean"
    }
  ],
  "grouping": ["${metadata.host}/${metadata.custom.log_file}"],
  "groupingWindow": "1d",
  "defaultActions": [
    {
      "label": "SSH to host",
      "systemIcon": "lock.open",
      "trigger": { "openURL": "ssh://admin@${metadata.host}" }
    },
    {
      "label": "Copy log path",
      "systemIcon": "doc.on.clipboard",
      "trigger": { "copyToClipboard": "${metadata.custom.log_file}" }
    },
    {
      "label": "Tail log",
      "systemIcon": "list.bullet",
      "trigger": { "openTerminalWith": "ssh admin@${metadata.host} tail -100 ${metadata.custom.log_file}" }
    }
  ]
}
```

### What this gets you

When a log_scan event arrives:

- Title rendered as `log_scan completed`, with the severity pill colored by `metadata.label` and labeled with the match count
- Three action buttons in the action panel: SSH, Copy path, Tail log
- Events from the same host + log file group together within a 1-day window
- The source panel shows "Log Scan" with the orange (#FF9F0A) accent

### Adjustments after observing real traffic

Once a few events have arrived, look at the Available keys strip in the Score Editor for `scripts.security.log_scan`. Maybe you discover:

- `metadata.custom.matches_found` isn't always set (the script forgot it on early-exit paths). Add a fallback in the labels: `"label": "${metadata.custom.matches_found} matches"` could resolve as ` matches` (empty)
- The tail log command needs sudo on some hosts. Adjust the action

The score is iterative: you ship the first version, run it for a few days, then refine the rules and actions based on what the feed actually looks like.

---

## Where to go from here

- **Submitting a score to the public catalog** → [github.com/caereforge/tempo-scores → CONTRIBUTING.md](https://github.com/caereforge/tempo-scores/blob/main/CONTRIBUTING.md)
- **The full webhook payload reference** → [the Sources reference (§10)](/docs/10-sources-reference)
- **The Score Editor for hands-on changes** → [§7 - Score Editor](/docs/07-score-editor)
- **Per-source setup for bundled providers** → [§10 - Sources reference](/docs/10-sources-reference)
