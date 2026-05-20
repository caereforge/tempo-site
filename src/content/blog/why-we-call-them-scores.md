---
title: "Why we call them scores"
description: "A note on the musical name behind Tempo's building blocks — and the scores shipping at launch."
pubDate: 2026-04-23
tags: ["scores", "design", "community"]
---

*📅 April 23, 2026 · Leo from Caereforge*

If tempo in music means the speed at which a piece is played (slow or fast) and its rhythmic structure organized in steady measures (until it changes), then it's the scores that set the cadence of those measures.

The events that our servers and tools send across the network — to be understood and handled by Tempo — need to follow patterns. Scores.

That's why Tempo ships with a set of preconfigured scores at launch. The ones I use most in my own homelab, plus a few common-ask sources I included so most setups have something to start from on day one.

Before the list, one concept worth a paragraph. Some sources speak as one — Kopia is Kopia, Uptime Kuma is Uptime Kuma. Others are families. UniFi covers Network and Protect with very different signals. Hazel can be driven by file rules, Mail rules, or anything you wire up to it. Scripts is a single banner over every Bash, Python, or launchd one-liner you point at Tempo. For these, Tempo uses an **umbrella score**: a parent identifier (e.g. `com.noodlesoft.hazel`) that covers any sub-source whose identifier starts with that prefix (`com.noodlesoft.hazel.mail`, `com.noodlesoft.hazel.keepa`, and so on). You get sensible defaults for the whole family, and you can drop in a more specific score whenever a single sub-source earns its own actions.

Bundled with the app:

- 🟣 **UniFi Network and UniFi Protect** — controller alarms, IPS hits, AP events, camera detections. One click to the controller or live view. Two sub-scores under the `com.ubiquiti.unifi` umbrella.
- 🟢 **Kopia** — when a backup finishes (ok or failed), one click jumps to the snapshot in KopiaUI.
- 🟡 **Uptime Kuma** — monitors flipping up or down, with one click to the monitor page.
- 🔵 **Home Assistant** — every automation can land in Tempo with the buttons it deserves: Wake-on-LAN, scene re-fire, dashboard deep-link.
- ⚫ **GitHub Actions** — workflow runs across your repos in the same timeline as the rest of the homelab.
- 🟠 **Synology** — DSM notifications: storage health, package updates, backup job outcomes.
- 🟤 **Hazel** — v1 bundles two ready-made sub-scores under the `com.noodlesoft.hazel` umbrella: Mail-rule handoff (`com.noodlesoft.hazel.mail`) and Keepa price-drop alerts (`com.noodlesoft.hazel.keepa`). Each has actions tuned to its specific surface — email-centric for Mail, product-centric for Keepa — rather than the generic file-pattern defaults. The umbrella score itself, with those file-pattern defaults, lives in the catalog below — install it if you want everything else Hazel-driven covered too.
- ⚙️ **Scripts** — the generic catch-all under the `scripts` umbrella for anything that can POST JSON: cron, launchd, a Bash one-liner watching a sensor. Drop in `scripts.shell.my_thing.json` and that one script gets its own dedicated source under the same umbrella.

Plus Apple Calendar and Reminders, pre-wired via EventKit. They don't share the main timeline — they live in their own panel next to it, which you can show or hide, so the day's entries stay one glance away without diluting the homelab feed.

From the public reviewed catalog at [github.com/caereforge/tempo-scores](https://github.com/caereforge/tempo-scores), one double-click away:

- 🐧 **Proxmox** — VM backup outcomes, container restarts, anything the host emits via `pvesh` or the guest agent.
- 🛡️ **Pi-hole** — block/allow events and gravity updates.
- 🔐 **Vaultwarden** — login attempts, vault changes, admin events.
- 🎬 **Jellyfin** — playback, library scans, transcoding events.
- 🟤 **Hazel umbrella** — the parent `com.noodlesoft.hazel` score with file-pattern defaults, the third member of the Hazel trio. Useful when you want every Hazel-driven event covered with one set of sensible defaults, without authoring a sub-score for each rule.
- 📨 **Generic webhook** — the reference score for anyone wiring a new source.

An experimental CalDAV engine (Fastmail-focused) ships in v1.0.3 behind an opt-in shell flag — see the docs if you want to try it.

Installing a score is dead simple: download it, double-click it, the installer window opens, and the score is ready to go.

In another post I wrote: *the payload is input, the score is policy, you're the author*. And that's exactly how it works — the score tells Tempo *how* to read an event; you decide *what* it should do in response.

Tempo is open to the community and it handles a huge range of inputs — pretty much all the common ones across self-hosted and cloud tools. Discussion happens in [the Discord](https://tempoapp.app/discord/) (link in the menu), and PRs to the score catalog get reviewed and merged.

The Tempo that each of you builds on top of your own infrastructure will be different. And that's exactly the point.

---

Leo from [Caereforge](https://caereforge.com)
