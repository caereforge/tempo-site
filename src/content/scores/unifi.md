---
title: "UniFi"
description: "Bring UniFi Network alarms and UniFi Protect events (motion, smart-detect, doorbell) into your Tempo timeline. Built-in: ships with Tempo, nothing to install."
providerIdentifier: "com.ubiquiti.unifi"
color: "#0559C9"
version: "1.0.0"
compatibility:
  - "Network 8.x / 9.x / 10.x"
  - "Protect 5.x"
pubDate: 2026-05-07
builtIn: true
---

UniFi is a **built-in source** in Tempo, bundled with the app and registered automatically on first launch. There's no `.tempo-score` file to download. The umbrella `com.ubiquiti.unifi` covers two siblings out of the box:

- **UniFi Network**: alarms from your controller (clients connecting / disconnecting, devices losing contact, port events, threats, …)
- **UniFi Protect**: events from your camera stack (motion, smart-detect person/vehicle/package, doorbell ring), with the camera thumbnail rendered inline when *Use Thumbnails* is enabled controller-side

Both surface as siblings in the Source panel under a single **UniFi** parent row, mirroring the **Apple → Calendar/Reminders** pattern. The room left in the umbrella is intentional: future Ubiquiti products (Talk, Access, Connect, InnerSpace) can be added as siblings if community interest justifies the work.

---

## Setup: UniFi Network

1. In Tempo **Settings → Ingestion**, add a token named `unifi-network` bound to `com.ubiquiti.unifi.network`. Copy the token.
2. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest/unifi` (replace `<your-mac-hostname>` with the hostname or LAN IP of the Mac running Tempo; the controller is almost always on a different host than your Mac).
3. In the UniFi controller UI, go to **Settings → System → Notifications → Webhooks** (path varies slightly across Network app versions). Add a webhook with:
   - **URL**: the endpoint from step 2
   - **Method**: POST
   - **Authentication**: Bearer with the token from step 1
4. Enable the alarm categories you care about (client connect/disconnect, device lost contact, etc.).

The next alarm the controller fires will land in Tempo's feed.

## Setup: UniFi Protect

1. In Tempo **Settings → Ingestion**, add a token named `unifi-protect` bound to `com.ubiquiti.unifi.protect`. Copy the token.
2. Tempo endpoint for Protect: `http://<your-mac-hostname>:7776/ingest/unifi/protect`.
3. In Protect's UI, edit the alarm whose webhook should reach Tempo: **Action → Webhook → Custom Webhook**. Set:
   - **Delivery URL**: the endpoint from step 2
   - **Method**: POST
   - **Authentication**: Bearer with the token from step 1
   - **Use Thumbnails**: on (recommended). Protect attaches a base64 JPEG to the body and Tempo renders it inline in the action panel
4. Repeat for any other alarm rules you've defined in Protect.

## What Tempo receives

**Network alarms** auto-extract:

- Client identity (MAC, hostname, IP) for client-centric alarms (Connected/Disconnected/Roam)
- Device identity (switch / AP / gateway) for device-level alarms (Lost Contact, Restart)
- Severity from UniFi's `key` field: most alarms route to *info*, `Lost_Contact` and similar to *warning* / *alert*

**Protect events** auto-extract:

- Camera identity (MAC) and the user-named alarm
- Detection type: `motion`, smart-detect classes (`smartdetect_person`, `smartdetect_vehicle`, …), doorbell ring
- Severity: *info* by default for plain motion, *warning* for smart-detect classes, *critical* for intruder/alarm signals
- The Protect event's native UUID as `externalID` so re-deliveries de-dupe cleanly
- The base64 thumbnail (when *Use Thumbnails* is on), rendered inline above the action list

Stacking groups bursts of the same client (Network) or same camera (Protect) into one row.

## Default actions

**UniFi Network**: Open dashboard, Open client in controller, Open UniFi cloud, SSH to controller, Copy device name / MAC, UniFi docs.

