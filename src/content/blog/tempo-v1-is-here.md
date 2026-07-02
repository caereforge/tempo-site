---
title: "Tempo v1 is here. Every signal, one timeline."
description: "Tempo v1 ships today as freeware: a native macOS event hub that puts every webhook, backup, monitor, and calendar entry on one timeline. Local-first, LAN-ready."
pubDate: 2026-05-14
tags: ["announcement", "release", "launch"]
draft: false
---

*📅 May 14, 2026 · Leo from Caereforge*

After months of solo work, **Tempo v1 is live**. Signed, notarized, Homebrew and Sparkle-ready, on the Downloads page.

First, I would like to thank all of those who have asked questions, provided suggestions or even unwillingly pointed me to a reflection: you have really helped shape Tempo from the beginning.

This is meant as the canonical "what is it, who's it for, how do I get it, what's missing". Bookmark and link to it freely.

### What Tempo is

A native macOS event hub. Anything that can POST JSON to a LAN endpoint shows up on a single chronological timeline, optionally side-by-side with your calendar entries and reminders. Each event carries its context, with the actions you'd reach for already available: SSH to a host, open a tool's dashboard, restart the container, copy the IP, acknowledge the incident.

**You stay the conductor. Tempo holds the score, and in v1 it never acts on its own.**

The "score" is a small JSON file that defines how an event is represented in its card, severity rules you want to apply, grouping policy, and default actions for a source. Tempo ships with twenty bundled scores at launch and growing: UniFi Network and Protect, Kopia, Uptime Kuma, Home Assistant, GitHub Actions, Synology, Beszel, Jellyfin, the *arr stack (Sonarr / Radarr / Prowlarr / Jellyseerr), Pi-hole, Vaultwarden, Todoist, Apple Shortcuts, Scripts (your own bash/python/etc.), and Hazel. Apple Calendar and Reminders are pre-wired via a built-in EventKit provider, no score installation needed. More are available to download.

Local SQLite database. No account. No cloud sync. No telemetry. The HTTP ingestion server binds your LAN so a NAS, a Home Assistant box, or a monitoring stack on a different host can post to it directly, with per-provider tokens, an audit log, and optional TLS.

### Why I built it

I spent most of my career as a Unix sysadmin. The instinct that survives that work is simple: the machine doesn't care how pretty your dashboard is. It cares whether you notice the thing that matters, in time.

Then I came home from that and kept doing the same thing for myself. A homelab grew. Home Assistant, a UniFi stack, Uptime Kuma, Kopia backups, a couple of always-on services, GitHub Actions for side projects, the calendar and reminders that actually run my life. Several browser tabs every day, each speaking its own language, none of them talking to each other.

Dashboards didn't solve it, they ask you to look at them. What I wanted was the Unix instinct expressed through the Mac: the terminal and the craft of native macOS design, in one surface. Local-first, because the data stays on my machines. LAN-reachable, because the services don't run on the Mac. I built it to never act on its own for v1, because I wanted control, but it will eventually run automations when thoroughly tested.

Tempo is that tool.

### Who it's for

The wedge audience is homelab enthusiasts, Home Assistant users, self-hosters, sysadmins running a Mac as their daily driver. If you have a NAS, a UniFi controller, a Kopia backup running somewhere, an Uptime Kuma instance, and the urge to stop juggling seven dashboards, Tempo is built for you.

The secondary audience (but not by relevance) is any Mac power user who'd benefit from a unified timeline that integrates calendar + reminders + alerts + webhooks + automation outputs. You don't need a homelab to use Tempo. Apple Calendar + Reminders + a Hazel rule that POSTs a webhook, or an Apple Shortcut (in v1.x) that does the same, already gives you something useful out of the box.

### What v1 doesn't do

A few things are deliberately out of scope for v1. I want to set expectations cleanly:

- **No auto-firing actions.** Everything is user-triggered. v2 may bring conditional auto-fire, gated behind explicit trust opt-in. v1 needs a human action, always.
- **No drag-and-drop action builder.** The built-in Score Editor already edits actions on its Actions tab — add and edit buttons (label, icon, trigger, `${metadata}` payload) with no JSON, alongside severity rules, presentation, grouping, and per-event matching. You can still edit the score's JSON directly. A richer drag-and-drop / live-preview builder is a v2 candidate.
- **No Google Calendar / Outlook OAuth.** v1 reads from Apple Calendar via EventKit, which natively syncs any CalDAV account (Fastmail, Nextcloud, iCloud). For Google/Outlook the path is "subscribe the calendar in Apple Calendar.app". Native OAuth is v2.
- **No outbound automation.** Tempo shows and proposes. It never sends. v2 may extend this for users who explicitly opt in.

For the full "what Tempo isn't" list, see the [scope-and-discipline post](/blog/what-tempo-is-not/).

### Pricing

**v1 is freeware. Forever, for everyone who installs it.** No trial, no Free/Pro tiers, no subscription, no account required. The full reasoning is in the [freeware announcement post](/blog/tempo-goes-freeware/), but the short version: I want the v1 community to shape what v2 looks like, and freeware v1 is how I get out of the gate without paywall friction.

v2 may eventually be a paid one-time purchase, if v1 finds an audience and the community asks for things that justify a second major release. That's a 2026/2027 question, not a today question.

### Get Tempo

- **[Download the DMG](https://downloads.tempoapp.app/Tempo-latest.dmg)** (7 MB, signed and notarized for Developer ID, macOS 15+). You can also choose to use Homebrew.
- **[Full user guide](/docs/)**: fifteen chapters covering concepts, setup, score authoring, troubleshooting, glossary
- **[Score catalog](/scores/)**: bundled scores plus community contributions (Pi-hole, Proxmox, Jellyfin, Vaultwarden, Hazel)
- **[Roadmap](/roadmap/)**: what's coming in v1.1, v1.2, and beyond, driven by what you ask for

For questions, feedback, or score contributions: the [tempo-scores repo on GitHub](https://github.com/caereforge/tempo-scores) takes issues and pull requests.

### A note on AI

Tempo's author and architect is me. Design, architecture, and testing are mine; implementation is AI-assisted with Claude Code. The why and the how, including which patterns I use day-to-day and what I think about "vibe-coded" as a label, are in [Is Tempo vibe-coded?](/blog/is-tempo-vibecoded/). Short answer: no, but the question is worth taking seriously.

---

If you've been waiting to try it, you're holding the link. If you've been on the fence about whether your stack fits, the [What is Tempo?](/docs/01-introduction/) chapter is a five-minute read that answers it. If you find something rough, the GitHub Issues are the fastest place to flag it, and they directly shape the v1.x roadmap.

Thank you to everyone who's been part of the early conversation. v1 wouldn't read the way it does without your questions.

---

Leo from [Caereforge](https://caereforge.com)
