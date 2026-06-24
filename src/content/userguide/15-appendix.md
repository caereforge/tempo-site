---
title: "Appendix"
description: "Reference material that didn't fit cleanly into the chapter flow but is worth having as a single page."
chapter: 15
order: 15
draft: false
pubDate: 2026-05-05
---
# 15 - Appendix

Reference material that didn't fit cleanly into the chapter flow but is worth having as a single page.

---

## 15.1 - Keyboard shortcuts

V1 inherits the standard macOS shortcuts and adds a small set for the timeline. Most of what you'd expect from a Mac app works the way you'd expect.

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

### Action panel (multi-select)

| Shortcut | Action |
|---|---|
| **Esc** | Clear selection |
| Click "Acknowledge all (N)" | Bulk ack |
| Click "Dismiss all (N)" | Bulk dismiss |

### Score Editor

The Score Editor uses on-screen buttons for Save and Reset rather than dedicated keyboard shortcuts in V1. Standard text-field editing shortcuts (Cmd-A, Cmd-C, Cmd-V, Cmd-Z within an active text field) work as on any macOS form.

### Menubar item

| Shortcut | Action |
|---|---|
| **Click menubar icon** | Open menu |
| Menu → Settings… | Same as Cmd-, |
| Menu → Quit Tempo | Same as Cmd-Q (with menu shortcut "q" inside the menu) |

---

## 15.2 - macOS native integrations

A few standard macOS surfaces Tempo participates in:

### URL scheme

Tempo registers the `tempo://` URL scheme for deep linking:

- **`tempo://event/<id>`**: focus the timeline on the event with the given ID (matches against both internal `id` and `externalID`). The window comes forward automatically. Unknown IDs are silent no-ops

Use cases: an Apple Shortcut or a script that wants to jump to a specific event after some external action; a Hookmark link to a Tempo event from a note.

### Drag and drop

- Drag a `.tempo-score` file onto the Tempo dock icon or window → opens the Score Review Sheet
- Drag a JSON file from `~/Library/Application Support/Tempo/Scores/` to another location → standard macOS file copy

### Sparkle auto-update

V1 ships with [Sparkle](https://sparkle-project.org/). Tempo checks for updates on a configurable interval (default daily) and prompts you to install when a new version is available; you can also trigger a check manually from **Tempo → Check for Updates…** in the menubar. Updates are fetched from `downloads.tempoapp.app` and verified against an EdDSA signature embedded in the appcast.

Spotlight indexing, Quick Look previews for `.tempo-score`, and a Share Extension are not part of V1; they're candidates for a future release.

---

## 15.3 - Privacy

Full privacy notice at [tempoapp.app/privacy](https://tempoapp.app/privacy).

Short version:

- **No accounts.** No login, no signup, no email required to use Tempo
- **No cloud sync.** All data lives in `~/Library/Application Support/Tempo/` on your Mac
- **No third-party telemetry.** Tempo doesn't ship analytics to any analytics service. V1 has no usage telemetry of any kind, opt-in or otherwise
- **Calendar and Reminders access** is via macOS EventKit and respects the system permission you granted. Calendar contents stay between Calendar.app, EventKit, and Tempo; nothing leaves your Mac
- **The ingestion server** binds to your LAN by default. Per-provider tokens authenticate every request. Audit log records every accept and reject

If you have specific concerns about what Tempo does with a particular kind of data, the privacy page goes into detail. The short version is: it's all local, it's all under your control, and the audit log is there for forensics if you ever want to verify it.

---

## 15.4 - License

Full license text at [tempoapp.app/license](https://tempoapp.app/license). LICENSE.txt in the application bundle is the same.

Short version:

- **Tempo 1.x is and will remain freeware**: distributed free of charge, free for personal and commercial use. Existing and future 1.x releases stay free; whether a future major version (2.0) is paid is a data-driven decision (see below)
- **Provided as-is, without warranty of any kind.** You're responsible for the scores you install and the actions they perform. The license & disclaimer are linked from the About panel in-app
- **After v2 ships, v1 will continue to receive security fixes only**: no new features, no behavioural changes. Direct support migrates to v2

The licensing approach is meant to be transparent: V1 is freeware-with-no-warranty, distributed broadly to find product-market fit. V2 is conditional and may be paid; that decision is data-driven, not date-driven.

---

## 15.5 - Credits

Tempo is built on the shoulders of a great deal of open-source software. The full credits live in the **About** panel in-app and in the LICENSE.txt of the application bundle.

Notable dependencies:

- **Sparkle**: auto-update framework for macOS apps. [sparkle-project.org](https://sparkle-project.org/)
- **SQLite**: embedded SQL database. [sqlite.org](https://sqlite.org/)
- **SwiftUI / EventKit / Foundation**: Apple frameworks
- **SF Symbols**: Apple's icon library

The bundled scores reference and integrate with many third-party tools (Kopia, UniFi, Home Assistant, Uptime Kuma, GitHub Actions, Synology, the *arr stack (Sonarr / Radarr / Prowlarr), Jellyfin, Beszel, Vaultwarden, Pi-hole, Hazel, Todoist, and more), none of which are dependencies of Tempo itself; they're upstream sources Tempo *receives from*.

Community-contributed scores beyond the bundled set live in the [public score catalog](https://github.com/caereforge/tempo-scores) and are credited in the catalog repo's CONTRIBUTING.md and at the top of each score file.

---

## End of guide

Thanks for reading.

If something didn't land (a chapter that left you confused, a section that should have existed, a phrasing that read awkwardly) file an issue at [github.com/caereforge/tempo-site/issues](https://github.com/caereforge/tempo-site/issues), or join the Discord at [tempoapp.app/community](https://tempoapp.app/community/).

Documentation is the surface that compensates for V1 not having a Visual Action Builder yet. We take it seriously, and we'd rather hear that something didn't work than have you struggle through it alone.

- *the Tempo docs*
