---
title: "Todoist"
description: "Today's and overdue Todoist tasks in Tempo's timeline, grouped by project, with priority-driven severity and one-click buttons to open the task or the Todoist app."
providerIdentifier: "com.todoist"
color: "#E44232"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Surface your Todoist tasks alongside the rest of your agenda. A small companion poller asks the Todoist API for due and updated tasks on a schedule and posts them to Tempo, which lays them on the timeline grouped by project. Priority drives the severity badge: an urgent task reads as `critical`, a high-priority one as `warning`, and so on.

Todoist cannot reach your LAN, so the poller does the reaching: it runs wherever it can see both the internet and your Mac, and pushes tasks to Tempo. This is **read-only** into Tempo. It surfaces tasks so you can act on them; completing a task from Tempo is not wired in v1. Manage tasks in Todoist.

The score ships built-in and is seeded on first launch. There is nothing to download.

---

## Install

1. The Todoist score is built in. Tempo seeds it on first launch; install it from **Manage Sources** if it isn't already active.
2. In Tempo **Settings → Ingestion**, add a token named `todoist` bound to `com.todoist`. Copy the token, the poller needs it.
3. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest` (or `127.0.0.1` only if the poller runs on the same Mac as Tempo).
4. Set up the companion poller on whichever host will run it (below).

## Todoist side

This source needs a **companion poller**: a small Python script that queries the Todoist API for due and updated tasks and POSTs them to Tempo. Tempo does **not** install or run it for you. Copy the files to a host you choose and configure it there.

**What you need:**

- A **Todoist API token**, from Todoist **Settings → Integrations → Developer**.
- The **Tempo token** from step 2 above, bound to `com.todoist`.

**Where it runs:** any host that can reach both the internet (for the Todoist API) and your Mac on port **7776**. That can be the Mac itself, a Linux box, or a container. On a Mac the poller reads secrets from the **Keychain**; elsewhere it reads **environment variables** or a `.env` file.

**Get the files:** open the score's **Source** tab in Tempo's **Score Editor**. The **Helper** section has **Open in Finder** and **Open README**. *Open in Finder* copies the package to `~/Library/Application Support/Tempo/Integrations/com.todoist/` and reveals it. Copy that folder to the host that will run the poller, then follow its bundled **README**:

1. **Give the poller its two secrets**: your Todoist API token and the Tempo token. On a Mac, store them in the Keychain (account `todoist-poll`):
   ```sh
   security add-generic-password -a todoist-poll -s todoist-api-token -w '<Todoist API token>'
   security add-generic-password -a todoist-poll -s tempo-token       -w '<Tempo token>'
   ```
   On Linux / Docker, set `TODOIST_TOKEN` and `TEMPO_TOKEN` as environment variables (or use the `*_FILE` convention to keep secrets out of plaintext, see the bundled README).
2. **Point it at Tempo:** set `TEMPO_URL` to `http://<mac-running-tempo>:7776/ingest`. By default the poller queries the `(today | overdue)` filter.
3. **Schedule it** with the bundled launchd template.

**Firewall:** if the poller runs on a different host than Tempo, that host must reach the Mac on port **7776**. Allow it in the macOS firewall (or Little Snitch), and optionally restrict the token to that host's IP with its allowlist in **Settings → Ingestion**.

## What you'll see

Today's and overdue tasks land on the timeline, **grouped by project** within a one-day window. The task's priority sets the severity badge (`priority` is the Todoist API value, where 4 is highest):

| `priority` | Severity   | Label    |
|------------|------------|----------|
| `4`        | `critical` | Urgent   |
| `3`        | `warning`  | High     |
| `2`        | `info`     | Medium   |
| `1`        | `info`     | -        |
| (none)     | `info`     | Info     |

Each task carries two buttons:

- **Open task**: opens the task directly in the Todoist app (`todoist://task?id=…`).
- **Open Todoist app**: opens Todoist.
