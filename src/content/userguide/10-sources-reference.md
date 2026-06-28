---
title: "Sources reference"
description: "The per-source manual: a curated subset of the bundled sources, each with setup, the payload fields its score expects, and what to expect in the timeline."
chapter: 10
order: 10
draft: false
pubDate: 2026-05-05
---
# 10 - Sources reference

This chapter is a per-source manual covering a curated subset of the bundled sources in full detail: setup, what payload fields the bundled score expects, and what to expect in the timeline. Tempo ships about 20 bundled scores; the ones given full sections here are the most common starting points. Every other shipped source is listed in [§10.11 - Full bundled catalog](#1011---full-bundled-catalog), with a one-line summary and a link to its technical guide at [tempoapp.app/scores](https://tempoapp.app/scores).

The sources are presented in a stable order (calendar first, then generic webhook, then alphabetized among the bundled providers covered here). Read straight through if you're new to Tempo; jump directly to the source you're connecting if you're not.

> 🛠 **Tip**: every native (non-Apple Calendar) source uses the same plumbing: Tempo's HTTP ingestion server on port `7776`, a per-provider token, and a JSON or plain-text payload. The differences are which endpoint to hit and what fields the bundled score knows about. If you're comfortable with the generic webhook in §10.2, the native modules are mostly minor variations on the same shape.

> 💡 **About endpoint paths**: you'll notice some sources hit dedicated root paths (`/kopia`, `/uptime-kuma`) while UniFi sits under `/ingest/unifi/network` and `/ingest/unifi/protect`. That's a historical artifact: the earliest two native modules (Kopia, Uptime Kuma) landed before we settled on `/ingest/<source>` as the convention. The behavior is identical regardless of path; the URL each source uses is documented in its section below. Existing scores keep working unchanged across releases.

---

## 10.1 - Apple Calendar and Reminders

**Provider identifiers**: `com.apple.calendar` for calendar events and `com.apple.reminders` for reminders, sharing an **Apple** umbrella in the source panel

The Apple Calendar and Reminders source is **automatic**: it activates the moment you grant Calendar and Reminders permission on first launch. There's no token to set up, no webhook to configure, no upstream change.

### What flows in

- **Calendar events** from every macOS calendar account you've enabled in Calendar.app: iCloud, Google (via macOS Internet Accounts), Exchange, CalDAV servers, local calendars
- **Reminders** from every list you've enabled: iCloud Reminders, Exchange, CardDAV-style reminders

Each entry shows in the timeline as a compact row (no severity, no stripe, no headline metric: agenda items, not alerts). The provider icon is a calendar; the source color is the calendar's native color from Calendar.app.

### Setup

1. **Grant permission**. Tempo prompts you on first launch. If you declined and want to re-enable: System Settings → Privacy & Security → Calendar (and Reminders); tick Tempo
2. **Pick which calendars to show**. Settings → Agenda offers a per-calendar checkbox. Untick noisy or irrelevant calendars (shared work calendars you don't action, family calendars)
3. **Pick which reminder lists to show**. Same panel, separate list

That's it. No tokens, no webhooks, no upstream config.

### What works

- **Reading** calendar events and reminders into the timeline: yes, in real time via EventKit notifications
- **Marking a reminder as completed** from the action panel: yes. This is the one canonical exception to "Tempo never writes back to source apps." When you tick the Complete button on a reminder card, Tempo tells EventKit to mark the reminder done in Reminders.app

### What doesn't work

- **Editing calendar events from Tempo**: no. Calendar.app is the editor; Tempo only displays
- **Creating new calendar events or reminders**: no
- **Editing reminder titles, due dates, list memberships**: no, only the completion toggle is exposed

### Latency and caveats

EventKit is notification-driven. Most state changes propagate to Tempo within a second:

- A reminder you complete in Reminders.app → ticked in Tempo within 1-2 seconds
- A calendar event you edit in Calendar.app → updated in Tempo within 1-2 seconds

Slower paths:

- **iCloud-synced changes from another device**: depends on iCloud's batch interval (typically 10-30 seconds, occasionally longer)
- **Google Calendar via macOS Internet Accounts**: Google's push-vs-poll behavior determines latency. Often 1-5 minutes to fan out
- **CalDAV servers**: varies by server; macOS polls, so latency depends on the configured poll interval (typically 15 minutes)

For more on troubleshooting calendar sync issues, see [§12.2 - Apple Calendar sync issues](/docs/12-troubleshooting#122---apple-calendar-sync-issues).

### Task managers via iCal subscription

If you use a third-party task manager (Todoist, OmniFocus, Things, TickTick, anything that supports iCal export), the recommended pattern for V1 is:

1. **Generate an iCal subscription URL** in your task manager; most expose this as "Calendar feed" or "Sync to calendar" or similar
2. **Subscribe to the URL in macOS Calendar.app**: File → New Calendar Subscription → paste the URL, set a refresh interval (Calendar.app typically supports as fast as 5 minutes)
3. **Tick the subscribed calendar** in Tempo Settings → Agenda

Your task-manager items now appear in the Tempo timeline alongside everything else.

The intrinsic limits of this pattern:

- **Read-only**. Tempo can show the items but can't mark them done in your task manager. Marking complete in Tempo only marks complete in macOS Reminders, which doesn't sync back to your task manager via iCal
- **Refresh latency**. Tempo sees what Calendar.app sees, which is what the iCal subscription has fetched on its last refresh. Sub-minute responsiveness isn't possible on this path
- **Subscription cap**. Calendar.app has its own performance characteristics for many subscribed calendars; if you have 10+ task-manager subscriptions, latency and battery cost compound

> 💡 **Note**: some task managers have their own bundled source. **Todoist** ships with a native score, and **Fastmail** ships as a bundled CalDAV source; see their guides at [tempoapp.app/scores](https://tempoapp.app/scores). For task managers without a dedicated integration (OmniFocus, Things, TickTick), iCal subscription is the bridge. Deeper two-way sync of completion state for more apps is a candidate for a future release.

---

## 10.2 - Generic webhook

**Provider identifier**: anything you choose, conventionally:
- `local.<name>` for senders running on the Mac that hosts Tempo (`local.check_disk`, `local.backup_notify`)
- `lab.<host>.<name>` for senders on other hosts (`lab.nas01.smart_check`, `lab.pi4.temp_monitor`)
- Custom reverse-DNS for everything else (`com.example.my-tool`)

The generic webhook is Tempo's universal entry point. Anything that can POST JSON can send events: shell scripts, Python scripts, Node-RED flows, n8n actions, Apple Shortcuts, Ruby daemons, Go binaries, CI jobs.

### Endpoint

```
POST http://<your-mac>:7776/ingest
Content-Type: application/json
X-Tempo-Token: <token>
```

(`X-Tempo-Token` and `Authorization: Bearer <token>` are both accepted; some senders like UniFi can only set `Authorization`, hence the alias.)

### Minimum payload

```json
{
  "title": "Disk 92% full on homeserver",
  "providerIdentifier": "local.check_disk"
}
```

Only `title` and `providerIdentifier` are required. Everything else is optional and adds context.

### Full payload reference

Every supported field, its bounds, type rules, and the reserved metadata keys (`severity`, `label`, `host`, `exit_code`, `duration_ms`, `command`, `run_id`, `source_file`, `trigger_reason`) are covered below, along with the `metadata.custom` sandbox for free-form fields.

A few highlights worth knowing:

- **Title**: 1-200 chars, plain text. Don't include HTML or Markdown
- **eventType**: `event`, `task`, `reminder`, `alert`. Defaults to `alert`
- **externalID**: stable key. Repeated POSTs with the same `externalID` UPSERT the existing row in place rather than creating a duplicate. Use this for stateful sources (a single monitor that flips down/up over time)
- **metadata**: a structured payload. Reserved keys are typed and validated; everything else goes in `metadata.custom`
- **actions**: up to 8 buttons per event, each with a label, an SF Symbol icon, and a trigger (`openURL`, `openTerminalWith`, `copyToClipboard`)

### What Tempo rejects

- Payload larger than 4 MB → `413`
- Unknown top-level fields, unknown metadata keys, unknown action trigger types → `400`
- URL action with a non-whitelisted scheme (`file://`, `javascript:`, etc.) → `400`
- Token mismatch (token bound to provider X, payload says provider Y) → `403`
- Rate limit exceeded (120 requests per minute, per token, on a sliding 60-second window; no per-IP limit) → `429`

### What you get back

- `200 OK` with a JSON body `{"id":"<event-id>"}` on success
- A descriptive 4xx error explaining what was wrong on failure

### The bundled Scripts score

Any payload whose `providerIdentifier` starts with `scripts.` is rendered through the bundled **Scripts score**, which:

- Maps `metadata.label` to a severity (`OK` → ok green, `Warning` → warning yellow, `Error` → error red, `Critical` → error red)
- Provides a small set of generic actions (SSH to source host, copy host, copy title)
- Groups your scripts under a single **Scripts** row, split one level deep by the first segment after `scripts.`: `scripts.shell` → **Shell**, `scripts.ruby` → **Ruby**, whatever you name it. Anything deeper rolls up: `scripts.ruby.deploy` and `scripts.ruby.migrate` both live under **Ruby**, and the specific name shows in the action panel when you open the event.

**Why only one level?** It lets you split your scripts logically (shell checks apart from Python pollers) without a deep or auto-generated identifier sprouting a tree of rows the source list can't sensibly hold. Breadth is your call (make as many first-level sub-sources as you want); depth is fixed at one. Hazel follows the same rule.

The Scripts score is the right starting point for shell/Python/Ruby scripts you write yourself. For more elaborate UX (custom actions, custom labels, payload-specific severity rules), write a dedicated score for your provider. See [§11 - Score authoring](/docs/11-score-authoring).

### What your card looks like without a score

If you POST to `/ingest` with the bare minimum (`title` + `providerIdentifier`), don't have a score for that provider, and your `providerIdentifier` doesn't fall under the bundled Scripts score's namespace conventions either, the event still lands in the timeline. Tempo doesn't require a score to ingest. But the card will look minimal:

- **Title and timestamp**, the two values you actually sent
- A **neutral gray dot** in the source panel, since Tempo has no color to associate with the source
- Severity stays `info` (the default), so the badge is the small gray "Info" pill
- **No subtitle, no headline, no per-event metric**: none of the rich rendering that bundled scores extract from `metadata`
- **No actions** in the action panel beyond the universal Acknowledge / Dismiss
- The **source name** in the panel is the raw `providerIdentifier` string (`com.example.my-tool` rather than a friendly label)

The card is functional (you can still see *what* happened and *when*) but it's hard to scan at a glance, especially next to fully-scored sources whose cards carry severity color, custom pills, and one-click actions.

Three ways to make a custom source's card richer, in increasing order of effort:

1. **Pass more fields in the payload.** Add `severity` (`"warning"`, `"error"`, `"critical"`) and a few `metadata.custom.<key>` values so Tempo has something to display in the card and the action panel's details list. Five more lines of JSON is often enough to lift the card from "blank" to "informative", with no score authoring required.
2. **Adopt the bundled Scripts score's namespace.** Name your provider `scripts.<lang>.<name>` and the Scripts score picks it up automatically: severity from `metadata.label`, source-panel grouping under a single **Scripts** parent row (one level deep, by `<lang>`), a couple of generic actions. Zero authoring.
3. **Author a dedicated score** for your provider. Full control: custom severity rules, headline templates, action buttons specific to your source, distinct color, friendly display name. The investment is one JSON file (~30 minutes for a first one) and pays for itself the moment that source becomes part of your daily scan.

A useful heuristic: if you'll see this source's events more than once a week, the dedicated score is worth writing. For one-off ad-hoc senders that fire occasionally, option 1 or 2 is enough indefinitely.

### `tempo-post` helper

For shell scripts in particular, Tempo ships a helper (`tempo-post`) that wraps the curl call. See §10.10 below.

---

## 10.3 - Kopia

**Provider identifier**: `com.kopia`
**Endpoint**: `POST http://<your-mac>:7776/kopia`
**Format**: plain text (Kopia's notification template)

### What it does

Kopia is a backup tool that runs snapshots on a schedule (typically via cron, launchd, or its own scheduler). After each snapshot, Kopia can fire a webhook with the result. Tempo's Kopia module parses the plain-text body, extracts the relevant fields, and produces a card per snapshot.

### Setup

1. **Create a token** in Tempo Settings → Ingestion. Bind it to provider `com.kopia`
2. **Configure Kopia's notification**. Where exactly depends on how you run Kopia:
   - **KopiaUI**: Preferences → Notifications → add a webhook with URL `http://localhost:7776/kopia` (or your Mac's LAN IP if Kopia runs on a different host), method `POST`, format `Plain Text`, header `X-Tempo-Token: <token>`
   - **kopia CLI**: set `kopia notification webhook ...` per the Kopia docs, same fields
3. **Trigger a snapshot** to verify. The first event should appear in Tempo within a second of the snapshot completing

### Payload shape

Kopia's plain-text format is `Key: Value` lines, which Tempo parses into metadata:

```
status: success
repository: pcloud
path: /Users/leo/Documents
size: 1.2 GB (+147 KB)
duration: 1.2s
```

The bundled score reads:

- **`status`** → severity (success → ok, error/failed → error, warning → warning)
- **`repository`** → source group label (lets you tell `Kopia - pCloud` from `Kopia - Backblaze`)
- **`path`** → tail used for the title (`Kopia - Documents`); `aliases` in the score can map the full path to a friendlier display name
- **`size`** → headline metric, with a "no change" detection that softens the severity when the snapshot uploaded zero bytes

### Per-path aliases

The Kopia score has an **Aliases** section in the editor (Score Editor → Aliases) that lets you map a snapshot path to a friendlier label:

```
/Users/leo/Documents → Documents
/Users/leo/Code/projects → Projects
/Volumes/External/Photos → Photos
```

The card title shows the alias; the action triggers (`kopia snapshot list ${metadata.path}`) keep using the real path.

### Default actions

The bundled Kopia score offers (per snapshot event):

- **Run snapshot now** → `kopia snapshot create ${metadata.path}` in Terminal
- **List snapshots** → `kopia snapshot list ${metadata.path}` in Terminal
- **Repository status** → `kopia repository status` in Terminal
- **Maintenance info** → `kopia maintenance info` in Terminal
- **Open KopiaUI (desktop app)**
- **Open Kopia server (web UI)**
- **Kopia docs** → opens [kopia.io/docs/](https://kopia.io/docs/)

Customize these via the Score Editor for per-repo SSH actions, dashboard URLs, etc.

### Stateless by design

Each Kopia snapshot is a discrete event: the source is stateless, so every snapshot run lands as a fresh row rather than updating an earlier one. The bundled score declares a `grouping` block by default (`${metadata.repo}/${metadata.path}`, falling back to `${metadata.path}`), so repeated snapshots of the same backup source collapse into one expandable stack out of the box. Edit the grouping template in the Score Editor if you want a different key or time window.

---

## 10.4 - UniFi

Tempo ships **two separate UniFi sources**, with two distinct provider identifiers and two endpoints:

- **UniFi Network** (`com.ubiquiti.unifi.network`) for controller alarms
- **UniFi Protect** (`com.ubiquiti.unifi.protect`) for camera detections

Each has its own ingestion token and its own bundled score. In the source panel they appear together under one **UniFi** row, but that row is a semantic container: it holds no token of its own and produces no events. You configure, token, and toggle each UniFi source separately. The full per-source guide lives at [tempoapp.app/scores/unifi](https://tempoapp.app/scores/unifi).

### 10.4.1 - UniFi Network

**Provider identifier**: `com.ubiquiti.unifi.network`
**Endpoint**: `POST http://<your-mac>:7776/ingest/unifi/network`
**Format**: UniFi's native alarm JSON

UniFi controllers (Cloud Key, UDM, Dream Machine, self-hosted) emit alarm webhooks for events on the network: device disconnects, association failures, firmware updates, port changes, security events. Tempo's UniFi Network module parses the alarm JSON, maps it to severity via the bundled score, and renders it as a card.

#### Setup

1. **Create a token** in Tempo Settings → Ingestion. Bind it to provider `com.ubiquiti.unifi.network`
2. **In your UniFi Network controller**:
   - Add an alert webhook destination
   - **Delivery URL**: `http://<your-mac>:7776/ingest/unifi/network`
   - **Delivery method**: POST
   - **Header**: `X-Tempo-Token: <token>` (or `Authorization: Bearer <token>` if your firmware can't set arbitrary headers)
   - Enable the alarm categories you care about. Client connect and disconnect can fire constantly on a busy network; scope the webhook to device and uplink events if the feed gets noisy
3. **Save** and trigger a test alarm

#### What UniFi Network events look like in Tempo

The bundled score includes ~40 rules that match UniFi's `alarmName` field. Common ones:

- **Lost Contact / device down** → severity `error`, badge "Down"
- **Threat / IPS / IDS** → severity `critical`, badge "Threat"
- **Rogue AP** → severity `critical`, badge "Rogue AP"
- **Upgrade failed**, **Restart / Reboot**, **Speedtest failed** → severity `warning`
- **Client Connected / Disconnected** → severity `info`

Anything the score doesn't recognize falls through to the default: `info`, label "Info". Severity is per-rule and customizable in the Score Editor.

#### Default actions

The bundled UniFi Network score offers:

- **Open dashboard** → `https://${metadata.senderAddress}/network/default/dashboard`
- **Open client in controller** → `https://${metadata.senderAddress}/network/default/clients/${metadata.deviceMac}`
- **Open UniFi dashboard (cloud)** → opens [unifi.ui.com](https://unifi.ui.com/)
- **SSH to controller** → `ssh://root@${metadata.senderAddress}` (requires key-based SSH access to the controller)
- **Copy device name** → `${metadata.device}`
- **Copy MAC address** → `${metadata.deviceMac}`
- **UniFi docs**

#### Grouping

The score groups stateful client sessions: a client **Disconnected** event opens a group keyed on `clientMac` (2 hour window), and a matching **Connected** event closes it, so a disconnect and its reconnect read as one entry. Other device alarms repeat-group on `deviceMac` over a 1 hour window, so a flapping device stays one row.

### 10.4.2 - UniFi Protect

**Provider identifier**: `com.ubiquiti.unifi.protect`
**Endpoint**: `POST http://<your-mac>:7776/ingest/unifi/protect`
**Format**: UniFi Protect's alarm webhook JSON

UniFi Protect fires alarm webhooks for camera detections: motion, smart detections (person, vehicle, package, face), doorbell rings, intrusions. Tempo's Protect module reads the alarm payload and the attached snapshot, so there's nothing to map by hand.

#### Setup

1. **Create a token** in Tempo Settings → Ingestion. Bind it to provider `com.ubiquiti.unifi.protect`. This is a different token from the Network one
2. **In UniFi Protect**, create an alarm and add a **Custom Webhook** action:
   - **Delivery URL**: `http://<your-mac>:7776/ingest/unifi/protect`
   - **Method**: POST
   - **Authentication**: `bearer`, with the Protect token from step 1
   - **Use Thumbnails**: on, if you want the camera snapshot rendered on the event
3. Scope the alarm to the cameras and detection types you want, so the timeline stays focused

#### What UniFi Protect events look like in Tempo

The bundled score reads Protect's `detectionType` to set severity:

- **Intruder**, **Alarm** → severity `critical`
- **Smart detect**, **Person**, **Vehicle**, **Package**, **Face**, **Doorbell ring** → severity `warning`
- **Motion** → severity `info`

When **Use Thumbnails** is enabled controller-side, Tempo renders the camera snapshot inline above the action list. Thumbnails are kept for the period set in Settings → Database / Maintenance, then stripped from the row to keep the database small (the event itself stays).

#### Default actions

- **Open in Protect** → `${metadata.eventLocalLink}` (deep-link to the event page)
- **Open Protect cloud** → opens [unifi.ui.com](https://unifi.ui.com/)
- **Copy event ID** → `${metadata.eventId}`
- **Copy camera MAC** → `${metadata.cameraMac}`
- **UniFi Protect docs**

#### Grouping

Protect events repeat-group on `cameraMac` over a 5 minute window, so a camera firing repeatedly stays one row rather than scattering across the timeline.

---

## 10.5 - Home Assistant

**Provider identifier**: `com.home-assistant`
**Endpoint**: `POST http://<your-mac>:7776/ingest`
**Format**: JSON, Tempo's generic webhook shape

### What it does

Home Assistant has a built-in `notify.webhook` integration (or you can use a `rest` action in YAML). Either way, HA can fire a webhook to Tempo whenever an automation triggers, an alarm panel arms/disarms, a door sensor opens, a smoke detector trips, a script runs, or any other event your automations express.

### Setup

1. **Create a token** in Tempo Settings → Ingestion. Bind it to provider `com.home-assistant`
2. **In Home Assistant's `configuration.yaml`** (or via the UI under Settings → Devices & Services → Add Integration → Webhook), define a `rest` action template:

```yaml
rest_command:
  tempo_alert:
    url: "http://<your-mac>:7776/ingest"
    method: POST
    content_type: "application/json"
    headers:
      X-Tempo-Token: "<your-token>"
    payload: >-
      {
        "title": "{{ title }}",
        "eventType": "alert",
        "providerIdentifier": "com.home-assistant",
        "metadata": {{ metadata | tojson }}
      }
```

3. **Call the action from automations**:

```yaml
automation:
  - alias: "Smoke detector tripped"
    trigger:
      platform: state
      entity_id: binary_sensor.kitchen_smoke
      to: "on"
    action:
      service: rest_command.tempo_alert
      data:
        title: "Smoke detected in kitchen"
        metadata:
          device_class: "smoke"
          area: "kitchen"
          entity_id: "binary_sensor.kitchen_smoke"
```

4. **Trigger the automation** to verify

### What flows in

The bundled Home Assistant score has rules for common patterns:

- `event_type=homeassistant_start` → severity `info`, label "HA started"
- `event_type=homeassistant_stop` → severity `warning`, label "HA stopped"
- `device_class=smoke` → severity `critical`, label "SMOKE"
- `device_class=motion` → severity `info`, label varies by entity
- `state` transitions on alarm panels (`disarmed`, `armed_home`, `armed_away`, `triggered`)

The full rule list is visible in the Score Editor; ~40 rules covering the most common HA automation patterns.

### Default actions

- **Open dashboard** → `http://homeassistant.local:8123`
- **Open entity history** → `http://homeassistant.local:8123/history?entity_id=${metadata.entity_id}`
- **Open automations** → `http://homeassistant.local:8123/config/automation/dashboard`
- **Copy entity ID** → `${metadata.entity_id}`
- **HA docs**

If your HA isn't at `homeassistant.local`, edit the actions in the Score Editor to point at your actual hostname or IP.

---

## 10.6 - Uptime Kuma

**Provider identifier**: `com.uptime-kuma`
**Endpoint**: `POST http://<your-mac>:7776/uptime-kuma`
**Format**: JSON, Uptime Kuma's webhook payload

### What it does

Uptime Kuma is a self-hosted uptime monitor. Each "monitor" (an HTTP probe, a port check, a ping target) transitions between **DOWN / UP / PENDING / MAINTENANCE** states over time. Kuma fires a webhook on every state transition.

Tempo's Uptime Kuma module emits a **stable externalID** per monitor (`kuma:<monitor-id-or-slug>`), which means repeated state transitions update the same row in place: the timeline shows one card per monitor that flips color as the monitor's state changes, not a new card every 60 seconds when the monitor re-notifies.

### Setup

1. **Create a token** in Tempo Settings → Ingestion. Bind it to provider `com.uptime-kuma`
2. **In Uptime Kuma**:
   - Settings → Notifications → Setup Notification → choose Webhook
   - **Post URL**: `http://<your-mac>:7776/uptime-kuma`
   - **Request Body**: Application/JSON
   - **Additional Headers**: `X-Tempo-Token: <token>`
   - Save and test
3. **Apply the notification to your monitors**. Kuma defaults to "every monitor uses every notification"; you can opt into per-monitor notifications if you want only specific monitors to flow into Tempo

### What it looks like in Tempo

- **Monitor goes DOWN** → red card with the monitor name, severity `error` or `critical` (configurable in the score), state `firing`
- **Monitor comes back UP** → the same card updates: severity drops to `ok`, a "Resolved" pill appears, the color goes green
- **Repeated DOWN re-notifies** → no new cards. Same card, same row, severity stays where it was

This is the canonical example of **stateful** event handling in Tempo.

### Default actions

- **Open monitor URL** → `${metadata.url}`
- **Open Kuma dashboard** → `http://${metadata.senderAddress}:3001`
- **Curl probe** → `curl -ksSI ... ${metadata.url}` in Terminal
- **Ping host** → `ping -c 5 ${metadata.hostname}` in Terminal
- **Traceroute host** → `traceroute ${metadata.hostname}` in Terminal
- **Resolve hostname** → `dig ${metadata.hostname} +short` in Terminal
- **Copy monitor URL** → `${metadata.url}`
- **Uptime Kuma docs** → opens [github.com/louislam/uptime-kuma/wiki](https://github.com/louislam/uptime-kuma/wiki)

---

## 10.7 - GitHub Actions

**Provider identifier**: `com.github.actions`
**Endpoint**: `POST http://<your-mac>:7776/ingest`
**Format**: JSON, Tempo's generic webhook shape (GitHub doesn't natively send Tempo-shape events, so a small relay sits in between)

### What it does

GitHub doesn't send arbitrary webhooks the way Home Assistant does. Tempo integrates via:

- **A GitHub webhook** pointing at your relay
- **A small relay process** that translates GitHub's webhook events into Tempo's payload shape and forwards to `7776/ingest`

The relay is intentionally a separate concern (it sits on your LAN and handles HMAC verification, payload translation, etc.). For local development, the relay typically runs on the same Mac as Tempo.

### Setup

The relay is a small companion process distributed alongside the public score catalog at [github.com/caereforge/tempo-scores](https://github.com/caereforge/tempo-scores). Detailed setup (binary download, environment variables, HMAC secret handling) lives in the catalog's README; this section is the high-level outline.

1. **Create a token** in Tempo Settings → Ingestion. Bind it to provider `com.github.actions`
2. **Run the relay** on a host reachable from GitHub: typically a Cloudflare Tunnel exposing your Mac's port to the internet, or a small VPS. Configuration: GitHub HMAC secret, Tempo token, Tempo endpoint
3. **In your GitHub repo**: Settings → Webhooks → Add webhook → relay URL, content-type `application/json`, the HMAC secret you configured

### What flows in

The bundled GitHub Actions score has rules for:

- **Workflow runs**: `workflow_run.conclusion=success` → ok, `failure` → error, `cancelled` → warning
- **Pull requests**: opened, closed, merged
- **Issues**: opened, closed, commented
- **Pushes**: branch updates with commit summaries

### Default actions

- **Open run** → `${metadata.runUrl}`
- **Open repo Actions** → `https://github.com/${metadata.repo}/actions`
- **Copy repo** → `${metadata.repo}`
- **Clone repo** → `git clone https://github.com/${metadata.repo}.git` in Terminal
- **GitHub Actions docs** → opens [docs.github.com/actions](https://docs.github.com/actions)

### Multi-template grouping

GitHub events come in different shapes (issues, PRs, workflow runs each have different metadata). Bundled grouping uses a fallback chain so each event type clusters meaningfully: issues by issue number (`${metadata.repo}/issue/${metadata.issueNumber}`), PRs by PR URL (`${metadata.prUrl}`), workflow runs by repo + workflow name (`${metadata.repo}/workflow/${metadata.workflow}`).

---

## 10.8 - Synology

**Provider identifier**: `com.synology`
**Endpoint**: `POST http://<your-mac>:7776/ingest`
**Format**: JSON, Tempo's generic webhook shape

> ⚠️ **Experimental.** This score was built from Synology's official Custom Webhook documentation and has not been verified end-to-end on live hardware. The test unit died and was disposed of before verification. Treat the body template and the field mapping as a starting point and adjust them to your DSM version if events arrive looking wrong.

### What it does

Synology DSM (the NAS operating system) supports a Custom Webhook notification transport. Pointing it at Tempo gives you cards for DSM notifications: SMART warnings, RAID degradation, login attempts, package updates, scheduled task results.

DSM's Custom Webhook exposes a single reliable substitution token, `@@TEXT@@`, which expands to the rendered notification body as a localized, human-readable string. DSM does not send structured fields (no severity, no event category, no machine identifier). Because the only real signal is that string, the score derives severity by keyword-matching the text rather than reading a severity field.

### Setup

1. **Create a token** in Tempo Settings → Ingestion. Bind it to provider `com.synology`
2. **In DSM**: Control Panel → Notification → Push Service → Webhooks → Add → Custom
3. **Configure**:
   - URL: `http://<your-mac>:7776/ingest`
   - HTTP method: POST
   - Headers: `X-Tempo-Token: <token>`
   - Body template: a JSON template where you hardcode the NAS hostname and copy the `@@TEXT@@` string into the metadata keys the score reads (`subject` for severity matching, `message` for the copy action). See the public score documentation at [tempoapp.app/scores/synology](https://tempoapp.app/scores/synology) for the current recommended template

4. **Save** and trigger a test notification

### Common alerts

The score keyword-matches the notification text and maps it to severity (15 rules), for example:

- **System health**: SMART warnings, RAID degraded, fan failure
- **Storage**: volume full, snapshot failures
- **Authentication**: failed logins, 2FA changes
- **Packages**: updates available, package crashed
- **Scheduled tasks**: backup completed/failed

The bundled score offers a default action set: open DSM, open Storage Manager / Log Center / Security Advisor, SSH or ping the NAS, copy the hostname or message.

### Grouping

Events group on `${metadata.hostname}/${metadata.subject}`, falling back to `${metadata.hostname}`, over a 6 hour window, so repeated notifications of the same kind from one NAS collapse into a single row.

---

## 10.9 - Shell scripts (`scripts.shell`)

**Provider identifier**: `scripts.shell` (or `scripts.<language>` like `scripts.python`, `scripts.ruby`)
**Endpoint**: `POST http://<your-mac>:7776/ingest`

The Scripts namespace is for short-lived senders you write yourself: a shell script that checks disk usage, a Python script that hits a third-party API, a Ruby cron that summarizes something. Anything that produces a result-per-run.

The bundled Scripts score (covered in §10.2) provides a sensible default: maps `metadata.label` to severity, exposes generic actions, and groups your senders under the **Scripts** row, one level deep, by the first segment after `scripts.` (see §10.2 for the why).

### Naming convention

- `scripts.shell`: generic shell script senders
- `scripts.python`: Python script senders
- `scripts.ruby`, `scripts.go`, etc.: language-specific
- `scripts.<anything>`: the first segment after `scripts.` becomes the sub-source row. Only that one level groups; deeper segments (`scripts.ruby.deploy`) are the script's own name and roll up under their first-level row, shown in the action panel.

### Title convention

A useful title convention:

```
<script_name> <metric_or_outcome>
```

Examples:

- `check_disk · 78% / 92% / 100%`: disk usage probe with three filesystems
- `ssl_cert · expires in 12 days`: certificate expiry check
- `backup_notify · OK +1.2GB`: backup wrapper

The severity goes in `metadata.label` or `metadata.severity`, **not** in the title. The title is for *what happened*; the severity field is for *how bad*.

### Quick example

A shell script that checks disk usage and reports to Tempo:

```bash
#!/bin/bash
USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')

if [[ $USAGE -ge 90 ]]; then
    LABEL="Critical"
    TITLE="check_disk · root volume ${USAGE}%"
elif [[ $USAGE -ge 75 ]]; then
    LABEL="Warning"
    TITLE="check_disk · root volume ${USAGE}%"
else
    LABEL="OK"
    TITLE="check_disk · root volume ${USAGE}%"
fi

curl -s -X POST http://localhost:7776/ingest \
  -H "Content-Type: application/json" \
  -H "X-Tempo-Token: $TEMPO_TOKEN" \
  -d "{
    \"title\": \"$TITLE\",
    \"providerIdentifier\": \"local.check_disk\",
    \"metadata\": {
      \"label\": \"$LABEL\",
      \"host\": \"$(hostname)\",
      \"custom\": {
        \"usage_percent\": $USAGE
      }
    }
  }"
```

Schedule this in `crontab` or `launchd`; results land in Tempo automatically.

### When to write a dedicated score

If you find yourself doing the same thing across several scripts (same kinds of severity rules, same kinds of actions), it's worth writing a dedicated score for the shared pattern. See [§11 - Score authoring](/docs/11-score-authoring).

---

## 10.10 - `tempo-post` helper

A wrapper that handles the curl boilerplate so custom scripts can emit events without hand-writing JSON and HTTP headers. It ships bundled with Tempo.app as `tempo-post`, a macOS binary. For homelab hosts that aren't Macs (Linux boxes, a NAS, a Raspberry Pi), download the portable versions from the utilities page at [tempoapp.app/utilities/](https://tempoapp.app/utilities/): `tempo-post.sh` (bash/curl) and `tempo-post.ps1` (PowerShell).

### Installation

Download `tempo-post.sh` from the utilities page and put it on your `$PATH`:

```bash
curl -fsSL https://tempoapp.app/utilities/tempo-post.sh \
  -o ~/.local/bin/tempo-post.sh
chmod +x ~/.local/bin/tempo-post.sh
```

Set environment variables in your shell profile so you don't repeat them on every call:

```bash
export TEMPO_HOST="http://127.0.0.1:7776"
export TEMPO_TOKEN="<your-token>"
```

The token is resolved in precedence order: `--token`, then `TEMPO_TOKEN`, then `TEMPO_TOKEN_FILE` (a path to a `chmod 600` file holding the token), then an interactive hidden prompt when the helper is run from a terminal. Without a terminal (under cron or launchd) it fails fast rather than hanging on a prompt, so set `TEMPO_TOKEN` or `TEMPO_TOKEN_FILE` for unattended jobs.

### Basic usage

`tempo-post.sh` is flag-based; only `--title` is required:

```bash
tempo-post.sh --title "check_disk · root volume 78%" \
  --provider local.check_disk \
  --severity warning \
  --metadata host="$(hostname)" \
  --metadata usage_percent=78
```

The helper builds the JSON payload from your flags, POSTs to `/ingest`, and exits `0` when the event is accepted (HTTP 2xx), `1` on a runtime error (network, auth, or a server rejection), and `2` on a usage error.

### Common flags

| Flag | Purpose |
|---|---|
| `--title <text>` | event title (**required**) |
| `--provider <id>` | provider identifier (default `scripts.shell`) |
| `--severity <info\|ok\|warning\|error\|critical>` | event severity |
| `--event-type <alert\|event\|task\|reminder>` | event type (default `alert`) |
| `--metadata KEY=VALUE` | repeatable; adds a metadata field |
| `--hostname <name>` | shortcut for `--metadata hostname=<name>` |
| `--host <url>` | server URL (default `$TEMPO_HOST` or `http://127.0.0.1:7776`) |
| `--token <text>` | token (overrides `TEMPO_TOKEN` / `TEMPO_TOKEN_FILE`) |
| `--insecure` | skip TLS verification (passes `-k`) |
| `--cacert <path>` | verify TLS against a pinned certificate (for port `:8776`) |
| `--dry-run` | print the payload instead of POSTing |
| `--verbose`, `-v` | verbose output |
| `--help`, `-h` | usage |

### Run-bound stacking

For a multi-step job that should collapse into a single growing card rather than scatter across the timeline, give every step the same `--run-id`. Pass `auto` to have the helper generate one, or set your own. `--run-total <N>` declares how many steps to expect, `--status <text>` sets the current step's status line, and the terminal step carries `--final` (success) or `--final-failure` (failure). `--run-timeout <seconds>` bounds how long the run stays open:

```bash
RUN=$(uuidgen | cut -c1-12)
tempo-post.sh --title "Build started" --run-id "$RUN" --run-total 3 --status "compiling"
tempo-post.sh --title "Tests passed"  --run-id "$RUN" --status "all green"
tempo-post.sh --title "Release done"  --run-id "$RUN" --final --status "completed"
```

### Example: cron job that reports backup results

```bash
#!/bin/bash
# /usr/local/bin/nightly_backup_with_tempo.sh

START=$(date +%s)
if rsync -az ~/Documents user@nas.local:/backups/laptop/; then
    DURATION=$(( $(date +%s) - START ))
    tempo-post.sh --provider local.nightly_backup \
      --title "nightly_backup · OK in ${DURATION}s" \
      --severity info \
      --hostname "$(hostname)" \
      --metadata duration_s=$DURATION
else
    EXIT=$?
    tempo-post.sh --provider local.nightly_backup \
      --title "nightly_backup · failed (exit ${EXIT})" \
      --severity error \
      --hostname "$(hostname)" \
      --metadata exit_code=$EXIT
fi
```

Schedule with launchd or cron; the helper handles the rest.

---

## 10.11 - Full bundled catalog

The sections above cover the most common starting points. Tempo ships about 20 bundled scores in total. The sources not given a full section above are listed here, each with a one-line summary and a link to its technical guide. The guides cover setup, payload fields, severity rules, grouping, and actions in full.

- **[Beszel](/scores/beszel)**: server-monitoring alerts (CPU, memory, disk, temperature), one stack per host and metric, delivered through a small read-only poller that reads the hub's alert history.
- **[Fastmail](/scores/fastmail)** (CalDAV): an experimental, read-only CalDAV bridge that pulls today's Fastmail calendar events into your Tempo agenda. Basic by design: manual configuration, display-only events, no write-back.
- **[Jellyfin](/scores/jellyfin)**: media server events (new media, playback start and stop, login failures, scheduled task results). Read-only, with actions that open the web UI, the item, or the admin dashboard.
- **[Jellyseerr](/scores/jellyseerr)**: media requests and issue reports, grouped by title, with a severity that tracks each request from pending approval through available.
- **[Vaultwarden](/scores/vaultwarden)**: authentication activity (logins, admin access, vault exports, a brute-force signal) plus server reachability, through a log watcher.
- **[Pi-hole](/scores/pi-hole)**: DNS blocking state, reachability, updates, blocklist (gravity) refreshes, and host load, delivered by a small polling helper.
- **[Hazel](/scores/hazel)**: Hazel rule fires as timeline events, each with one-click actions to open the file, jump to a folder, or copy the path.
- **[Todoist](/scores/todoist)**: today's and overdue tasks, grouped by project, with priority-driven severity and buttons to open the task or the Todoist app.
- **[Sonarr](/scores/sonarr)**: grabs, imports, and health events, stacked per series, each carrying an Open Sonarr action.
- **[Radarr](/scores/radarr)**: grabs, imports, and health events, stacked per movie, with an Open Radarr action resolved to the sender's address.
- **[Prowlarr](/scores/prowlarr)**: health and update events (health issues as warnings, recoveries as resolved, application updates as info), each with an Open Prowlarr action.
- **[Apple Shortcuts](/scores/shortcuts)**: send your own events from Apple Shortcuts, on a Mac or an iPhone, with a webhook action whose JSON body drives the score's labels and indicators.

For sources beyond the bundled set, see [§11 - Score authoring](/docs/11-score-authoring) and the community catalog at [github.com/caereforge/tempo-scores](https://github.com/caereforge/tempo-scores).

---

## Where to go from here

- **Writing a custom score for a source not bundled** → [§11 - Score authoring](/docs/11-score-authoring)
- **Customizing one of the bundled scores** → [§7 - Score Editor](/docs/07-score-editor)
- **The full webhook payload reference** → see [**§10.2 - Generic webhook → Full payload reference**](#full-payload-reference) above
- **Troubleshooting "my events aren't arriving"** → [§12.1 - Networking](/docs/12-troubleshooting#121---networking-lan-ingestion) and [§12.3 - A score isn't appearing](/docs/12-troubleshooting#123---a-score-isnt-appearing)
- **The full bundled-source catalog** → [§10.11 - Full bundled catalog](#1011---full-bundled-catalog) lists every shipped source with a link to its technical guide at [tempoapp.app/scores](https://tempoapp.app/scores)
- **The community score catalog** → [github.com/caereforge/tempo-scores](https://github.com/caereforge/tempo-scores): user-contributed scores for sources beyond the bundled set
