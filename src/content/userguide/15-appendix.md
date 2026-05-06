---
title: "Appendix"
description: "Reference material that didn't fit cleanly into the chapter flow but is worth having as a single page."
chapter: 15
order: 15
draft: false
pubDate: 2026-05-05
---
# 15 — Appendix

Reference material that didn't fit cleanly into the chapter flow but is worth having as a single page.

---

## 15.1 — Keyboard shortcuts

[NEEDS REVIEW: confirm complete keyboard shortcut list. The list below covers what's evident from the codebase; verify and expand. V1 may have fewer shortcuts than this list suggests.]

### Window and app

| Shortcut | Action |
|---|---|
| **Cmd-,** | Open Settings |
| **Cmd-Q** | Quit Tempo |
| **Cmd-W** | Close window (window stays alive in dock; menubar item still active) |
| **Cmd-H** | Hide Tempo |
| **Cmd-Option-H** | Hide other apps |
| **Cmd-M** | Minimise window to dock |

### Selection and feed

| Shortcut | Action |
|---|---|
| **Click** | Select a single event |
| **Cmd-click** | Toggle event selection (multi-select) |
| **Shift-click** | Select range from anchor to clicked event |
| **Esc** | Clear selection |
| **Double-click on time picker** | Jump to today |

### Action panel (single selection)

| Shortcut | Action |
|---|---|
| **Click action button** | Fire the action |
| **Cmd-click action button** | [NEEDS REVIEW: any modifier behaviour for actions? Likely none in V1] |

### Action panel (multi-select)

| Shortcut | Action |
|---|---|
| **Esc** | Clear selection |
| Click "Acknowledge all (N)" | Bulk ack |
| Click "Dismiss all (N)" | Bulk dismiss |

### Score Editor

| Shortcut | Action |
|---|---|
| **Cmd-S** | Save current draft [NEEDS REVIEW: confirm] |
| **Cmd-Z** | Undo within current draft [NEEDS REVIEW: confirm undo support] |

### Menubar item

| Shortcut | Action |
|---|---|
| **Click menubar icon** | Open menu |
| Menu → Settings… | Same as Cmd-, |
| Menu → Quit Tempo | Same as Cmd-Q (with menu shortcut "q" inside the menu) |

---

## 15.2 — macOS native integrations

A few standard macOS surfaces Tempo participates in:

### URL scheme

Tempo registers the `tempo://` URL scheme for deep linking:

- **`tempo://event/<id>`** — focus the timeline on the event with the given ID (matches against both internal `id` and `externalID`). The window comes forward automatically. Unknown IDs are silent no-ops

Use cases: an Apple Shortcut or a script that wants to jump to a specific event after some external action; a Hookmark link to a Tempo event from a note.

### Spotlight

[NEEDS REVIEW: confirm whether Tempo registers itself with Spotlight for searching events by title. May not be V1.]

### Quick Look

[NEEDS REVIEW: confirm whether Quick Look is wired up for `.tempo-score` files. The double-click to install behaviour is via UTI registration; Quick Look may or may not preview the file content separately.]

### Drag and drop

- Drag a `.tempo-score` file onto the Tempo dock icon or window → opens the Score Review Sheet
- Drag a JSON file from `~/Library/Application Support/Tempo/Scores/` to another location → standard macOS file copy

### Share Extension

[NEEDS REVIEW: confirm Share Extension status — TODOLIST mentions "future" but not committed for V1.]

### Sparkle auto-update

[NEEDS REVIEW: confirm Sparkle ships in V1 launch or is V1.1+. The MEMORY shows it's in scope but timing unclear.]

When Sparkle is enabled, Tempo checks for updates on a configurable interval (default daily) and prompts you to install when a new version is available. Updates are fetched from `downloads.tempoapp.app`.

---

## 15.3 — Privacy

Full privacy notice at [tempoapp.app/privacy](https://tempoapp.app/privacy).

Short version:

- **No accounts.** No login, no signup, no email required to use Tempo
- **No cloud sync.** All data lives in `~/Library/Application Support/Tempo/` on your Mac
- **No third-party telemetry.** Tempo doesn't ship analytics to any analytics service
- **Optional opt-in usage telemetry** [NEEDS REVIEW: confirm whether this exists in V1] — anonymised, user-controlled, off by default
- **Calendar and Reminders access** is via macOS EventKit and respects the system permission you granted. Calendar contents stay between Calendar.app, EventKit, and Tempo; nothing leaves your Mac
- **The ingestion server** binds to your LAN by default. Per-provider tokens authenticate every request. Audit log records every accept and reject

If you have specific concerns about what Tempo does with a particular kind of data, the privacy page goes into detail. The short version is: it's all local, it's all under your control, and the audit log is there for forensics if you ever want to verify it.

---

## 15.4 — License

Full license text at [tempoapp.app/license](https://tempoapp.app/license). LICENSE.txt in the application bundle is the same.

Short version:

- **Tempo v1 is distributed free of charge, forever.** Free for personal and commercial use, no restrictions on what kind of homelab/work/setup you use it in
- **Provided as-is, without warranty of any kind.** You're responsible for the scores you install and the actions they perform. The license & disclaimer are linked from the About panel in-app
- **After v2 ships, v1 will continue to receive security fixes only** — no new features, no behavioural changes. Direct support migrates to v2

The licensing approach is meant to be transparent: V1 is freeware-with-no-warranty, distributed broadly to find product-market fit. V2 is conditional and may be paid; that decision is data-driven, not date-driven.

---

## 15.5 — Credits

Tempo is built on the shoulders of a great deal of open-source software. The full credits live in the **About** panel in-app and in the LICENSE.txt of the application bundle.

Notable dependencies:

- **Sparkle** — auto-update framework for macOS apps. [sparkle-project.org](https://sparkle-project.org/)
- **SQLite** — embedded SQL database. [sqlite.org](https://sqlite.org/)
- **SwiftUI / EventKit / Foundation** — Apple frameworks
- **SF Symbols** — Apple's icon library

The bundled scores reference and integrate with many third-party tools — Kopia, UniFi, Home Assistant, Uptime Kuma, GitHub Actions, Synology — none of which are dependencies of Tempo itself; they're upstream sources Tempo *receives from*.

The community contributions to the [public score catalog](https://github.com/caereforge/tempo-scores) — Proxmox, Jellyfin, Vaultwarden, Pi-hole, Hazel, and more — are credited in the catalog repo's CONTRIBUTING.md and at the top of each score file.

[NEEDS REVIEW: confirm full credits list once V1 ships — match what's actually in the LICENSE.txt and About panel for accuracy.]

---

## End of guide

Thanks for reading.

If something didn't land — a chapter that left you confused, a section that should have existed, a phrasing that read awkwardly — file an issue at [github.com/caereforge/tempo-site/issues](https://github.com/caereforge/tempo-site/issues), or join the Discord at [tempoapp.app/community](https://tempoapp.app/community) [NEEDS REVIEW: confirm community URL].

Documentation is the surface that compensates for V1 not having a Visual Action Builder yet. We take it seriously, and we'd rather hear that something didn't work than have you struggle through it alone.

— *the Tempo docs*
