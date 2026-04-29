---
title: "Home Assistant"
description: "Home Assistant state changes and automations in your Tempo timeline, with multi-key severity rules and human-readable titles via ${metadata.xxx} interpolation."
providerIdentifier: "com.home-assistant"
color: "#18BCF2"
version: "1.0.0"
file: "/scores/home-assistant.tempo-score"
compatibility:
  - "Home Assistant 2024.1+"
pubDate: 2026-04-23
downloadable: false
---

Home Assistant has no native "custom webhook" notification service the way DSM or Proxmox do — you build the payload yourself inside an **automation**, using the `rest_command` or `notify.rest` integration. The upside: you control every field. The downside: there is no official external contract Tempo can conform to. This page documents the contract **Tempo expects**, and gives you a drop-in Jinja template to produce it.

This score ships with 13 severity rules that demonstrate the full range of Tempo's matching engine: multi-key matches (entity_id + state), glob patterns, presentation templates that rewrite the title with values pulled from the payload.

No adapter on the Tempo side is required.

---

## Install

1. Download `home-assistant.tempo-score` from the button above (or keep the bundled copy Tempo seeded on first launch).
2. Double-click. Tempo opens a review sheet — click **Install**.
3. In Tempo **Settings → Ingestion**, add a token named `home-assistant` bound to `com.home-assistant`. Copy the token.
4. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/events`.
5. Configure Home Assistant (see below).

## Home Assistant side — the rest_command

Add this to your `configuration.yaml`:

```yaml
rest_command:
  tempo_event:
    url: "http://your-mac.local:7776/events"
    method: POST
    headers:
      Content-Type: "application/json"
      X-Tempo-Token: "YOUR_TOKEN_HERE"
    payload: >
      {{ payload }}
    content_type: "application/json"
```

Reload REST commands (**Developer Tools → YAML → REST Commands**) or restart HA.

## The payload contract

Tempo expects this shape. Fields marked **required** are the minimum; everything else is optional metadata that your severity rules and actions can reference with `${metadata.xxx}`.

```json
{
  "title": "string — human-readable title (required; overridden by score rules)",
  "providerIdentifier": "com.home-assistant",
  "eventType": "alert",
  "metadata": {
    "entity_id":     "binary_sensor.kitchen_smoke",
    "state":         "on",
    "friendly_name": "Kitchen smoke detector",
    "area":          "Kitchen",
    "device_class":  "smoke",
    "automation":    "optional — set this instead of entity_id for automation triggers"
  }
}
```

**Reserved Tempo fields (`title`, `providerIdentifier`, `eventType`) are at the top level. Everything Home Assistant specific lives in `metadata`.**

## Jinja template — one automation, all entities

Drop this automation into **Settings → Automations & Scenes**. It fires on any state change for any entity in the domains you care about (smoke, leak, door, window, motion, battery, climate), builds the Tempo payload with interpolated values, and POSTs it.

```yaml
alias: "Tempo — forward state changes"
mode: queued
max: 25
trigger:
  - platform: state
    entity_id:
      - binary_sensor.kitchen_smoke
      - binary_sensor.garage_leak
      - binary_sensor.front_door
      - binary_sensor.living_room_motion
      - sensor.master_bedroom_battery
      - climate.living_room
action:
  - service: rest_command.tempo_event
    data:
      payload: >-
        {
          "title": "{{ state_attr(trigger.entity_id, 'friendly_name') or trigger.entity_id }}",
          "providerIdentifier": "com.home-assistant",
          "eventType": "alert",
          "metadata": {
            "entity_id":     "{{ trigger.entity_id }}",
            "state":         "{{ trigger.to_state.state }}",
            "friendly_name": "{{ state_attr(trigger.entity_id, 'friendly_name') or trigger.entity_id }}",
            "area":          "{{ area_name(trigger.entity_id) or 'Home' }}",
            "device_class":  "{{ state_attr(trigger.entity_id, 'device_class') or '' }}"
          }
        }
```

For automation events (e.g. a scene firing), use a separate automation that sets `metadata.automation` instead of `metadata.entity_id`:

```yaml
alias: "Tempo — forward automation fires"
trigger:
  - platform: event
    event_type: automation_triggered
action:
  - service: rest_command.tempo_event
    data:
      payload: >-
        {
          "title": "Automation: {{ trigger.event.data.name }}",
          "providerIdentifier": "com.home-assistant",
          "eventType": "alert",
          "metadata": {
            "automation": "{{ trigger.event.data.name }}"
          }
        }
