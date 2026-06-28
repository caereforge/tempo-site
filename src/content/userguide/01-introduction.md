---
title: "Introduction"
description: "Tempo is a native macOS event hub for homelab operators, sysadmins, and Mac power users. What it is, who it's for, and where to start reading."
chapter: 1
order: 1
draft: false
pubDate: 2026-05-05
---
# 1 - Introduction

## 1.1 - Welcome to Tempo

Tempo is a native macOS event hub.

Things happen across your machines all day: a backup completes, a Home Assistant alarm trips, GitHub Actions ships a deploy, an Uptime Kuma probe fails, a script you wrote prints "done." Each of those things lives in a different tool, on a different surface, in a different format. The morning ritual of checking seven dashboards exists because nobody else built the place where they could all live together.

Tempo is that place: one macOS-native timeline, every signal from every source, with an action button right there on each event so you don't have to chase the right tool to do something about it.

This guide covers what Tempo does, how to set it up, how to make it your own, and how to get unstuck if something goes sideways.

> *For tinkerers, from a Mac to a rack.*

---

## 1.2 - What Tempo is, what it isn't

Reading a "what is X" section is rarely thrilling, but Tempo sits in a category that's still forming. A few minutes here saves you from building a wrong mental model that you'd then have to unlearn.

### What Tempo is

