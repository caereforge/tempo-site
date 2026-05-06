---
title: "Proxmox VE"
description: "Proxmox Virtual Environment cluster events in Tempo's timeline. Open the datacenter UI, jump to a specific node or VM, copy IDs for an incident ticket — one click per event."
providerIdentifier: "com.proxmox"
color: "#E57000"
version: "1.0.0"
file: "/scores/proxmox.tempo-score"
compatibility:
  - "Proxmox VE 8.1+"
pubDate: 2026-05-06
downloadable: true
---

Surface Proxmox VE cluster events — backup completions, replication runs, certificate alerts, manual notifications — in Tempo's timeline with five default actions (Open Proxmox UI, Open Datacenter view, copy server URL, copy node name, copy VMID).

Tested with **Proxmox VE 8.1+**, which ships a native webhook notification target — no polling script, no adapter on the Tempo side. Each notification fires a single HTTP POST to Tempo.

> Looking for **Proxmox Backup Server**? That's a separate product with its own notification system — see the [PBS score](/scores/proxmox-backup) instead. The two scores are independent and can be installed side by side.

---

## Install

1. Download `proxmox.tempo-score` from the button above.
2. Double-click it. Tempo opens a review sheet — click **Install**. The score lands in `~/Library/Application Support/Tempo/Scores/proxmox.tempo-score`.
3. In Tempo **Settings → Ingestion**, add a token named `proxmox` bound to `com.proxmox`. Copy the token — you'll paste it into Proxmox in step 5.
4. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest` (or `127.0.0.1` if Tempo is loopback-only).
5. Configure Proxmox (see below).

## Proxmox side — configure the webhook target

**Datacenter → Notifications → Add → Webhook**

| Field          | Value                                   |
|----------------|-----------------------------------------|
| Endpoint Name  | `tempo`                                 |
| URL            | `http://your-mac.local:7776/ingest`     |
| Method         | `POST`                                  |
| Disable        | (leave unchecked)                       |

In **Headers**:

| Key              | Value                       |
|------------------|-----------------------------|
| `Content-Type`   | `application/json`          |
| `X-Tempo-Token`  | `<paste token from Tempo>`  |

