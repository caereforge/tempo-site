---
title: "FAQ"
description: "Answers to the most common questions about Tempo: pricing, privacy, sandboxing, integrations, V2 plans, and bundled versus community scores."
chapter: 13
order: 13
draft: false
pubDate: 2026-05-05
---
# 13 - FAQ

The questions that come up most. Each answer is short; the deeper material is in the rest of the User Guide.

> 💡 **Note**: this FAQ is the docs version, more detailed than the one on the public website. The website FAQ is the marketing-page handful; this one is for users with the app in front of them.

---

## About Tempo

### Why is it called Tempo?

Two senses, both intentional.

*Tempo* is the musical term for the pace of a piece, which is what your homelab has, whether you notice it or not: a pulse of events across machines, some steady, some spiking.

And a conductor doesn't play the instruments. They give the ensemble a shared sense of time, and they decide when something needs attention. That's the posture Tempo is built around: you stay the conductor. Tempo is the score in front of you.

### What is Tempo, exactly?

A native macOS app that pulls every signal from your machines (Home Assistant, Uptime Kuma, Kopia, UniFi, CI/CD, custom scripts) into one chronological timeline, alongside your calendar and reminders.

Each event ships with the actions you'd reach for: SSH, dashboard, terminal command, copy to clipboard. One place to see what's going on; one click to do something about it.

Tempo shows and proposes; in V1 it never acts on its own.

### What Tempo *isn't*

- **Not a calendar app.** No daily/weekly/monthly grids; no event editing
- **Not a task manager.** Reads your reminders, completes them on click; doesn't create or edit them
- **Not a monitoring tool.** Receives signals from monitoring tools; doesn't run probes itself
- **Not Notification Center.** Persistent, semantic, agentic: a different shape entirely
- **Not IFTTT or Zapier.** V1 is human-in-the-loop; V2 will support some automations, but Tempo isn't a generic flow engine