- **An aggregator.** Calendar events, reminders, monitoring alerts, backup outcomes, GitHub Actions runs, custom scripts: anything that emits a signal can be funneled into one timeline. The signals don't change shape on the way in; Tempo gives them a common surface.
- **A user-authored display.** You decide what each source looks like in the feed. The mechanism is the [score](/docs/14-glossary#score) system: a small JSON file per source that says "events from this provider should look like this, group like that, offer these actions when clicked."
- **An action layer.** Every event arrives with the actions you'd reach for: SSH to the host, open the dashboard, copy the IP, run a quick command. One click, no app-switching. The action set for each source is defined in its score, which you can edit yourself: visually in the built-in Score Editor, or by hand in the JSON (the file stays the source of truth). Actions are user-triggered in v1; v2 extends this with auto-firing rules.
- **A history.** The feed isn't real-time-only. Events persist; you can scroll back to last Tuesday's alert from your CI pipeline, click it, take action then. The visualization window is 84 days of [heatmap](/docs/14-glossary#heatmap), but the database keeps everything.
- **Local.** Your data lives on your Mac, in a SQLite database under `~/Library/Application Support/Tempo/`. Tempo doesn't sync to the cloud, doesn't ship telemetry by default, doesn't talk to a backend you don't control. The ingestion server runs on your LAN so the rest of your stack can reach it; nothing leaves your network because of Tempo.

### What Tempo isn't

- **Not a calendar app.** No daily/weekly/monthly views. No editing of calendar entries. Calendar.app, Fantastical, BusyCal, Cron: those are calendar editors. Tempo reads your calendar (if you let it) and shows entries in the timeline alongside everything else, but it never replaces an editor. The agenda panel can be hidden entirely if you'd rather keep calendar out of Tempo.
- **Not a task manager.** Tempo can show your reminders, and you can mark them as completed from the action panel. Beyond that one action, Tempo doesn't create, edit, or schedule tasks. Things, OmniFocus, Reminders.app, Todoist: those stay your task manager.
- **Not a monitoring tool.** Tempo doesn't store metrics, run probes, or define alerting rules of its own. It receives signals from monitoring tools that already do those jobs (Uptime Kuma, Home Assistant, Grafana webhooks, ntfy) and gives them a place to land where you can act on them.
- **Not Notification Center.** Notification Center is chronological but stateless. Tempo is semantic (severity, grouping, scoring), persistent (history), and has an action button rather than just a banner.
- **Not IFTTT or Zapier.** v1 is human-in-the-loop. v2 will support automations, but they'll be limited to the tools Tempo already receives signals from. Tempo isn't a generic any-to-any flow engine.

The shorthand: Tempo is the funnel. Your existing tools each do their own job, and Tempo is where their outputs converge into one timeline you can act from.

---

## 1.3 - A note on how we write these docs

A few conventions, so the rest of the guide feels predictable.

**We use "you."** These docs are for you, the person reading them. Not "the user." Not "one." If something is conditional ("if you're using a webhook…"), it's stated as a condition, not implied.

**No hand-holding, no condescension.** Concepts are explained once, where they're first needed. We assume you can read JSON, follow a procedure, and look up a term if it's unfamiliar: the [glossary](/docs/14-glossary) is one click away. The score system, for example, covers severity rules (when to react), display rules (what to show), and actions (what to offer). Chapters 2 and 7 walk you through it.

**We use plain words for technical things, and technical words when nothing else will do.** "The score editor" rather than "the score authoring interface." "Click" rather than "actuate." But "JSON," "regex," and "payload" stay as themselves, because pretending otherwise would be condescending.

**Inline code formatting** marks things you'd type, paste, or see in a UI: `${metadata.host}`, `~/Library/Application Support/Tempo/`, `tempo-post`. Code blocks hold longer snippets: JSON examples, terminal commands, configuration.

**Note, Tip, Warning** boxes flag context worth pausing on:

> 💡 **Note**: a clarification or aside that doesn't change what you should do, but is useful to know.

> 🛠 **Tip**: a way to get more out of something, optional.

> ⚠️ **Warning**: something to avoid, or a gotcha that bites people.

> 🛑 **Critical**: something that can cause data loss or security issues. Read this one slowly.

**The glossary is your friend.** Tempo has a small vocabulary that's specific to it: *score*, *severity rule*, *headline metric*, *grouping window*. Rather than redefine every term in every chapter, we link the first occurrence on each page to the glossary entry. If a term feels foreign, click through; the entry is two-to-four sentences and the link opens in a new tab so you don't lose your place.

**Examples are concrete.** If we mention "a backup tool" we name one (Kopia), because abstract examples are harder to map onto your actual setup. The brands referenced are global ones the homelab and indie-Mac communities recognize: Home Assistant, Uptime Kuma, UniFi, Synology, GitHub Actions. If you use something different, the same shape applies.

**No deference, no condescension.** You're a smart person figuring out a tool. We try to write like one smart person to another.

---

## 1.4 - Tempo in five minutes

If you'd rather see Tempo work than read about it, here's the shortest path from "downloaded" to "events in the timeline."

### 1. Install

Download the latest signed and notarized DMG from [downloads.tempoapp.app](https://downloads.tempoapp.app). Drag Tempo into your Applications folder. The first time you open it, macOS will check the signature and ask you to confirm.

### 2. Grant calendar access

On first launch, Tempo asks for permission to read Calendar and Reminders. If you say yes, your calendar entries and reminders appear in the timeline. (If you'd rather not connect your calendar at all, say no: Tempo still works without it. You can change your mind later in **System Settings → Privacy & Security**, under **Calendars** and **Reminders**.)

That's the first thing in the feed.

### 3. (Optional) Try a webhook

If you want to see how the *rest* of Tempo works before connecting anything real, send a fake event with a single curl command. First, in **Settings → Ingestion**, create a token bound to the `providerIdentifier` you'll send (`com.test` in the example below). Tokens are per-provider: a token bound to a different provider, or no token, is rejected.

```bash
curl -X POST http://localhost:7776/ingest \
  -H "Content-Type: application/json" \
  -H "X-Tempo-Token: $TEMPO_TOKEN" \
  -d '{
    "title": "Test event",
    "eventType": "alert",
    "providerIdentifier": "com.test",
    "metadata": { "host": "demo" }
  }'
```

Replace `$TEMPO_TOKEN` with the value of the token you created (bound to `com.test`). The event shows up in the feed. (If it doesn't, see [Troubleshooting, Networking](/docs/12-troubleshooting#121---networking-lan-ingestion).)

> 💡 **Note**: that endpoint is `http://localhost:7776` because you're testing from the same machine. From another host on your LAN, replace `localhost` with your Mac's LAN IP. The ingestion server is LAN-reachable by design, since the things sending events to it usually live on other machines (your NAS, your Home Assistant box, your monitoring server).

### 4. Connect a real source

Once you've seen an event arrive, you can connect a real source. The bundled scores cover the most common cases: UniFi (Network and Protect), Kopia, Uptime Kuma, Home Assistant, GitHub Actions, Scripts, Synology, Hazel, and more. Apple Calendar and Reminders are also pre-wired via a built-in EventKit provider (no score installation needed). Each source has its own setup chapter in [§10 Sources reference](/docs/10-sources-reference).

If your source isn't on the bundled list, the [generic webhook](/docs/10-sources-reference#102---generic-webhook) covers anything that can POST JSON.

### 5. (Recommended) Read chapter 2

The five minutes above gets you events. Chapter 2, *Concepts*, is the next 15 minutes that helps you understand what you're looking at: what makes an event different from an alert, why your UniFi events are colored the way they are, what "stacking" does, when to ack an event versus dismiss it. It's worth the time. After that, you can dip into the rest of the guide as needed.

---

Glad to have you here. Let's get started.

*the Tempo docs*
