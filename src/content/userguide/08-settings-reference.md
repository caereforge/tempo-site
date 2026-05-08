---
title: "Settings reference"
description: "Tempo's Settings window has five tabs: **Interface**, **Agenda**, **Ingestion**, **Maintenance**, **Help**."
chapter: 8
order: 8
draft: false
pubDate: 2026-05-05
---
# 8 — Settings reference

Tempo's Settings window has five tabs: **Interface**, **Agenda**, **Ingestion**, **Maintenance**, **Help**. This chapter walks each tab section by section, explaining what every control does and when you'd use it.

Open Settings via **Cmd-,** or via the menubar icon → **Settings…**.

---

## 8.1 — Interface

The Interface tab covers visual preferences — appearance, layout toggles, badge contrast, heatmap rendering.

### Theme

- **Theme** — Light / Dark / System Default

Mirrors the menubar icon's Appearance submenu. Available here too because on macOS 26 you can hide the menubar icon entirely; in that case the Interface tab is your only switch.

### Startup

- **Launch Tempo at login** — when enabled, macOS starts Tempo automatically when you log in

This wires up `SMAppService` under the hood. You can also manage it from **System Settings → General → Login Items**, where Tempo will appear in the list of apps that start at login.

### Footer

- **Show system stats footer** — toggles the compact bar at the bottom of the main window showing CPU, memory, disk, and network usage of this Mac

The footer is small (a single thin row of meters) and runs at low CPU cost. Off by default; turn it on if you want a glanceable resource view alongside the timeline.

### Appearance

- **Contrast-aware badges** — when enabled, status pills (OVERDUE, COMPLETED, BACKUP OK) swap to a contrasting hue if they'd otherwise blend into the source colour

Use case: you've coloured a source bright yellow, and a yellow `WARNING` pill on a yellow card is illegible. Contrast-aware badges detect the collision and shift the pill colour to keep both readable. Turn off if you prefer strict semantic colours regardless.

- **Card stripe meaning** — picks what the 3-pixel left edge stripe on each card encodes:
  - **Severity** (default) — the event's severity colour (red / yellow / green / source-fallback)
  - **Source** — always the source colour, useful in multi-source setups when source identity matters more than severity at a glance

The severity stripe stays stable after you ack or resolve an event — the triage state is conveyed by the Acked / Resolved pills, not by the stripe.

- **Activity heatmap style**:
  - **Rounded pills** (default) — soft halo around active hours
  - **Flat cells** — independent rectangular hour cells

- **Heatmap colours** — three pickers, one per semantic family:
  - **Heatmap · Info** — covers regular events
  - **Heatmap · Warning** — covers warning- and error-level events
  - **Heatmap · Critical** — covers critical events (and hours dominated by errors)

Defaults are tuned to be legible in both light and dark modes; override only if you have a strong preference.

### Accessibility

- **Colourblind mode for activity heatmap** — adds a vertical-fill encoding to the 24h heatmap (taller fill = more severe), so severity reads even when colours don't

> 💡 **Note**: as of V1, this is the only colourblind affordance in Tempo. A full audit (event-card severity colouring, source-row badges, action-panel pills) is on the V1.x roadmap.

---

## 8.2 — Ingestion and tokens

The Ingestion tab is where you configure the HTTP server that receives events from external sources.

### Network

- **Listen on port** — the TCP port Tempo's ingestion server binds to. Default `7776`. Valid range 1024-65535. Changes require a Tempo restart to take effect (the active port is shown until restart)
- **Limit to loopback only** — when enabled, only `localhost` (this Mac) can reach the ingestion endpoint. Off by default — Tempo binds `0.0.0.0` so other machines on your LAN can post events

The default (LAN-reachable) is intentional. Most homelab users have monitoring tools running on dedicated hardware (NAS, Raspberry Pi, dedicated server) that need to send events to Tempo on the Mac. Loopback-only would make Tempo useless for that wedge.

If you don't have any external sources and just want Tempo for Apple Calendar + Reminders + the occasional curl test, loopback-only is fine.