See [§1.2](/docs/01-introduction#12---what-tempo-is-what-it-isnt) for the longer treatment.

### How is Tempo different from a Home Assistant dashboard?

Home Assistant is great inside its own world. But your homelab isn't only HA: it's also your NAS backups, monitoring stack, GitHub Actions, network gear, and the calendar/reminders on your Mac.

Tempo isn't trying to replace any of those dashboards. It sits on top, surfaces the events that need your attention, and gives you one place to act on them.

### Why not n8n, Node-RED, or another automation tool?

Those automate server-side workflows. Tempo centralises *visibility and decision* on your Mac. It reads your local calendar and reminders (things server-side tools can't touch), puts them alongside infra signals, and lets *you* decide what to do.

They're complementary: Tempo can be the human-facing surface in front of an n8n flow.

---

## Pricing and distribution

### How much does Tempo cost?

**Tempo v1 is free, forever.** No trial, no Free/Pro tiers, no subscription, no account required.

A future v2 may be a paid one-time purchase. The path from V1-free to V2-paid is data-driven, not calendar-driven; we'll know more after V1 has been in the field for a while. See [the freeware announcement](https://tempoapp.app/blog/tempo-goes-freeware/) for the longer reasoning.

### Will it be on the App Store?

No. It's distributed as a signed and notarised DMG (Developer ID), with auto-update via Sparkle.

The reasoning: outside the App Store sandbox so the LAN ingestion server, terminal commands, and the rest of Tempo's actions all work without restriction.

### Where do I download it?

[downloads.tempoapp.app](https://downloads.tempoapp.app), always the latest release. [tempoapp.app/changelog](https://tempoapp.app/changelog) lists what changed in each version.

### Will Tempo continue to receive updates after v2 ships?

Yes. After v2 ships, v1 will continue to receive **security fixes only**: no new features, no behavioural changes. v1 is free forever; v1 users have no obligation to upgrade.

Support for v1 will move to community channels (Discord and GitHub issues); direct support from the publisher will focus primarily on v2 and later releases.

---

## Privacy and security

### Is my data safe? Does Tempo send anything to the cloud?

No account, no cloud sync, no third-party telemetry. Everything lives in a local SQLite database on your Mac.

The HTTP ingestion server is LAN-reachable (so your homelab can post to it) but never exposed to the internet. It accepts only authenticated requests from per-provider tokens stored in the macOS Keychain.

Tempo does not collect or transmit telemetry of any kind in V1. The ingestion server is plain HTTP on the LAN by default; a native TLS listener (opt-in, port `8776`, with a per-token *Require TLS* flag) shipped in 1.1. See [§8 - Settings](/docs/08-settings-reference#secure-tls) and the [security page](/security/#tls).

### Where exactly does my data live?

`~/Library/Application Support/Tempo/`:

- `Tempo.sqlite`: events database
- `Scores/`: score JSON files
- `rejections.csv`: rejected-ingestion audit log (capped at the last 500 rows; accepted events and full history live in OSLog, not a file here)

Plus `~/Library/Preferences/app.tempoapp.Tempo.plist` for settings, and macOS Keychain for ingestion tokens.

See [§9.1](/docs/09-backup-restore#91---where-your-data-lives) for the full breakdown.

### Can I take Tempo's events with me?

Yes. The database is plain SQLite: you can read it with any SQLite client, query it from Terminal, export to CSV, etc. Your scores are JSON files. Your settings are in a standard macOS plist.

There's no proprietary format anywhere. Tempo is a viewer over data you own; if you stop using Tempo, the data stays where it is.

---

## Sources and integration

### Does Tempo work with CalDAV calendars (Fastmail, Nextcloud, iCloud)?

Yes. Tempo reads from Apple Calendar via EventKit, which natively syncs CalDAV accounts. If a calendar shows up in Calendar.app, it shows up in Tempo.

### What about Google Calendar / Outlook 365?

Same path: anything you've connected in macOS Internet Accounts (System Settings → Internet Accounts) appears in Calendar.app, which appears in Tempo. EventKit is the bridge.

V2 roadmap includes potential native OAuth integration for Google Calendar / Outlook to bypass macOS Internet Accounts (faster sync, more granular control). V1 uses the Calendar.app path.

### Can I add a custom source not in the bundled list?

Yes. Anything that can POST JSON can send events. See [§10.2 - Generic webhook](/docs/10-sources-reference#102---generic-webhook) and [§11 - Score authoring](/docs/11-score-authoring).

### Can I use Tempo for non-homelab things like work alerts or personal automations?

Yes. The wedge audience is homelab/sysadmin, but Tempo doesn't know or care what kind of events you send it. Calendar entries from work, reminders from your task manager (via iCal subscription), webhooks from a Zapier workflow, custom shell scripts: all the same to Tempo.

The bundled scores skew homelab because that's where we expect most early users to come from. The score system is generic.

### Is there a Tempo for Linux / Windows?

No. Tempo is native macOS, built on SwiftUI / EventKit / macOS-specific frameworks. Porting isn't on the roadmap.

For Linux, the closest analogue is something like [Glance](https://github.com/glanceapp/glance) or homer-style dashboards: different shape (web-based, server-side) but overlapping use case.

### What if I need more help with a specific source?

Each source, built-in or downloadable, has its own page in the [Scores catalog](/scores/) with setup, behaviour notes, default actions, and a source-specific FAQ. Start there if your question is about a particular source rather than Tempo as a whole.

---

## Customisation

### Can I customise what actions appear for each event?

Yes. This is the core of Tempo. Every event type has its own action set, defined in the source's [score](/docs/14-glossary#score). You can edit bundled scores in the Score Editor or write your own from scratch.

See [§7 - Score Editor](/docs/07-score-editor) for hands-on; [§11 - Score authoring](/docs/11-score-authoring) for the developer reference.

### Can I add a custom button to events?

Yes, by editing the source's score file directly. The Score Editor handles colors, severity rules, and display names; action buttons are authored as JSON in V1. The blog post [Adding a button to Tempo events](/blog/adding-a-custom-action-button/) walks through the full flow with a concrete example. See also [§11 - Score authoring](/docs/11-score-authoring) for the reference.

### Can I write my own scores?

Yes. The score system is the canonical configuration surface. Documented end-to-end in [§11 - Score authoring](/docs/11-score-authoring), with a worked example.

### Can I share my scores with other Tempo users?

Yes. The public catalog at [github.com/caereforge/tempo-scores](https://github.com/caereforge/tempo-scores) accepts community contributions. Submit a PR, and maintainers review for safety and quality before merge.

### Can I theme Tempo?

Light / Dark / System theme switching is in V1. Custom themes (drop-in JSON in `~/Library/Application Support/Tempo/Themes/`) are V1.1. A visual theme editor is V2 candidate.

---

## Day-to-day usage

### How do I migrate to a new Mac?

See [§9.4 - Restoring on a new Mac](/docs/09-backup-restore#94---restoring-on-a-new-mac). Short version: take a backup before the move, install Tempo on the new Mac, restore the backup, recreate ingestion tokens.

### How do I keep my feed quiet?

Several levers:

- **Auto-ack** events older than a threshold so they stop demanding attention (Settings → Maintenance → Auto-ack)
- **Auto-dismiss** events older than a longer threshold so they drop off the feed entirely (Settings → Maintenance → Auto-dismiss)
- **Hide** sources you don't currently care about (source row → ⓘ → Hide from timeline)
- **Tighter grouping** in the Score Editor for noisy sources

See [§8.4 - Maintenance](/docs/08-settings-reference#84---maintenance).

### How do I bulk-acknowledge or bulk-dismiss?

Cmd-click multiple events to multi-select, or Shift-click for a range. The action panel switches to multi-select mode with "Acknowledge all (N)" and "Dismiss all (N)" buttons.

See [§6 - Action panel](/docs/06-action-panel).

### Why is the heatmap unfiltered?

Deliberate. The heatmap is your *temporal awareness* surface. Even when you've filtered the feed to one source, you should still see at a glance that something happened in another source an hour ago. Filtering the heatmap would hide that signal.

The feed itself is filtered, the heatmap isn't.

### What's the difference between Acked and Dismissed?

- **Acked** = "I've seen this, I'm leaving it in the feed." Cosmetic state; event stays visible
- **Dismissed** = "I've handled this, get it out of my way." Event drops off the active feed but stays in the database

Both are reversible. See [§5.3 - Acknowledged events](/docs/05-event-panel#53---acknowledged-events) and [§2.5 - Severity, state, acknowledgment, dismissal](/docs/02-concepts#25---severity-state-acknowledgment-dismissal).

---

## When something's wrong

### Events aren't arriving from a source I just configured

Most common cause: networking. See [§12.1 - Networking](/docs/12-troubleshooting#121---networking-lan-ingestion).

Second most common: token mismatch, token bound to the wrong provider, or wrong token in the upstream config. Check Settings → Ingestion → Tokens.

### A bundled score's behaviour seems wrong after an update

Tempo doesn't overwrite your local edits to bundled scores when the app updates. If a bundled score improved in the update and you want the new behaviour, quit Tempo, delete that score's file from `~/Library/Application Support/Tempo/Scores/<provider>.json`, and relaunch. Tempo reseeds the bundled version on startup. (Duplicate the score first if you want to keep your customizations.)

See [§7.8 - Persistence and reset to defaults](/docs/07-score-editor#78---persistence-and-recovery).

### My Mac is slow with Tempo running

A few common causes and fixes in [§12.5 - Performance with many sources](/docs/12-troubleshooting#125---performance-with-many-sources). Usually retention or noisy-source grouping.

### How do I report a bug?

- **Settings → Help → Export diagnostics bundle** for the supporting evidence
- **Discord** at [tempoapp.app/community](https://tempoapp.app/community/) for quick discussion
- **GitHub Issues** for tracked bugs

A diagnostic bundle attached to your bug report makes triage 10x faster.

---

## Roadmap

### Will Tempo support automations (auto-fire actions)?

V2 roadmap. V1 is strictly human-in-the-loop. V2 plans to add per-rule automations: user defines conditions, Tempo runs the action automatically when conditions match. With audit log + kill switch + opt-in by default.

### Will Tempo have a mobile app?

A separate companion app, **Tempo Lite** for Mac + iOS, is on the roadmap. It's an aggregator over Calendar, Reminders, HomeKit, Focus, Health (no homelab/webhook ingestion). Different positioning, different audience. The V1 product covered by this guide is Tempo for macOS only.

### Will Tempo open the source code?

Tempo's application code is closed-source. The score schema is open and the public catalog repo is open-source, and we welcome score contributions. The app itself is closed for V1 freeware; whether to open later is a decision that hasn't been made.

The site (`tempo-site`) is open-source on GitHub.

### What's "v1.x" vs "v2"?

- **v1.0** is the current launch (May 2026)
- **v1.x** are post-launch updates within the v1 line: bug fixes plus features that didn't make the launch cut (Visual Action Builder UI for some score features, in-app score browser, etc.)
- **v2** is a future major release that may add automations, OAuth integrations for Google/Outlook calendar, and advanced features. v2 is conditional on V1 traction
