---
title: "UniFi Network"
description: "Bring UniFi controller alarms — client connect/disconnect, device lost contact, port events — into your Tempo timeline. Built-in source: ships with Tempo, no separate score to install."
providerIdentifier: "com.ubiquiti.unifi"
color: "#0559C9"
version: "1.0.0"
compatibility:
  - "Network 8.x"
  - "Network 9.x"
  - "Network 10.x"
pubDate: 2026-05-07
builtIn: true
---

UniFi is a **built-in source** in Tempo — the score is bundled with the app and registered automatically on first launch. There's no `.tempo-score` file to download or install. To wire your controller up, you only need to point its alarm webhook at Tempo's ingestion endpoint.

The provider identifier `com.ubiquiti.unifi` is reserved as an umbrella for the UniFi product family. Today it covers UniFi Network (alarms from your controller); UniFi Protect / Talk / Access can be added later as siblings under the same umbrella.

---

## Setup

1. In Tempo **Settings → Ingestion**, add a token named `unifi` bound to `com.ubiquiti.unifi`. Copy the token.
2. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest/unifi` (replace `<your-mac-hostname>` with the hostname or LAN IP of the Mac running Tempo — UniFi is almost always on a different host than your Mac).
3. In the UniFi controller UI, go to **Settings → System → Notifications → Webhooks** (path varies slightly across Network app versions). Add a webhook with:
   - **URL**: the endpoint from step 2
   - **Method**: POST
   - **Authentication**: Bearer with the token from step 1
4. Enable the alarm categories you care about (client connect/disconnect, device lost contact, etc.).

That's it. The next alarm the controller fires will land in Tempo's feed.

## What Tempo receives

Each UniFi alarm becomes one event in the timeline. The score auto-extracts:

- **Client identity** — MAC, hostname, IP — for client-centric alarms (Wired/Wireless Client Connected, Disconnected, Roam)
- **Device identity** — switch / AP / gateway MAC and name — for device-level alarms (Lost Contact, Restart)
- **Severity** — mapped from UniFi's `key` field; the most common alarms route to *info* (blue), with `Lost_Contact` and similar routed to *warning* / *alert*

Stacking is keyed off the subject: bursts of the same client roaming or reconnecting collapse into one stack instead of flooding the feed.

## Default actions

The bundled UniFi score attaches a few one-click actions to each event:

- **Open UniFi controller** — jumps to your controller's web UI
- **Copy client MAC / IP / hostname** — for whichever fields the alarm carries
- **Ping client / Open SSH** — for alarms with an IP

You can edit, remove, or add actions in **Settings → Score Editor**. Your local edits override the bundled defaults; **Reset to bundled defaults** in the editor brings them back.

## V2 outlook

UniFi ships a Network Integration API in addition to webhooks — for V1 we use webhooks exclusively (push, no polling, no API key custody). V2 may add an opt-in Integration API path for write actions (today: client guest-authorisation and device restart only). The webhook path will remain the default; the API is purely additive when there's a use case the webhook can't cover.

---

## FAQ

### Why don't I see disconnect events for some wired devices (smart TVs, set-top boxes, NAS)?

Because the controller doesn't always send them.

Many modern devices keep the Ethernet PHY active when in standby — smart TVs with Quick Start, streaming sticks waiting for Wake-on-LAN, NAS in low-power mode, set-top boxes that update overnight. The switch sees the link as still up, so the controller doesn't generate a disconnect event. The corresponding disconnect arrives only when the device is fully powered off or unplugged — which is why you'll often see UniFi reporting *Time Connected: 8h 13m* or longer for these devices: it's not a bug, it's the device legitimately holding its link up across what looked to you like off-time.

If you need accurate "really off" detection for a specific device, the workaround is to add an Uptime Kuma (or similar) monitor pointed at the device's IP. Kuma will detect actual unreachability and emit a Down event Tempo can stack alongside the UniFi connect.

### Can I receive UniFi Protect events too?

Not as a built-in source in V1 — UniFi Network is the only Ubiquiti product wired in by default at launch. A downloadable Protect score is planned for the public catalog shortly after V1 ships, with a native module promoted in V1.1+. Both will surface under the same `com.ubiquiti.unifi` umbrella so Network and Protect alarms appear as siblings in the source list.

### My UniFi alarm doesn't appear in Tempo at all

Three things to check, in order:

1. **Token binding** — Settings → Ingestion → confirm the token exists, is bound to `com.ubiquiti.unifi`, and the controller is sending it as `Authorization: Bearer <token>`.
2. **Reachability** — from the controller host, `curl -v http://<your-mac>:7776/health` should return 200. If it times out, the Mac's firewall or the LAN segmentation between controller and Mac is blocking. See [troubleshooting networking](/scores/troubleshooting-networking).
3. **Alarm category enabled** — UniFi only sends what you've toggled on in **Notifications → Alarms**. The category settings are independent from the webhook delivery itself.