```

## How the score classifies events

The bundled score's 13 severity rules run in order (first match wins). The columns below show which keys are matched, the badge severity assigned, and the title/subtitle the rule interpolates from your metadata.

| Match                                                | Severity   | Title template                                  |
|------------------------------------------------------|------------|-------------------------------------------------|
| `entity_id: binary_sensor.*_smoke*` + `state: on`    | `critical` | `Smoke detected in ${metadata.area}`            |
| `entity_id: binary_sensor.*_smoke*` + `state: off`   | `ok`       | `Smoke cleared in ${metadata.area}`             |
| `entity_id: binary_sensor.*_leak*`  + `state: on`    | `critical` | `Water leak in ${metadata.area}`                |
| `entity_id: binary_sensor.*_leak*`  + `state: off`   | `ok`       | `Leak cleared in ${metadata.area}`              |
| `entity_id: binary_sensor.*_water*` + `state: on`    | `critical` | `Water detected in ${metadata.area}`            |
| `entity_id: binary_sensor.*_door*`  + `state: on`    | `info`     | `${metadata.friendly_name} opened`              |
| `entity_id: binary_sensor.*_door*`  + `state: off`   | `info`     | `${metadata.friendly_name} closed`              |
| `entity_id: binary_sensor.*_window*` + `state: on`   | `info`     | `${metadata.friendly_name} opened`              |
| `entity_id: binary_sensor.*_window*` + `state: off`  | `info`     | `${metadata.friendly_name} closed`              |
| `entity_id: binary_sensor.*_motion` + `state: on`    | `info`     | `Motion in ${metadata.area}`                    |
| `device_class: battery` + `state: on`                | `warning`  | `Low battery: ${metadata.friendly_name}`        |
| `entity_id: climate.*`                               | `info`     | `${metadata.friendly_name} → ${metadata.state}` |
| `automation: *`                                      | `info`     | `Automation: ${metadata.automation}`            |

### Match semantics

- **Multi-key** — all keys in a rule's `match` dict must match (AND). The smoke-detector rule above fires only for `binary_sensor.*_smoke*` entities **and** `state: "on"`. The complementary rule (state: `off`) renders a "cleared" event with `ok` severity — one sensor, two lines of timeline, both self-explanatory.
- **Globs** — `*` matches any run of characters, `?` matches a single character. So `binary_sensor.*_smoke*` matches `binary_sensor.kitchen_smoke`, `binary_sensor.garage_smoke_detector`, etc.
- **First match wins** — rules are evaluated top-to-bottom. Put specific rules above general ones. The bundled HA score ends with a catch-all `automation: "*"` rule so nothing falls through to the severity default.
- **Presentation templates** — `title` and `subtitle` are interpolated at render time. If the referenced key is missing from metadata, the raw template is shown — that's usually enough to spot the typo.

## Actions provided (5 total)

| Group        | Actions                                                        |
|--------------|----------------------------------------------------------------|
| **HA UI**    | Open dashboard · Open entity history · Open automations page   |
| **Clipboard**| Copy entity ID                                                 |
| **Docs**     | Home Assistant docs                                            |

## Customizing

- **Different HA URL** — edit the `openURL` in each action (default `http://homeassistant.local:8123`). If you use HTTPS with a custom domain, change that first.
- **More entity types** — add rules to the score via the in-app **Score editor** (Timeline tab). Click **+ Add rule**, add your match conditions, pick a severity, and optionally write a title template. The Try panel on the right lets you drop a recent event against the rule and preview the badge + resolved title before saving.
- **Hide noisy entities** — either drop them from the automation's `entity_id` list (don't send at all), or write a rule that matches them and tag it with `severity: info` + no title override so they're visible but quiet.

## Verifying

Trigger any of the entities you listed in the automation. Tempo's live feed should show a new alert within a second.

If not, see **Troubleshooting** below.

---

## Troubleshooting

If events don't land in Tempo, run these five checks in order.

**1. Is Tempo reachable from Home Assistant?** — SSH to the HA host (or use the SSH add-on terminal) and run:

```sh
curl -v http://your-mac.local:7776/health
```

A `200 OK` means reachability is fine. A timeout or "No route to host" is a network problem (firewall on the Mac, WiFi isolation, HA running in a VLAN that can't reach the Mac).

**2. Does the token work and does Tempo accept your payload shape?** — from the same HA host, send a synthetic event that mimics the automation's payload:

```sh
curl -X POST http://your-mac.local:7776/events \
  -H 'Content-Type: application/json' \
  -H 'X-Tempo-Token: YOUR_TOKEN_HERE' \
  -d '{"title":"smoke probe","providerIdentifier":"com.home-assistant","eventType":"alert","metadata":{"entity_id":"binary_sensor.kitchen_smoke","state":"on","friendly_name":"Kitchen smoke detector","area":"Kitchen","device_class":"smoke"}}'
```

A `200` or `202` with "Smoke detected in Kitchen" appearing in Tempo's feed means ingestion + the score's presentation rule both work. A `401` means the token is wrong or not bound to `com.home-assistant`; a `422` means the JSON is malformed.

**3. Are the packets reaching the Mac?** — open Terminal on the Mac and watch inbound traffic:

```sh
sudo tcpdump -i any -A 'tcp port 7776 and src host your-ha-host.local'
```

Trigger a state change in HA. You should see the JSON body in the output. If nothing appears, HA's `rest_command` is failing before the request leaves — check HA logs (**Settings → System → Logs**) for errors on `rest_command.tempo_event`.

**4. What is Tempo doing right now?** — stream Tempo's live logs:

```sh
log stream --predicate 'subsystem == "app.tempoapp.Tempo"' --level debug
```

Useful to watch the score's rule evaluation in real time.

**5. What did Tempo see historically?** — grep the rolling file log:

```sh
grep -h com.home-assistant ~/Library/Application\ Support/Tempo/Logs/tempo-*.log | tail -50
```

Every HA event Tempo has touched appears with timestamp and outcome. This is what `Settings → Help → Export diagnostics bundle` packages up.

---

## References

- [Home Assistant `rest_command` integration](https://www.home-assistant.io/integrations/rest_command/)
- [Home Assistant automation triggers](https://www.home-assistant.io/docs/automation/trigger/)
- [Jinja templating in HA](https://www.home-assistant.io/docs/configuration/templating/)
