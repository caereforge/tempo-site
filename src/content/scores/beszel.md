---
title: "Beszel"
description: "Beszel server-monitoring alerts in Tempo's timeline, one stack per host and metric, with triggered/resolved flap cycles grouped and a one-click jump to the hub."
providerIdentifier: "com.beszel"
color: "#B63600"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Beszel is a lightweight, self-hosted server-monitoring hub: it watches CPU, memory, disk, temperature, load, and up/down status across your machines and raises an alert when a metric crosses a threshold. This score reads those alerts and lays them on Tempo's timeline as structured events, one row per host and metric, so a noisy flap collapses into a single stack instead of a flood.

Beszel's native notifications flatten an alert to a title only, so Tempo can't read the metric, threshold, or state from them. The score therefore relies on a **companion helper**: a small Python poller that queries the Beszel hub's alert history over its API and posts full events to Tempo. Tempo does not run the helper for you; it runs on a host that can reach the Beszel hub.

This score is built into Tempo. There is nothing to download: it ships with the app and is seeded into `~/Library/Application Support/Tempo/Scores/` on first launch.

## Install

1. The score is built in, so no installation step is needed. You can confirm it under **Manage Sources**.
2. In Tempo **Settings → Ingestion**, create a token bound to `com.beszel`. Copy it; the helper needs it.
3. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest`.
4. Deploy the helper on a host that can reach the Beszel hub (next section).

## Beszel side

The helper (`beszel-tempo.py`) is a pull-based poller. It reads the hub's structured alert history over the PocketBase API and posts a full event to Tempo on each alert transition, with the metric, threshold, and state intact. Disable Beszel's native Tempo webhook once the helper runs.

To get the files, open the score in Tempo's **Score Editor → Source** tab and use **Open in Finder** / **Open README**. The README walks you through deploying it: a read-only poller user on the hub, the Tempo token, and a keepalive cron so the poller stays up.

A couple of notes from the helper README:

- The helper posts only on alert transitions (triggered and resolved), not on a heartbeat. A quiet timeline means no alert crossed a threshold, not that the helper is down.
- A Beszel upgrade can reset the read-only user's read grants; re-apply them if events stop arriving (see the helper README).

## What you'll see

Each event lands as one stack per **host + metric**. A triggered alert and its later resolution update the same stack, and flap cycles group together within a 6-hour window.

Severity follows the alert:

- **System down** (a `Status` alert) and **Disk** alerts are **critical**.
- Any other triggered metric (CPU, memory, temperature, load, and so on) is **warning**.
- A resolved alert turns the stack **ok**.

Two action buttons are attached to every event:

- **Open Beszel** — opens the Beszel hub in your browser. It targets the helper host's address from the event metadata (port 8090), not an arbitrary URL.
- **Copy system name** — copies the affected host's name to the clipboard.
