---
title: "Sources reference"
description: "This chapter is the per-source manual: every bundled source gets its own section covering setup, what payload fields the bundled score expects, and what to expect in the timeline."
chapter: 10
order: 10
draft: false
pubDate: 2026-05-05
---
# 10 — Sources reference

This chapter is the per-source manual: every bundled source gets its own section covering setup, what payload fields the bundled score expects, and what to expect in the timeline.

The sources are presented in a stable order (calendar first, then generic webhook, then alphabetised among bundled providers). Read straight through if you're new to Tempo; jump directly to the source you're connecting if you're not.

> 🛠 **Tip**: every native (non-Apple Calendar) source uses the same plumbing — Tempo's HTTP ingestion server on port `7776`, a per-provider token, a JSON or plain-text payload. The differences are which endpoint to hit and what fields the bundled score knows about. If you're comfortable with the generic webhook in §10.2, the native modules are mostly minor variations on the same shape.

> 💡 **About endpoint paths**: you'll notice some sources hit dedicated root paths (`/kopia`, `/uptime-kuma`) while UniFi sits under `/ingest/unifi`. That's a historical artifact — the earliest two native modules (Kopia, Uptime Kuma) landed before we settled on `/ingest/<source>` as the convention. The behaviour is identical regardless of path; the URL each source uses is documented in its section below. Existing scores keep working unchanged across releases.

---

## 10.1 — Apple Calendar and Reminders

**Provider identifiers**: `com.apple.calendar` for calendar events and `com.apple.reminders` for reminders, sharing an **Apple** umbrella in the source panel

The Apple Calendar and Reminders source is **automatic**: it activates the moment you grant Calendar and Reminders permission on first launch. There's no token to set up, no webhook to configure, no upstream change.

### What flows in

- **Calendar events** from every macOS calendar account you've enabled in Calendar.app — iCloud, Google (via macOS Internet Accounts), Exchange, CalDAV servers, local calendars
- **Reminders** from every list you've enabled — iCloud Reminders, Exchange, CardDAV-style reminders

Each entry shows in the timeline as a compact row (no severity, no stripe, no headline metric — agenda items, not alerts). The provider icon is a calendar; the source colour is the calendar's native colour from Calendar.app.

### Setup