> 🛑 **Critical**: Tempo's ingestion server uses **per-provider tokens** for authentication, not a shared secret. Every external sender should have its own token, bound to the providerIdentifier it sends as. If a token leaks (a script's GitHub repo accidentally pushed it, a NAS got compromised), revoke just that token without affecting other senders. See the Tokens section below.

### Tokens

The Tokens section lists every active ingestion token. Each row shows:

- **Token name** (something descriptive — "Kopia NAS," "check_disk script")
- **Bound provider** (if any) — the providerIdentifier this token is allowed to send as
- **Token value** preview (first/last few characters, with a copy-to-clipboard button)
- **Status** — Active / Revoked
- **Action menu** — Regenerate, Revoke, Delete

#### Adding a token

The **+ Add token** button opens a sheet:

- **Name** — descriptive label, e.g., "Kopia NAS" or "check_disk script"
- **Bind to a specific provider** (toggle) — when on, takes a `providerIdentifier` like `com.kopia` or `scripts.shell`. The token will reject any payload whose `providerIdentifier` doesn't match

Bound tokens are the recommended pattern. Unbound tokens are convenient for testing but mean a leak compromises every source equally.

#### The X-Tempo-Token header

Every POST to `/ingest` must include the token in the `X-Tempo-Token` header:

```
POST /ingest HTTP/1.1
Content-Type: application/json
X-Tempo-Token: <your-token-here>

{ ... }
```

Tokens are stored in your macOS Keychain (not on disk in cleartext). Tempo retrieves them at server startup; rotating a token in Settings updates the Keychain entry and forces re-authentication on the next request.

> ⚠️ **Warning**: revoke a token that you're not using. Idle tokens are still valid; an attacker who finds one (in an old commit, in a leaked backup, in a screenshot you posted to a forum) can still hit your Tempo instance with it. Tokens cost nothing to delete; deleting a stale one is the single best housekeeping action you can take.

#### Audit log

Every ingestion attempt — accepted or rejected — is logged via Apple's unified logging system (`os.Logger`). Filter by subsystem `app.tempo.tempo` in **Console.app** to see the trail. The log captures:

- Timestamp
- Source IP
- Token name (never the value)
- Provider identifier
- Accept / reject result, with reason on rejection (invalid token, malformed JSON, rate-limited, etc.)

