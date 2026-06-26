---
title: "Uptime Kuma"
description: "Uptime Kuma monitor up/down status in your Tempo timeline. Tempo has a native adapter for Kuma's webhook payload, and each monitor stays one stateful row instead of spamming the feed."
providerIdentifier: "com.uptime-kuma"
color: "#5CDD8B"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Uptime Kuma is a self-hosted uptime monitor. This score surfaces the status of every monitor you enable — **up**, **down**, **pending**, **degraded**, or **maintenance** — on your Tempo timeline.

Tempo parses Kuma's webhook payload with a native adapter, so there is no helper script to install. The score is **stateful**: each monitor is one subject keyed by its monitor ID, so repeated pings flip the same row between up and down instead of piling new entries into the feed. A monitor going down opens a row; coming back up closes it; further down/pending pings continue the same row.

## Install

This score ships built-in and is seeded on first launch — nothing to download.

1. In Tempo **Settings → Ingestion**, add a token bound to `com.uptime-kuma` and copy it.
2. Note your Tempo endpoint: `http://<your-mac-ip>:7776/ingest`.
3. Configure Uptime Kuma to post there (below).

## Uptime Kuma side

In Uptime Kuma go to **Settings → Notifications → Setup Notification** and choose **Webhook**:

- **Post URL**: `http://<your-mac-ip>:7776/ingest`
- **Additional Headers**: `{ "X-Tempo-Token": "<your-token>" }`

Save the notification, then enable it on each monitor you want to see in Tempo (turn it on for all monitors if you want full coverage).

## What you'll see

One stateful row per monitor, classified by status:

| Severity   | Status |
|------------|--------|
| `critical` | Down |
| `warning`  | Pending · Degraded |
| `ok`       | Up |
| `info`     | Maintenance · Test |

Each event carries these action buttons:

- **Open monitor URL** — open the monitored endpoint
- **Open Kuma dashboard** — open your Uptime Kuma instance
- **Curl probe** — `curl -ksSI` the monitor URL in Terminal
- **Ping host** — ping the monitored host
- **Traceroute host** — traceroute to the host
- **Resolve hostname** — `dig +short` the hostname
- **Copy monitor URL** — copy the URL to the clipboard
- **Uptime Kuma docs** — open the Uptime Kuma wiki