**UniFi Protect**: Open in Protect (deep-link to the event page in the controller), Open Protect cloud, Copy event ID, Copy camera MAC, UniFi Protect docs.

You can edit, remove, or add actions in **Settings → Score Editor**. Your local edits override the bundled defaults; **Reset to bundled defaults** in the editor brings them back.

## On thumbnails: Tempo is the funnel, Protect is the cistern

Tempo carries the *signal* of detections forward in time (timestamp + camera + alarm name + event link) for as long as your event-retention setting says. The *images* are kept short (a few days by default) because they're bandwidth-class data and Protect's own dashboard is the canonical archive for them. The bundled Protect score includes an **Open in Protect** action that deep-links to the event page in Protect's web UI, so you always have a path back to the cistern when you need the older clip.

## Known limitations

**Use the plain `:7776` endpoint, not the TLS `:8776` port.** UniFi's webhook client (both Network and Protect) must POST to Tempo's plain-HTTP endpoint as shown in Setup above, not the encrypted TLS port. The TLS handshake itself succeeds (UniFi accepts Tempo's self-signed certificate), but UniFi's HTTPS request framing is not parsed correctly by Tempo's TLS listener: the request line and body arrive empty, so the events are dropped (you'll see them as `400 - empty body` in **Settings → Security → audit**). This is a UniFi-side framing quirk, not a certificate problem. Because the traffic stays on your LAN and every webhook is bound to a per-provider token, plain HTTP here is a deliberate, supported setup, not a security gap. (Improving TLS compatibility for UniFi is tracked for a later release.)

## V2 outlook

UniFi Network ships a Network Integration API in addition to webhooks. For V1 we use webhooks exclusively (push, no polling, no API key custody). V2 may add an opt-in Integration API path for write actions (today: client guest-authorization and device restart only). The webhook path will remain the default; the API is additive when there's a use case the webhook can't cover.

---

## FAQ

### Why don't I see disconnect events for some wired devices (smart TVs, set-top boxes, NAS)?

Because the controller doesn't always send them.

Many modern devices keep the Ethernet PHY active when in standby: smart TVs with Quick Start, streaming sticks waiting for Wake-on-LAN, NAS in low-power mode, set-top boxes that update overnight. The switch sees the link as still up, so the controller doesn't generate a disconnect event. The corresponding disconnect arrives only when the device is fully powered off or unplugged, which is why you'll often see UniFi reporting *Time Connected: 8h 13m* or longer for these devices: it's not a bug, it's the device holding its link up across what looked to you like off-time.

If you need accurate "really off" detection for a specific device, the workaround is to add an Uptime Kuma (or similar) monitor pointed at the device's IP. Kuma will detect actual unreachability and emit a Down event Tempo can stack alongside the UniFi connect.

### Can I get Talk / Access / Connect / InnerSpace events into Tempo?

Not yet. UniFi Network and UniFi Protect are the two products bundled at launch. The umbrella identifier `com.ubiquiti.unifi` is set up to host more siblings whenever community interest, available webhook surface, and our time line up. If you'd like one of those to land sooner, drop a note on Discord.

### My UniFi alarm doesn't appear in Tempo at all

Three things to check, in order:

1. **Token binding**: Settings → Ingestion → confirm the token exists, is bound to `com.ubiquiti.unifi.network` (or `.protect` for Protect), and the controller is sending it as `Authorization: Bearer <token>`.
2. **Reachability**: from the controller host, `curl -v http://<your-mac>:7776/health` should return 200. If it times out, the Mac's firewall or the LAN segmentation between controller and Mac is blocking. See [troubleshooting networking](/scores/troubleshooting-networking).
3. **Alarm category enabled**: UniFi only sends what you've toggled on in **Notifications → Alarms** (Network) or per-rule in Protect. The category settings are independent from the webhook delivery itself.
