---
title: "Proxmox Backup Server"
description: "PBS notifications in your Tempo timeline. Jump into the dashboard, datastores, running tasks, or tail the task log over SSH — one click from each event."
providerIdentifier: "com.proxmox.backup"
color: "#E57000"
version: "1.0.0"
file: "/scores/proxmox-backup.tempo-score"
compatibility:
  - "PBS 3.2+"
  - "PBS 3.3"
pubDate: 2026-04-23
downloadable: false
---

Proxmox Backup Server 3.2 added **webhook notification targets** as a first-class transport. This score gives Tempo a place to receive those notifications and attaches 10 one-click actions on each event — open the PBS UI, jump into datastores or the task list, SSH to the server, tail the task log remotely, copy details for an incident ticket.

No adapter on the Tempo side is required. You configure PBS to POST to Tempo, and Tempo does the rest.

---

## Install

1. Download `proxmox-backup.tempo-score` from the button above.
2. Double-click it. Tempo opens a review sheet — click **Install**. The score is saved to `~/Library/Application Support/Tempo/Scores/proxmox-backup.tempo-score`.
3. In Tempo **Settings → Ingestion**, add a token named `pbs` bound to `com.proxmox.backup`. Copy the token — you'll paste it into PBS in step 5.
4. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/events` (or `127.0.0.1` if Tempo is loopback-only).
5. Configure PBS (see below).

## PBS side — configure the webhook target

**Datacenter → Notifications → Add → Webhook**

| Field        | Value                                   |
|--------------|-----------------------------------------|
| Name         | `tempo`                                 |
| URL          | `http://your-mac.local:7776/events`     |
| Method       | `POST`                                  |
| Disable      | (leave unchecked)                       |

In **Headers**:

| Key              | Value                       |
|------------------|-----------------------------|
| `Content-Type`   | `application/json`          |
| `X-Tempo-Token`  | `<paste token from Tempo>`  |

In **Body**, paste this template. The one line marked with `// CHANGE ME` is the only value you adjust for your setup.

```handlebars
{
  "title": "{{ title }}",
  "providerIdentifier": "com.proxmox.backup",
  "eventType": "alert",
  "metadata": {
    "hostname": "pbs.home.arpa",
    "severity": "{{ severity }}",
    "title": "{{ escape title }}",
    "message": "{{ escape message }}"
  }
}
```

- `hostname` — the hostname or IP of your PBS server. Used by every "Open PBS" / "SSH" / "Ping" / "Tail task log" action. PBS does not reliably inject its own hostname into the webhook body, so hardcoding it once here is the cleanest approach.

Save the target. Then go to **Datacenter → Notifications → Matchers** and either add the new `tempo` target to the default matcher, or create a dedicated matcher that forwards all PBS events to `tempo`.

## What PBS actually sends

PBS' webhook template language is Handlebars. The variables this score relies on are:

- `{{ title }}` — short notification title (*"Backup Job: vzdump backup succeeded"*, *"Verification failed"*, etc.)
- `{{ message }}` — the full notification body, already formatted for humans
- `{{ severity }}` — one of `info`, `notice`, `warning`, `error`. Tempo maps these to its own severity levels via the score's `severityRules`.
- `{{ escape … }}` — JSON-escapes quotes and newlines inside a string field. Always wrap `title` and `message` with it; otherwise a backup log line containing a quote will break the JSON body.

Event categories in PBS that fire notifications by default include: **backup success/failure**, **verification**, **garbage collection**, **sync jobs**, **prune jobs**, **tape operations**, and **package updates**. Disable the ones you don't want to see in Tempo from the PBS notification matcher, not from the score.

## Actions provided (10 total)

| Group           | Actions                                                                       |
|-----------------|-------------------------------------------------------------------------------|
| **PBS UI**      | Open PBS dashboard · Open datastore view · Open running tasks                 |
| **Shell**       | SSH to PBS · Ping PBS · Tail PBS task log (SSH)                               |
| **Clipboard**   | Copy hostname · Copy message                                                  |
| **Docs**        | PBS docs · Proxmox wiki                                                       |