In **Body** paste this template verbatim. Proxmox renders it with the [Tera template language](https://keats.github.io/tera/docs/) — every `{{ … }}` gets substituted at notification time.

```text
{
  "providerIdentifier": "com.proxmox",
  "title": {{ title|json }},
  "startDate": {{ timestamp|date(format="%Y-%m-%dT%H:%M:%SZ", timezone="UTC")|json }},
  "eventType": "alert",
  "metadata": {
    "severity":  {{ severity|json }},
    "ServerUrl": "https://your-proxmox.lan:8006",
    "NodeName":  {{ fields.hostname|default(value="")|json }},
    "VMID":      {{ fields.vmid|default(value="")|json }},
    "TaskType":  {{ fields.type|default(value="")|json }},
    "Message":   {{ message|json }}
  }
}
```

> **Replace `https://your-proxmox.lan:8006`** with your cluster's actual UI URL — the score uses it for the "Open Proxmox UI" / "Open Datacenter" actions. Tera doesn't have introspection on the receiving server's identity, so it has to be hardcoded once per cluster.

Save the endpoint. Then **Datacenter → Notifications → Notification Matchers**: either add the new `tempo` endpoint to the default matcher, or build a dedicated matcher that forwards the events you care about (backup, replication, certificate, alerts) to `tempo`.

## Verify

Trigger any notification — easiest path is to run a manual `vzdump` backup on a small VM, or trigger the test action from **Datacenter → Notifications → tempo → Test** if your PVE version exposes it.

Within a couple of seconds the event should appear in Tempo's timeline, painted Proxmox orange, with the five default actions in the right panel. Click **Open Proxmox UI** to confirm the URL builds correctly.

## Stack collapsing (grouping)

Repeated events about the same node or VM collapse into a single stack on the timeline rather than a wall of identical rows. The score groups by `NodeName/VMID` first (so all backup/restart/replication events for VM 100 on `pve-01` collapse together) and falls back to `NodeName` for cluster-wide notifications. The window is one day — after that, a new stack starts.

If you want every event as its own row instead, remove the `grouping` lines from the score after install.

## Severity rules

| Match              | Severity   | Badge    |
| ------------------ | ---------- | -------- |
| `severity:critical`| `critical` | Critical |
| `severity:error`   | `error`    | Error    |
| `severity:warning` | `warning`  | Warning  |
| `severity:notice`  | `info`     | Notice   |
| `severity:info`    | `info`     | Info     |
| _(default)_        | `info`     | Info     |

Proxmox uses five levels (`info` / `notice` / `warning` / `error` / `critical`). The score collapses `notice` to `info` because Tempo's visual model has only four severity bands and `notice` is closer to informational than warning in Proxmox's own taxonomy.

## Required `metadata` fields

- **`severity`** — drives the badge. Set automatically by Proxmox via the template above.
- **`ServerUrl`** — base URL of the Proxmox web UI (e.g. `https://node.lan:8006`). Hardcoded in the template; used by the "Open Proxmox UI" and "Open Datacenter" actions.
- **`NodeName`** — Proxmox node hostname. Auto-populated from `fields.hostname` when present; used by "Copy node name" and grouping.
- **`VMID`** — VM/container ID when the notification is about a specific guest. Auto-populated from `fields.vmid`; used by "Copy VMID" and grouping. Empty for cluster-wide events (replication, certificate, etc.) — the grouping then falls back to `NodeName` alone.
- **`TaskType`** / **`Message`** — informational, surfaced in the action panel "Details" section but no action depends on them.

## Sample event payload

A complete payload as Proxmox would render it for a backup completion:

```json
{
  "providerIdentifier": "com.proxmox",
  "title": "Backup completed for VM 100",
  "startDate": "2026-04-29T03:14:00Z",
  "eventType": "alert",
  "metadata": {
    "severity":  "info",
    "ServerUrl": "https://pve-01.lan:8006",
    "NodeName":  "pve-01",
    "VMID":      "100",
    "TaskType":  "vzdump",
    "Message":   "Backup of VM 100 (web-srv) finished successfully (43.2 GB, 4m 17s)"
  }
}
```

---

## Troubleshooting

If notifications don't land in Tempo's feed, run these checks in order. Each narrows the problem to a specific layer.

**1. Is Tempo reachable from Proxmox?** — SSH to a Proxmox node and run:

```sh
curl -v http://your-mac.local:7776/health
```

A `200 OK` means reachability is fine. A timeout or "No route to host" is a network problem (firewall on the Mac, VLAN routing, Proxmox host firewall) — nothing after this point will work until that's fixed.

**2. Does the token work and does Tempo accept the payload shape?** — still on Proxmox, send a synthetic event mimicking the template above:

```sh
curl -X POST http://your-mac.local:7776/ingest \
  -H 'Content-Type: application/json' \
  -H 'X-Tempo-Token: YOUR_TOKEN_HERE' \
  -d '{"providerIdentifier":"com.proxmox","title":"manual probe","startDate":"2026-04-29T10:00:00Z","eventType":"alert","metadata":{"severity":"warning","ServerUrl":"https://pve-01.lan:8006","NodeName":"pve-01","VMID":"100","Message":"manual troubleshooting"}}'
```

A `200`/`202` with "manual probe" appearing in Tempo's feed means ingestion works end-to-end. A `401` means the token is wrong or not bound to `com.proxmox`. A `422` means the JSON is malformed — usually because a Tera filter was forgotten and a quote in the message broke the body.

**3. Test the Proxmox webhook target directly.** From the PVE web UI:

**Datacenter → Notifications → tempo → Test**

Or via CLI on a Proxmox host:

```sh
ssh root@your-proxmox.lan "pvesh create /cluster/notifications/endpoints/webhook/tempo/test"
```

**4. What is Tempo doing right now?** — stream Tempo's live logs on the Mac:

```sh
log stream --predicate 'subsystem == "app.tempoapp.Tempo"' --level debug | grep -i proxmox
```

Useful to watch token lookup, validation, and DB write decisions in real time.

**5. Inspect the rendered template.** When fields aren't appearing in Tempo as expected, the rendered body on the Proxmox side is the source of truth:

```sh
ssh root@your-proxmox.lan "journalctl -u pve-cluster -n 200 | grep -i webhook"
```

---

## Customizing

- **Multi-cluster** — each cluster needs its own webhook target with its own `ServerUrl` hardcoded in the template. All clusters land under the same `Proxmox` source in Tempo; you tell them apart by `NodeName`. Grouping is per-cluster effectively, since `NodeName` is unique per node.
- **VE 8.0 and earlier** — no native webhook target. Either upgrade (8.1 is stable and webhooks are mature), or use the Gotify/Sendmail notification types wrapped by a custom forwarder script.
- **Cert validation** — if your Proxmox UI uses a self-signed cert, the action's `https://` URL works in your browser as long as you've accepted the cert there. Tempo doesn't reach Proxmox itself — only your browser does, when you click an action.
- **Stop/start VMs, snapshot, etc.** — the catalog score uses only `openURL` and `copyToClipboard`. Mutating actions (start/stop/snapshot/backup remotely) require a local drop-in score with `openTerminalWith` actions plus your trusted SSH/API approach. Catalog scores stay observation-only by policy.

## References

- [Proxmox VE notification system — official docs](https://pve.proxmox.com/wiki/Notifications)
- [Webhook notification target — wiki](https://pve.proxmox.com/wiki/Notifications#_webhook)
- [Tera template language reference](https://keats.github.io/tera/docs/)
- [Proxmox community forum](https://forum.proxmox.com/)
