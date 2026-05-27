---
title: "Todoist meets your timeline"
description: "How to bring your Todoist tasks into Tempo with a lightweight polling script and a purpose-built score."
pubDate: 2026-05-27
tags: ["how-to", "scores", "automation"]
---

*📅 May 27, 2026 — Tempo 1.1 · Leo from Caereforge*

If you, like me, use Todoist to manage your tasks alongside Reminders (I tend to keep private and work separated), you may want to have one view to see all of your tasks with "something" telling you what comes from Todoist and what from Reminders. Tempo was built to show all the events that flow through my day, be it my servers data or my agenda. The Agenda panel isn't designed to work as a calendar, but it's meant to be a place where I can quickly check what's due today while I analyze what's coming in from my stack.

I'm happy to announce that Todoist is now integrated into the Agenda. It will list your tasks under the Reminders section (right side of the Agenda), showing a different icon, so you see at a glance what is in Apple Reminders and what is in Todoist.

## How it works

Tempo's Todoist integration is a two-piece setup, as the app does not support webhooks but only API: a **Python polling script** that pulls your tasks from the Todoist API, and a **score** that tells Tempo how to display and act on them.

The script runs on your Mac (or any machine on your LAN), polls Todoist every few minutes (you can customize the polling interval), and POSTs each task to Tempo's ingestion endpoint. No cloud relay, no third-party service in the middle — your task data goes straight from Todoist's API to your local Tempo instance.

When a task is completed or no longer due today, the next poll automatically removes it from the Agenda.

## What lands on your Agenda

Every task due today or overdue shows up in the Agenda panel, grouped by Todoist project. The score maps Todoist priorities to Tempo severity levels:

| Todoist priority | Tempo severity |
|------------------|----------------|
| P1 (urgent)      | critical       |
| P2 (high)        | warning        |
| P3 (medium)      | info           |
| P4 (normal)      | info           |

Each task carries its full metadata: project name, labels, due date and time, whether it's an all-day task.

The Agenda row shows the same visual indicators you already see on Apple Reminders:

- **Priority flag** — colored flag matching the Todoist priority (red for P1, orange for P2, blue for P3)
- **Bell icon** — when the task has a specific due time (Todoist sends a notification)
- **Recurring icon** — for repeating tasks
- **Project name** — displayed on the right, just like Reminders shows the list name

## Two actions per task

The score gives you two buttons on every Todoist event:

- **Open in Todoist** — jumps straight to the task in Todoist (uses the native `todoist://` URL scheme if you have the app, falls back to the browser)
- **Open Todoist app** — opens the Todoist app directly

## Setting it up

1. **Install the score**: double-click `com.todoist.tempo-score` — Tempo's review sheet opens, hit Install.
2. **Get a Todoist API token**: Settings → Integrations → Developer in Todoist. Copy the token.
3. **Configure the script**: the Python script reads your Todoist token from the macOS Keychain (or an environment variable). Set it once, forget it.
4. **Run the script**: `python3 todoist-poll.py` — it filters for today's and overdue tasks, maps priorities, and POSTs to Tempo.
5. **Automate it**: we ship a ready-made LaunchAgent plist (`com.caereforge.todoist-poll.plist`). Edit the path to the script, copy it to `~/Library/LaunchAgents/`, and load it with `launchctl load`. It polls every 5 minutes by default — change the `StartInterval` value in the plist to adjust (it's in seconds, so 600 = 10 minutes, 120 = 2 minutes).

The script handles rate limiting with automatic retry and supports all-day tasks natively.

## Why a script, not a built-in provider?

Todoist's API is a pull model — there's no webhook that fires when a task changes. That means something has to poll. Rather than baking a polling loop into Tempo itself (which would add complexity and a mandatory dependency), we keep it external: a small, readable Python script you can inspect, modify, and schedule however you like.

This is Tempo's design philosophy at work: the app is the timeline and the score engine. Data gets in via HTTP. How you produce that data — a script, a webhook, a Shortcut, a cURL one-liner — is your call.

## Get started

The score and script are available in the [Tempo Scores repository](https://github.com/caereforge/tempo-scores). The README covers setup, configuration, metadata fields the script sends, and known limitations.

If you already have Tempo running, the score also appears in the Score Manager — install it from there and follow the setup guide.