Useful for diagnosing "why didn't my event arrive?" — see [§12.3 — A score isn't appearing](/docs/12-troubleshooting#123-a-score-isnt-appearing).

In V1 the audit log is not exposed inside the Ingestion tab itself. To inspect it live, open **Console.app** and filter by subsystem `app.tempoapp.Tempo`. To share it with support, use **Help → Export diagnostics bundle…** — the bundle includes the last 24 hours of OSLog output (no token values, no payload contents).

---

## 8.3 — Agenda

The Agenda tab controls how Apple Calendar entries and Reminders flow into Tempo.

### Show personal agenda

A toggle at the top of the tab. When off, Tempo doesn't show calendar entries or reminders in the timeline at all — you're using Tempo for monitoring/webhook events only.

The same toggle is mirrored in the menubar icon's **View → Show personal agenda** submenu, so you can flip it without opening Settings.

### Calendar allowlist

A list of every macOS calendar Tempo has access to, with a checkbox on each one. Tick the calendars whose events should appear in Tempo; untick the ones you'd rather keep out (e.g., a shared work calendar that's noisy with events you've already triaged in another tool).

Only ticked calendars feed the timeline. Unticked calendars are still visible in Calendar.app, just not in Tempo.

### Reminders allowlist

Same shape, for Reminders lists. Tick the lists you want; untick the rest.

### EventKit-mediated state

Calendar and reminder data flows through Apple's EventKit framework. A few caveats worth knowing:

- **Updates are notification-driven** — when you mark a reminder done in Reminders.app, Tempo updates within a second via the EventKit notification. Most of the time this is invisible; occasionally EventKit doesn't notify for a particular kind of change, and Tempo's view stays a few minutes stale until the next periodic refresh
- **iCloud sync delays compound** — if your reminders sync from another device via iCloud, EventKit waits for the iCloud sync before notifying Tempo. A reminder you complete on iPhone might take 10-30 seconds to reflect in Tempo, depending on iCloud's batch interval
- **Edge cases with task manager bridges** — if you use a task manager (Todoist, OmniFocus, Things, TickTick) that syncs to a calendar app via iCal subscription, Tempo reflects only what EventKit sees. Latency depends on the subscription refresh frequency and the task manager's export cadence

For a more thorough discussion, see [§12.2 — Apple Calendar sync issues](/docs/12-troubleshooting#122-apple-calendar-sync-issues) and [§10.1 — Apple Calendar and Reminders](/docs/10-sources-reference#101-apple-calendar-and-reminders).

---

## 8.4 — Maintenance

The Maintenance tab is the umbrella for housekeeping behaviours: rules that fire on a schedule (auto-ack, auto-dismiss), the source liveness threshold, and the database (retention, backups).

A segmented picker at the top of the tab switches between four sub-sections: **Auto-ack**, **Auto-dismiss**, **Liveness**, **Database**.

### Auto-ack

Auto-ack rules automatically acknowledge events older than a configurable threshold. The badge stops flagging them, but they stay in the feed until dismissed (manually or by an auto-dismiss rule). Set ack faster than dismiss for the smoothest flow.

#### Global defaults (per severity)

Five rows, one per severity, each with a threshold picker:

- **Info** — default **6 hours**
- **OK** — default **6 hours**
- **Warning** — default **24 hours** (one full day, covering an overnight cycle)
- **Error** — default **Never** (real incidents stay loud until you acknowledge them)
- **Critical** — default **Never**

The threshold options on each picker are: **Never, 1h, 6h, 12h, 1 day, 3 days, 7 days**.

#### Per-source overrides

Below the global defaults, a list of sources Tempo has seen, each with an "Edit" button to override the globals for just that source. Useful when one source produces info-noise (Kopia "No Change" results) you want cleared faster than info events from a chattier source.

Sources without an explicit override use the globals.

### Auto-dismiss

Same shape as Auto-ack, but instead of acking, the rule **dismisses** the event after the threshold — removing it from the active feed entirely (still in the database, still in source history).

Auto-dismiss rules run hourly. Dismissed events stay in the database (subject to the retention policy in the Database tab) — they just drop off the live timeline so you don't have to keep dismissing stale rows manually.

#### Per-source rules

The Auto-dismiss tab is per-source by default — each source has its own enable/threshold setting. There's no global default for auto-dismiss; you opt in per source as you decide it's worth it.

### Liveness

The Liveness tab sets the threshold below which a source's bolt indicator stays lit. A source is "live" if it has emitted any event within the threshold; silent for longer, the bolt disappears and the badge drops to outline-only or vanishes.

#### Global default

- **Default threshold** — defaults to **24 hours**

Short enough to spot a quiet monitor within a day, long enough not to alarm on any source that ticks daily or weekly.

#### Per-source overrides

Same pattern as auto-ack: a list of sources with Edit buttons. Override the default for sources whose tempo isn't "about a day."

- High-frequency sensor pinging every hour → 1h, so silence shows up fast
- Weekly Kopia snapshot → 7d, so the bolt doesn't disappear between runs
- Hourly cron job → 2h, so a missed run is visible

### Database

The Database tab covers permanent retention plus app backups.

#### Retention

- **Keep events for** — picker with options **Forever** (default), 30 days, 90 days, 6 months, 1 year, 2 years

Permanently deletes older events from the database on app launch and when the setting changes. Default keeps everything.

> 💡 **Note**: the activity heatmap visualises the last 84 days. Setting retention shorter than 84 days will leave the corresponding tiles permanently empty — historical activity outside the retention window can't be reconstructed. Dismissed events keep contributing to the heatmap until they fall out of retention.

For most users, **Forever** is the right choice. Tempo's database is small (most events are a few hundred bytes) and disk space is cheap. Pick a window only if your timeline grows large enough to feel slow (millions of events) or you have policy reasons to limit retention.

#### App backup

- **Backup interval** — picker (e.g., Off / Daily / Weekly / On-demand only)
- **Destination** — file picker showing your chosen backup directory
- **Keep last** — how many backup bundles to retain (older ones are pruned)
- **Backup now** — runs an on-demand backup immediately

Each backup is a **`.tempobackup` bundle** containing:

- The SQLite database (as a `VACUUM INTO` snapshot — safe to take while Tempo is active)
- Your preferences (UserDefaults)
- The `Scores/` folder (your customised and bundled scores)

Backup bundles are named `tempo-backup-YYYYMMDD-HHmmss.tempobackup` and pruned beyond the retain count.

> 🛑 **Critical**: ingestion tokens are stored in the macOS Keychain and are **never written to the backup bundle**. When you restore on a new Mac, you'll need to recreate or re-install your ingestion tokens manually. Everything else (events, settings, scores, source colours, auto-rules) is in the bundle and restores automatically.

The recommended destination is **iCloud Drive** — sync is transparent, backups land on every device that's signed into the same iCloud account. Local paths or mounted remote filesystems work too; Tempo just writes to the path you give it.

The interval picker offers: **Off, every 6 hours, every 12 hours, every 18 hours, every 24 hours, every 2 days, every 7 days, every 30 days**. There's also a **Backup now** button next to the schedule for on-demand snapshots that are independent of the cadence.

#### Restore from backup

A **Restore from backup…** button lives in the Database tab next to the backup destination controls. It opens a file picker scoped to `.tempobackup` bundles, previews what's inside, and applies the bundle atomically with a relaunch. Detailed walkthrough in [§9.4 — Restore from a backup](/docs/09-backup-restore#94--restore-from-a-backup).

---

## 8.5 — Help

The Help tab is the support handoff surface. Two main jobs: explain the source-panel badge legend in detail, and let you export a diagnostic bundle.

### Source panel badges

A live legend showing all five badge variations (Red / Yellow / Green / Outline only / Bolt / Number) with sample swatches and the same descriptive text the source-row tooltips use. Same vocabulary; same in-context cue you'd see from hovering a real badge.

Useful as a printable reference if you want to onboard another household member or a colleague to your Tempo setup.

### Diagnostics

- **Export diagnostics bundle…** — creates a zip with:
  - App version and build number
  - Configuration summary (which sources are connected, retention setting, auto-rule overrides)
  - The last 24 hours of Tempo's OSLog output

The bundle excludes:

- Token values (only token names appear)
- Event payloads (no metadata, no titles)
- Calendar contents

Attach it to a Discord support thread or a GitHub issue when reporting a problem. The whole bundle is usually 50-200 KB.

After export, Tempo offers **Show in Finder** so you can locate the file before sending.

### Where the rest of the support links live

The Settings → Help tab is intentionally narrow: badge legend + diagnostics export. Everything else lives in the **menubar** so it's reachable without opening Settings:

- **Tempo → About Tempo** — version, build, credits
- **Tempo → Check for Updates…** — Sparkle update check
- **Help → Tempo Documentation** — opens [tempoapp.app/docs](https://tempoapp.app/docs/)
- **Help → Community** — opens [tempoapp.app/community](https://tempoapp.app/community/) (Discord invite)
- **Help → Privacy Notice** — opens [tempoapp.app/privacy](https://tempoapp.app/privacy)
- **Help → License & Disclaimer** — opens [tempoapp.app/license](https://tempoapp.app/license)

---

## Where to go from here

- **Backing up properly before a migration** → [§9 — Backup and restore](/docs/09-backup-restore)
- **Tuning a noisy source** → [§7.5 — Stack grouping](/docs/07-score-editor#75-stack-grouping) for grouping; **Auto-ack** in this chapter for severity-aware aging
- **Troubleshooting unexpected behaviour** → [§12 — Troubleshooting](/docs/12-troubleshooting)
- **Per-source colour and display name overrides** → [§4 — Source panel](/docs/04-source-panel)