1. **Grant permission**. Tempo prompts you on first launch. If you declined and want to re-enable: System Settings → Privacy & Security → Calendar (and Reminders); tick Tempo
2. **Pick which calendars to show**. Settings → Agenda offers a per-calendar checkbox. Untick noisy or irrelevant calendars (shared work calendars you don't action, family calendars)
3. **Pick which reminder lists to show**. Same panel, separate list

That's it. No tokens, no webhooks, no upstream config.

### What works

- **Reading** calendar events and reminders into the timeline — yes, in real time via EventKit notifications
- **Marking a reminder as completed** from the action panel — yes. This is the one canonical exception to "Tempo never writes back to source apps." When you tick the Complete button on a reminder card, Tempo tells EventKit to mark the reminder done in Reminders.app

### What doesn't work

- **Editing calendar events from Tempo** — no. Calendar.app is the editor; Tempo just displays
- **Creating new calendar events or reminders** — no
- **Editing reminder titles, due dates, list memberships** — no, only the completion toggle is exposed

### Latency and caveats

EventKit is notification-driven. Most state changes propagate to Tempo within a second:

- A reminder you complete in Reminders.app → ticked in Tempo within 1-2 seconds
- A calendar event you edit in Calendar.app → updated in Tempo within 1-2 seconds

Slower paths:

- **iCloud-synced changes from another device** — depends on iCloud's batch interval (typically 10-30 seconds, occasionally longer)
- **Google Calendar via macOS Internet Accounts** — Google's push-vs-poll behaviour determines latency. Often 1-5 minutes to fan out
- **CalDAV servers** — varies by server; macOS polls, so latency depends on the configured poll interval (typically 15 minutes)

For more on troubleshooting calendar sync issues, see [§12.2 — Apple Calendar sync issues](/docs/12-troubleshooting#122-apple-calendar-sync-issues).

### Task managers via iCal subscription

If you use a third-party task manager (Todoist, OmniFocus, Things, TickTick, anything that supports iCal export), the recommended pattern for V1 is:

1. **Generate an iCal subscription URL** in your task manager — most expose this as "Calendar feed" or "Sync to calendar" or similar
2. **Subscribe to the URL in macOS Calendar.app** — File → New Calendar Subscription → paste the URL, set a refresh interval (Calendar.app typically supports as fast as 5 minutes)
3. **Tick the subscribed calendar** in Tempo Settings → Agenda

Your task-manager items now appear in the Tempo timeline alongside everything else.

The intrinsic limits of this pattern:

- **Read-only**. Tempo can show the items but can't mark them done in your task manager. Marking complete in Tempo only marks complete in macOS Reminders, which doesn't sync back to your task manager via iCal
- **Refresh latency**. Tempo sees what Calendar.app sees, which is what the iCal subscription has fetched on its last refresh. Sub-minute responsiveness isn't possible on this path
- **Subscription cap**. Calendar.app has its own performance characteristics for many subscribed calendars; if you have 10+ task-manager subscriptions, latency and battery cost compound

> 💡 **Note**: native API integration with a specific task manager — actually talking to the Todoist API or OmniFocus database directly, with two-way sync of completion state — is a candidate for a future release. For V1, iCal subscription is the sanctioned bridge.

---

## 10.2 — Generic webhook

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

See the canonical reference at [`docs/webhook-reference.md`](https://github.com/caereforge/tempo-scores/blob/main/docs/webhook-reference.md) — covers every supported field, bounds, type rules, the reserved metadata keys (`severity`, `label`, `host`, `exit_code`, `duration_ms`, `command`, `run_id`, `source_file`, `trigger_reason`), and the `metadata.custom` sandbox for free-form fields.

A few highlights worth knowing:

- **Title**: 1-200 chars, plain text. Don't include HTML or Markdown
- **eventType**: `event`, `task`, `reminder`, `alert`. Defaults to `alert`
- **externalID**: stable key — repeated POSTs with the same `externalID` UPSERT the existing row in place rather than creating a duplicate. Use this for stateful sources (a single monitor that flips down/up over time)
- **metadata**: a structured payload. Reserved keys are typed and validated; everything else goes in `metadata.custom`
- **actions**: up to 8 buttons per event, each with a label, an SF Symbol icon, and a trigger (`openURL`, `openTerminalWith`, `copyToClipboard`)

### What Tempo rejects

- Payload larger than 64 KiB → `413`
- Unknown top-level fields, unknown metadata keys, unknown action trigger types → `400`
- URL action with a non-whitelisted scheme (`file://`, `javascript:`, etc.) → `400`
- Token mismatch (token bound to provider X, payload says provider Y) → `403`
- Rate limit exceeded (600 requests / 10 min per token, 3000 / 10 min per IP) → `429`

### What you get back

- `202 Accepted` with the generated event ID on success
- A descriptive 4xx error explaining what was wrong on failure

### The bundled Scripts score

Any payload whose `providerIdentifier` starts with `scripts.` (or matches the `local.*` / `lab.*` namespace conventions) is rendered through the bundled **Scripts score**, which:

- Maps `metadata.label` to a severity (`OK` → ok green, `Warning` → warning yellow, `Error` → error red, `Critical` → error red)
- Surfaces a small set of generic actions (SSH to source host, copy host, copy title)
- Groups scripts under a "Scripts" parent row in the source panel (so 20 different `scripts.*` providers don't take 20 sidebar rows)

The Scripts score is the right starting point for shell/Python/Ruby scripts you write yourself. For more elaborate UX (custom actions, custom labels, payload-specific severity rules), write a dedicated score for your provider — see [§11 — Score authoring](/docs/11-score-authoring).

### What your card looks like without a score

If you POST to `/ingest` with the bare minimum (`title` + `providerIdentifier`) and don't have a score for that provider — and your `providerIdentifier` doesn't fall under the bundled Scripts score's namespace conventions either — the event still lands in the timeline. Tempo doesn't require a score to ingest. But the card will look minimal:

- **Title and timestamp**, the two values you actually sent
- A **neutral grey dot** in the source panel — Tempo has no colour to associate with the source
- Severity stays `info` (the default), so the badge is the small grey "Info" pill
- **No subtitle, no headline, no per-event metric** — none of the rich rendering that bundled scores extract from `metadata`
- **No actions** in the action panel beyond the universal Acknowledge / Dismiss
- The **source name** in the panel is the raw `providerIdentifier` string (`com.example.my-tool` rather than a friendly label)

The card is functional — you can still see *what* happened and *when* — but it's hard to scan at a glance, especially next to fully-scored sources whose cards carry severity colour, custom pills, and one-click actions.

Three ways to make a custom source's card richer, in increasing order of effort:

1. **Pass more fields in the payload.** Add `severity` (`"warning"`, `"error"`, `"critical"`) and a few `metadata.custom.<key>` values so Tempo has something to display in the card and the action panel's details list. Five more lines of JSON is often enough to lift the card from "blank" to "informative" — no score authoring required.
2. **Adopt the bundled Scripts score's namespace.** Name your provider `scripts.<lang>.<name>` (or `local.<name>` / `lab.<host>.<name>` per the conventions above) and the Scripts score picks it up automatically: severity from `metadata.label`, source-panel grouping under a single **Scripts** parent row, a couple of generic actions. Zero authoring.
3. **Author a dedicated score** for your provider. Full control: custom severity rules, headline templates, action buttons specific to your source, distinct colour, friendly display name. The investment is one JSON file (~30 minutes for a first one) and pays for itself the moment that source becomes part of your daily scan.

A useful heuristic: if you'll see this source's events more than once a week, the dedicated score is worth writing. For one-off ad-hoc senders that fire occasionally, option 1 or 2 is enough indefinitely.

### `tempo_send.sh` helper

For shell scripts in particular, Tempo ships a helper script (`tempo_send.sh`) that wraps the curl call. See §10.10 below.

---

## 10.3 — Kopia

**Provider identifier**: `com.kopia`
**Endpoint**: `POST http://<your-mac>:7776/kopia`
**Format**: plain text (Kopia's notification template)

### What it does

Kopia is a backup tool that runs snapshots on a schedule (typically via cron, launchd, or its own scheduler). After each snapshot, Kopia can fire a webhook with the result. Tempo's Kopia module parses the plain-text body, extracts the relevant fields, and produces a card per snapshot.

### Setup

1. **Create a token** in Tempo Settings → Ingestion. Bind it to provider `com.kopia`
2. **Configure Kopia's notification**. Where exactly depends on how you run Kopia:
   - **KopiaUI** — Preferences → Notifications → add a webhook with URL `http://localhost:7776/kopia` (or your Mac's LAN IP if Kopia runs on a different host), method `POST`, format `Plain Text`, header `X-Tempo-Token: <token>`
   - **kopia CLI** — set `kopia notification webhook ...` per the Kopia docs, same fields
3. **Trigger a snapshot** to verify. The first event should appear in Tempo within a second of the snapshot completing

### Payload shape

Kopia's plain-text format is `Key: Value` lines — Tempo parses them into metadata:

```
status: success
repository: pcloud
path: /Users/leo/Documents
size: 1.2 GB (+147 KB)
duration: 1.2s
```

The bundled score reads:

- **`status`** → severity (success → ok, error/failed → error, warning → warning)
- **`repository`** → source group label (lets you tell `Kopia — pCloud` from `Kopia — Backblaze`)
- **`path`** → tail used for the title (`Kopia — Documents`); `aliases` in the score can map the full path to a friendlier display name
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
- **Kopia docs** → opens [kopia.io/docs/](https://kopia.io/docs/)

Customise these via the Score Editor for per-repo SSH actions, dashboard URLs, etc.

### Stateless by design

Each Kopia snapshot is a discrete event. The bundled score uses **no externalID** — every snapshot is a fresh row. The bundled score doesn't declare a `grouping` block by default, so each snapshot lands on its own line; if you want history-of-one-target collapsed into a stack, add a grouping template like `${metadata.repo}/${metadata.path}` in the Score Editor (with whatever time window suits your cadence).

---

## 10.4 — UniFi

**Provider identifier**: `com.ubiquiti.unifi`
**Endpoint**: `POST http://<your-mac>:7776/ingest/unifi`
**Format**: UniFi's native alarm JSON (Default Content)

### What it does

UniFi controllers (Cloud Key, UDM, Dream Machine, self-hosted) emit alarm webhooks for events on the network: device disconnects, association failures, firmware updates, port changes, security events. Tempo's UniFi module parses the alarm JSON (which varies in shape across firmware versions — Tempo handles both flat and wrapped forms), maps it to severity via the bundled UniFi score, and renders it as a card.

### Setup

1. **Create a token** in Tempo Settings → Ingestion. Bind it to provider `com.ubiquiti.unifi`
2. **In your UniFi controller**:
   - Open **Settings → System → Alerts** (or **Notifications**, depending on UniFi version)
   - Add a new alarm/webhook destination
   - **Delivery URL**: `http://<your-mac>:7776/ingest/unifi`
   - **Delivery method**: POST
   - **Authentication**: None (UniFi can't set arbitrary headers in some firmware, so Tempo accepts the token via `Authorization: Bearer <token>`)
   - **Add Header**: `Authorization: Bearer <token>` (or `X-Tempo-Token: <token>` if your firmware supports it)
   - **Content**: Default Content (let UniFi send its native shape)
3. **Save** and trigger a test alarm — the controller's UI usually has a "Send test" button next to the webhook destination

### What UniFi events look like in Tempo

The bundled UniFi score includes ~40 rules covering the alarm types most homelabs see. Common ones:

- **STA_ASSOC_FAILURE** — wireless client failed to associate. Severity: warning
- **STA_AUTH_FAILURE** — wireless authentication failure (wrong WPA password, certificate issue). Severity: warning
- **WAN_DISCONNECTED** — uplink lost. Severity: critical
- **DEVICE_OFFLINE** — managed device (AP, switch) went offline. Severity: error
- **EVT_AD_LOGIN** — admin login to the controller. Severity: info

Severity is per-rule and customisable in the Score Editor.

### Default actions

The bundled UniFi score offers:

- **Open local controller (port 443)** → `https://${metadata.senderAddress}/network/default/dashboard`
- **Open local controller (port 8443)** → `https://${metadata.senderAddress}:8443/manage/site/default/dashboard`
- **Open client in controller (port 443)** → `https://${metadata.senderAddress}/network/default/clients/${metadata.deviceMac}`
- **Open client in controller (port 8443)** → `https://${metadata.senderAddress}:8443/manage/site/default/clients/${metadata.deviceMac}`
- **Open UniFi dashboard (cloud)** → opens [unifi.ui.com](https://unifi.ui.com/)
- **SSH to controller** → `ssh://root@${metadata.senderAddress}` (requires that you've set up key-based SSH access to the controller)

### Multi-template grouping

UniFi alarms come in different shapes (some have `clientMac` and `deviceMac`, some only `deviceMac`). The bundled score uses a fallback chain:

```
${metadata.clientMac}/${metadata.deviceMac}
${metadata.deviceMac}
${metadata.alarmKey}
```

So client-association events group by client+AP, device-status events group by AP alone, and miscellaneous alarms group by key.

---

## 10.5 — Home Assistant

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

The full rule list is visible in the Score Editor; ~30 rules covering the most common HA automation patterns.

### Default actions

- **Open dashboard** → `http://homeassistant.local:8123`
- **Open entity history** → `http://homeassistant.local:8123/history?entity_id=${metadata.entity_id}`
- **Open automations** → `http://homeassistant.local:8123/config/automation/dashboard`

If your HA isn't at `homeassistant.local`, edit the actions in the Score Editor to point at your actual hostname or IP.

---

## 10.6 — Uptime Kuma

**Provider identifier**: `com.uptime-kuma`
**Endpoint**: `POST http://<your-mac>:7776/uptime-kuma`
**Format**: JSON, Uptime Kuma's webhook payload

### What it does

Uptime Kuma is a self-hosted uptime monitor. Each "monitor" (an HTTP probe, a port check, a ping target) transitions between **DOWN / UP / PENDING / MAINTENANCE** states over time. Kuma fires a webhook on every state transition.

Tempo's Uptime Kuma module emits a **stable externalID** per monitor (`kuma:<monitor-id-or-slug>`), which means repeated state transitions update the same row in place — the timeline shows one card per monitor that flips colour as the monitor's state changes, not a new card every 60 seconds when the monitor re-notifies.

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
- **Monitor comes back UP** → the same card updates: severity drops to `ok`, a "Resolved" pill appears, the colour goes green
- **Repeated DOWN re-notifies** → no new cards. Same card, same row, severity stays where it was

This is the canonical example of **stateful** event handling in Tempo.

### Default actions

- **Open Uptime Kuma dashboard** → `${metadata.statusPageURL}` if present, else a default
- **Probe URL** → `openURL: ${metadata.url}` (if the monitor target is HTTP-shaped)
- **Uptime Kuma docs** → opens [github.com/louislam/uptime-kuma/wiki](https://github.com/louislam/uptime-kuma/wiki)

---

## 10.7 — GitHub Actions

**Provider identifier**: `com.github.actions`
**Endpoint**: `POST http://<your-mac>:7776/ingest`
**Format**: JSON, Tempo's generic webhook shape (GitHub doesn't natively send Tempo-shape events, so a small relay sits in between)

### What it does

GitHub doesn't send arbitrary webhooks the way Home Assistant does. Tempo integrates via:

- **A GitHub webhook** pointing at your relay
- **A small relay process** that translates GitHub's webhook events into Tempo's payload shape and forwards to `7776/ingest`

The relay is intentionally a separate concern (it sits on your LAN and handles HMAC verification, payload translation, etc.). For local development, the relay typically runs on the same Mac as Tempo.

### Setup

The relay is a small companion process distributed alongside the public score catalog at [github.com/caereforge/tempo-scores](https://github.com/caereforge/tempo-scores). Detailed setup (binary download, environment variables, HMAC secret handling) lives in the catalog's README — this section is the high-level outline.

1. **Create a token** in Tempo Settings → Ingestion. Bind it to provider `com.github.actions`
2. **Run the relay** on a host reachable from GitHub — typically a Cloudflare Tunnel exposing your Mac's port to the internet, or a small VPS. Configuration: GitHub HMAC secret, Tempo token, Tempo endpoint
3. **In your GitHub repo**: Settings → Webhooks → Add webhook → relay URL, content-type `application/json`, the HMAC secret you configured

### What flows in

The bundled GitHub Actions score has rules for:

- **Workflow runs**: `workflow_run.conclusion=success` → ok, `failure` → error, `cancelled` → warning
- **Pull requests**: opened, closed, merged
- **Issues**: opened, closed, commented
- **Pushes**: branch updates with commit summaries

### Default actions

- **Open repo Actions** → `https://github.com/${metadata.repo}/actions`
- **Open run** → `https://github.com/${metadata.repo}/actions/runs/${metadata.run_id}`
- **Clone repo** → `git clone https://github.com/${metadata.repo}.git` in Terminal
- **GitHub Actions docs** → opens [docs.github.com/actions](https://docs.github.com/actions)

### Multi-template grouping

GitHub events come in different shapes (issues, PRs, workflow runs each have different metadata). Bundled grouping uses a fallback chain so each event type clusters meaningfully — issues by issue number, PRs by PR number, workflow runs by workflow name + branch.

---

## 10.8 — Synology

**Provider identifier**: `com.synology` (umbrella; sub-products distinguished via `metadata.sourceGroup` like `DSM`, `SurveillanceStation`)
**Endpoint**: `POST http://<your-mac>:7776/ingest`
**Format**: JSON, Tempo's generic webhook shape

### What it does

Synology DSM (the NAS operating system) supports webhook destinations via Notification Settings. Pointing it at Tempo gives you cards for: SMART warnings, RAID degradation, login attempts, package updates, scheduled task results, Surveillance Station alerts.

### Setup

1. **Create a token** in Tempo Settings → Ingestion. Bind it to provider `com.synology`
2. **In DSM**: Control Panel → Notification → Push Service → Webhook (or "Custom webhook" depending on DSM version)
3. **Configure**:
   - URL: `http://<your-mac>:7776/ingest`
   - HTTP method: POST
   - Headers: `X-Tempo-Token: <token>`
   - Body template: a JSON template DSM expands with placeholders like `@@SUBJECT@@` and `@@MESSAGE@@`. The exact template depends on DSM version — see the public score documentation at [tempoapp.app/scores/synology](https://tempoapp.app/scores/synology) for the current recommended template

4. **Save** and trigger a test notification

### Common alerts

- **System health**: SMART warnings, RAID degraded, fan failure
- **Storage**: volume full, snapshot failures
- **Authentication**: failed logins, 2FA changes
- **Packages**: updates available, package crashed
- **Scheduled tasks**: backup completed/failed, hyper backup result

The bundled score maps each to severity and offers a default action set: open DSM, open the relevant control panel page, copy the hostname.

### Multiple Synology products

If you have DSM + Surveillance Station + Photos + Drive — they all live under `com.synology` as the provider, but `metadata.sourceGroup` differentiates them. The source panel groups them under one Synology row with sub-rows per product.

---

## 10.9 — Shell scripts (`scripts.shell`)

**Provider identifier**: `scripts.shell` (or `scripts.<language>` like `scripts.python`, `scripts.ruby`)
**Endpoint**: `POST http://<your-mac>:7776/ingest`

The Scripts namespace is for short-lived senders you write yourself: a shell script that checks disk usage, a Python script that hits a third-party API, a Ruby cron that summarises something. Anything that produces a result-per-run.

The bundled Scripts score (covered in §10.2) provides a sensible default: maps `metadata.label` to severity, surfaces generic actions, groups all `scripts.*` providers under one Scripts row in the source panel.

### Naming convention

- `scripts.shell` — generic shell script senders
- `scripts.python` — Python script senders
- `scripts.ruby`, `scripts.go`, etc. — language-specific
- `local.<name>` — for senders running on the same Mac as Tempo (preferred for clarity)
- `lab.<host>.<name>` — for senders on other LAN hosts

### Title convention

A useful title convention:

```
<script_name> <metric_or_outcome>
```

Examples:

- `check_disk · 78% / 92% / 100%` — disk usage probe with three filesystems
- `ssl_cert · expires in 12 days` — certificate expiry check
- `backup_notify · OK +1.2GB` — backup wrapper

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

If you find yourself doing the same thing across several scripts (same kinds of severity rules, same kinds of actions), it's worth writing a dedicated score for the shared pattern. See [§11 — Score authoring](/docs/11-score-authoring).

---

## 10.10 — `tempo_send.sh` helper

A wrapper script that handles the curl boilerplate so custom scripts can emit events without hand-writing JSON and HTTP headers. Distributed in the `contrib/` folder of the public score catalog at [github.com/caereforge/tempo-scores](https://github.com/caereforge/tempo-scores).

### Installation

Download `tempo_send.sh` from the public catalog repo and put it on your `$PATH`:

```bash
curl -fsSL https://raw.githubusercontent.com/caereforge/tempo-scores/main/contrib/tempo_send.sh \
  -o ~/.local/bin/tempo_send
chmod +x ~/.local/bin/tempo_send
```

Set environment variables in your shell profile:

```bash
export TEMPO_HOST="localhost:7776"
export TEMPO_TOKEN="<your-token>"
```

### Basic usage

`tempo_send` takes the provider identifier and title as positional arguments, with options after:

```bash
tempo_send local.check_disk "check_disk · root volume 78%" \
  --severity warning \
  --meta host="$(hostname)" \
  --meta usage_percent=78
```

The helper:

- Reads `TEMPO_HOST` / `TEMPO_TOKEN` from environment (or `--host` / `--token` flags)
- Builds the JSON payload from your flags
- POSTs to `/ingest`
- Returns 0 on accept, 2 on usage error, 3 on missing token, 4 on network/HTTP error

### Available flags

| Flag | Purpose |
|---|---|
| `--severity info\|warning\|error` | sets severity (default `info`); also drives default colour and event type |
| `--event-type event\|task\|reminder\|alert` | overrides the severity-derived event type |
| `--color #RRGGBB` | overrides the severity-derived colour |
| `--external-id ID` | stable key for upserts (re-posts replace in place) |
| `--grouping-key KEY` | UI-level grouping of repeated firings |
| `--start ISO8601` | event start timestamp (defaults to server time) |
| `--end ISO8601` | event end timestamp |
| `--recurrence-rule RRULE` | iCal RRULE string (e.g. `FREQ=WEEKLY;BYDAY=MO`) |
| `--meta KEY=VALUE` | repeatable; adds a metadata field |
| `--terminal LABEL=COMMAND` | repeatable; adds an "open Terminal" action button |
| `--url LABEL=URL` | repeatable; adds an "open URL" action button |
| `--copy LABEL=TEXT` | repeatable; adds a "copy to clipboard" action button |
| `--host HOST:PORT` | overrides `TEMPO_HOST` |
| `--token TOKEN` | overrides `TEMPO_TOKEN` |
| `--dry-run` | print the payload to stdout instead of POSTing |

### Example: cron job that reports backup results

```bash
#!/bin/bash
# /usr/local/bin/nightly_backup_with_tempo.sh

START=$(date +%s)
if rsync -az ~/Documents user@nas.local:/backups/laptop/; then
    DURATION=$(( $(date +%s) - START ))
    tempo_send local.nightly_backup "nightly_backup · OK in ${DURATION}s" \
      --severity info \
      --meta host="$(hostname)" \
      --meta duration_s=$DURATION
else
    EXIT=$?
    tempo_send local.nightly_backup "nightly_backup · failed (exit ${EXIT})" \
      --severity error \
      --meta host="$(hostname)" \
      --meta exit_code=$EXIT
fi
```

Schedule with launchd or cron; the helper handles the rest.

---

## Where to go from here

- **Writing a custom score for a source not bundled** → [§11 — Score authoring](/docs/11-score-authoring)
- **Customising one of the bundled scores** → [§7 — Score Editor](/docs/07-score-editor)
- **The full webhook payload reference** → [`docs/webhook-reference.md`](https://github.com/caereforge/tempo-scores/blob/main/docs/webhook-reference.md)
- **Troubleshooting "my events aren't arriving"** → [§12.1 — Networking](/docs/12-troubleshooting#121-networking-lan-ingestion) and [§12.3 — A score isn't appearing](/docs/12-troubleshooting#123-a-score-isnt-appearing)
- **The community score catalog** → [github.com/caereforge/tempo-scores](https://github.com/caereforge/tempo-scores) — Proxmox, Jellyfin, Vaultwarden, Pi-hole, Hazel, and more
