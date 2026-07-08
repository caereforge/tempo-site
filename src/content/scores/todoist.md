---
title: "Todoist"
seoTitle: "Todoist tasks on your Mac timeline | Tempo"
description: "Bring Todoist onto your Mac timeline. Due and completed tasks land next to your homelab events: one place for everything that needs attention."
providerIdentifier: "com.todoist"
color: "#E44232"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

This score puts your Todoist tasks on the Tempo timeline next to the rest of your agenda. It is agenda-class: tasks appear in the day view, never ring the bell, and never count toward the Dock badge. It is read-only in v1.1, so completing a task from Tempo is not wired in. Manage tasks in Todoist.

The score ships built in and is seeded on first launch. There is nothing to download for the score itself. The work below is configuring the companion poller that feeds it.

## How it works

Todoist runs in the cloud and cannot reach a LAN address, so Tempo cannot pull from it directly. A small companion poller does the reaching instead:

```
Todoist API v1  (HTTPS, authenticated with your Todoist API token)
      |  the poller asks for your tasks on a schedule
todoist-poll.py  (filters client-side for today + overdue)
      |  HTTP POST with your Tempo ingestion token
Tempo ingestion server  on <mac>:7776/ingest
```

On each run, `todoist-poll.py`:

- Queries Todoist API v1 for all tasks and filters client-side for today and overdue.
- Resolves project names from project IDs.
- Maps each task to a Tempo event carrying its project, priority, labels, recurrence, due time, and task ID.
- POSTs each event with a stable `externalID`, so a re-run updates the existing row instead of creating a duplicate.
- Runs a sync-delete after sending: any `com.todoist` event already in Tempo that was not in the current batch is removed. Completed tasks and tasks no longer due today drop off the timeline.

The poller only reads from Todoist and only writes to Tempo. Nothing is written back to Todoist.

## Setup

### 1. Install the score and create a token

1. The Todoist score is built in. Install it from **Manage Sources** if it is not already active.
2. In Tempo **Settings → Ingestion**, add a token bound to `com.todoist`. Copy it; the poller needs it.
3. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest`. Use `127.0.0.1` only if the poller runs on the same Mac as Tempo.

### 2. Get a Todoist API token

In Todoist, open **Settings → Integrations → Developer** and copy the **API token**. This is a personal token tied to your account, not a per-app OAuth credential.

<!-- SCREENSHOT: Todoist Settings > Integrations > Developer, showing the API token field -->

### 3. Get the helper files

In the score's **Source** tab (Score Editor), the **Helper** section has **Open in Finder** and **Open README**. *Open in Finder* copies the package to `~/Library/Application Support/Tempo/Integrations/com.todoist/` and reveals it. The package contains `todoist-poll.py`, a `launchd` plist template, and the bundled README. Copy that folder to the host that will run the poller.

The poller runs on any host with Python 3 that can reach both the internet and your Mac on port 7776: the Mac itself, a Linux box, or a container.

### 4. Provide the two secrets

The poller needs the Todoist API token and the Tempo token. It resolves each one most-secure-source-first: a secret **file** (`*_FILE`), then an **environment variable**, then the macOS **Keychain**.

On a Mac, the Keychain keeps both off disk (account `todoist-poll`):

```sh
security add-generic-password -a todoist-poll -s todoist-api-token -w '<Todoist API token>'
security add-generic-password -a todoist-poll -s tempo-token       -w '<Tempo token>'
```

On Linux, in a container, or with a `.env` file, set environment variables instead:

```sh
TODOIST_TOKEN=<Todoist API token>
TEMPO_TOKEN=<Tempo token>
```

To keep secrets out of plaintext, use the `*_FILE` form: set `TODOIST_TOKEN_FILE` and `TEMPO_TOKEN_FILE` to a path, and the poller reads each secret from that file. Point them at a Docker secret (`/run/secrets/...`, on tmpfs), a `systemd-creds` encrypted credential, or any `chmod 600` file.

### 5. Point the poller at Tempo and test

Set `TEMPO_URL` to your endpoint from step 1 if the poller is not on the same Mac as Tempo:

```sh
export TEMPO_URL=http://<mac-running-tempo>:7776/ingest
```

Run it once:

```sh
python3 todoist-poll.py
```

Today's and overdue tasks should appear in Tempo within a few seconds. If the poller runs on a different host than Tempo, that host must reach the Mac on port **7776**. Allow it in the macOS firewall or Little Snitch, and optionally restrict the token to that host's IP with its allowlist in **Settings → Ingestion**.

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TODOIST_TOKEN` | Yes* | Keychain | Todoist API token |
| `TEMPO_TOKEN` | Yes* | Keychain | Tempo ingestion token bound to `com.todoist` |
| `TEMPO_URL` | No | `http://127.0.0.1:7776/ingest` | Tempo ingestion endpoint |
| `TODOIST_PROJECT` | No | (none) | Only sync tasks from this project, matched by name, case-insensitive |