## Customizing

- **Non-default PBS port**: if you've fronted PBS with a reverse proxy on 443, edit the `openURL` in each "Open PBS ..." action.
- **Non-root SSH user**: replace `root@` with `youruser@` in the SSH and "Tail task log" actions. PBS typically runs as root, but if you've set up a named operator account use that instead.
- **Multiple PBS servers**: create one webhook target per server in PBS, each with its own `hostname` in the body template. All events land in the same Tempo score — the per-event hostname drives the actions.
- **Cluster / remote sync**: the `hostname` you hardcode is the PBS that generated the notification. For events originating from a sync job pulling from a second PBS, you will see the receiving node's hostname, not the source. That is correct — the actions should target the node you would SSH into to investigate.

## Verifying

After step 5, trigger a test notification:
**Datacenter → Notifications → [tempo row] → Test** (if available in your PBS version) or manually run a small backup job and wait for its completion notification.

Tempo's live feed should show a new alert within a second or two. If not, run the troubleshooting checks below.

---

## Troubleshooting

If the test notification doesn't land in Tempo's feed, run these five checks in order. Each narrows the problem to a specific layer (reachability, token, payload, process, history).

**1. Is Tempo reachable from PBS?** — SSH to PBS and run:

```sh
curl -v http://your-mac.local:7776/health
```

A `200 OK` means reachability is fine. A timeout or "No route to host" is a network problem (firewall on the Mac, VLAN routing, Proxmox host firewall) — nothing after this point will work until it's fixed.

**2. Does the token work and does Tempo accept your payload shape?** — still on PBS, send a synthetic event that mimics the webhook body template exactly:

```sh
curl -X POST http://your-mac.local:7776/events \
  -H 'Content-Type: application/json' \
  -H 'X-Tempo-Token: YOUR_TOKEN_HERE' \
  -d '{"title":"pbs probe","providerIdentifier":"com.proxmox.backup","eventType":"alert","metadata":{"hostname":"pbs.home.arpa","severity":"info","title":"pbs probe","message":"manual troubleshooting"}}'
```

A `200` or `202` with "pbs probe" appearing in Tempo's feed means ingestion works end-to-end. A `401` means the token is wrong or not bound to `com.proxmox.backup`; a `422` means the JSON is malformed — usually because `{{ escape }}` was omitted and the real message contained a quote.

**3. Are the packets actually reaching the Mac?** — open Terminal on the Mac and watch inbound traffic:

```sh
sudo tcpdump -i any -A 'tcp port 7776 and src host pbs.home.arpa'
```

Then trigger a PBS notification. You should see HTTP POST traffic with the JSON body visible. If nothing appears, PBS is failing to reach the Mac even though step 1 succeeded — usually because PBS' webhook URL is typo'd or the Proxmox host firewall is dropping outbound.

**4. What is Tempo doing right now?** — stream Tempo's live logs:

```sh
log stream --predicate 'subsystem == "app.tempoapp.Tempo"' --level debug
```

Useful to watch the ingestion decision in real time: token lookup, validation, DB write.

**5. What did Tempo see historically?** — grep the rolling file log:

```sh
grep -h com.proxmox.backup ~/Library/Application\ Support/Tempo/Logs/tempo-*.log | tail -50
```

Every PBS event Tempo has touched appears here with timestamp and outcome. This is also what `Settings → Help → Export diagnostics bundle` packages up — if you're asking for support, run step 5 first and attach the output.

---

## References

- [PBS notification targets — official docs](https://pbs.proxmox.com/docs/notifications.html)
- [PBS webhook template reference](https://pbs.proxmox.com/docs/notifications.html#notification-targets-webhook)
- [Proxmox community forum](https://forum.proxmox.com/)