\* Not required if stored in the macOS Keychain, or supplied through the `*_FILE` form.

## Run it as a daemon

A single run is a one-shot. To keep the timeline current, run the poller on a schedule. The default interval in the bundled template is **5 minutes** (300 seconds).

### macOS (launchd)

The package ships `com.caereforge.todoist-poll.plist`.

1. Put `todoist-poll.py` somewhere permanent and edit the plist so its `ProgramArguments` path points at that location.
2. Copy the plist into place and load it:

```sh
cp com.caereforge.todoist-poll.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.caereforge.todoist-poll.plist
```

To change the cadence, edit `StartInterval` in the plist (seconds: 600 for 10 minutes, 120 for 2 minutes) and reload. To stop it:

```sh
launchctl unload ~/Library/LaunchAgents/com.caereforge.todoist-poll.plist
```

### Linux (systemd)

A timer plus a one-shot service runs the poller on an interval. Create `/etc/systemd/system/tempo-todoist.service`:

```ini
[Unit]
Description=Tempo Todoist poller
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /opt/tempo-todoist/todoist-poll.py
Environment=TEMPO_URL=http://<mac-running-tempo>:7776/ingest
Environment=TODOIST_TOKEN_FILE=/run/secrets/todoist-token
Environment=TEMPO_TOKEN_FILE=/run/secrets/tempo-token
```

Create `/etc/systemd/system/tempo-todoist.timer`:

```ini
[Unit]
Description=Run the Tempo Todoist poller every 5 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

Then enable it:

```sh
sudo systemctl enable --now tempo-todoist.timer
```

Without systemd, a `flock` keepalive in cron works as well, where `flock` prevents overlapping runs if one is slow:

```cron
*/5 * * * * /usr/bin/flock -n /tmp/tempo-todoist.lock /usr/bin/python3 /opt/tempo-todoist/todoist-poll.py
```

### Windows

`todoist-poll.py` is pure Python 3, so it runs on Windows. Provide the secrets as environment variables (or `*_FILE` paths), then schedule it with a **Scheduled Task** that runs `python todoist-poll.py` at logon and repeats every 5 minutes. Set the task to restart on failure.

## What you'll see

Today's and overdue tasks land on the timeline, **grouped by project** within a one-day window. The task's priority sets the severity badge. The `priority` value is the raw Todoist API number, where **4 is highest** (this is the inverse of the P1 to P4 labels in the Todoist app, where P1 is highest):

| `priority` | Severity   | Badge label |
|------------|------------|-------------|
| `4`        | `critical` | Urgent      |
| `3`        | `warning`  | High        |
| `2`        | `info`     | Medium      |
| `1`        | `info`     | (none)      |
| (none)     | `info`     | Info        |

A sender-provided severity does not override these rules; the score's own priority mapping always wins.

## Grouping and actions

Tasks stack by project (`${metadata.project}`) within a one-day window, so several tasks in the same project read as one grouped entry rather than separate rows.

Each task carries two active buttons:

- **Open task**: opens the specific task in the Todoist app, via `todoist://task?id=${metadata.taskId}`.
- **Open Todoist app**: opens Todoist, via `todoist://app`.

The score also ships a third action, **Open Todoist (web)** (`https://www.todoist.com/home`), but it is disabled by default and does not appear on the card.

## Troubleshooting and limitations

- **Read-only in v1.1**: completing a task from Tempo is not wired in. The poller only reads from Todoist.
- **Nothing appears after a manual run**: confirm the Tempo token is bound to `com.todoist` and that `TEMPO_URL` points at the right host. A token mismatch is rejected by the ingestion server and logged in **Settings → Ingestion**.
- **Poller on another host cannot connect**: that host must reach the Mac on port 7776. Check the macOS firewall, Little Snitch, and any token IP allowlist.
- **Tasks linger after completion**: the timeline updates on the next poll, when the sync-delete removes events no longer in the batch. Lower `StartInterval` (or the systemd/cron interval) if you want faster turnover.
- **Only one project should sync**: set `TODOIST_PROJECT` to the project name (case-insensitive).
