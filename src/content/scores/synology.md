---
title: "Synology"
description: "DSM notifications in your Tempo timeline, with one-click actions to jump into Storage Manager, Log Center, Security Advisor, and SSH."
providerIdentifier: "com.synology"
color: "#0070D1"
version: "1.0.0"
file: "/scores/synology.tempo-score"
compatibility:
  - "DSM 7.0+"
  - "DSM 7.1"
  - "DSM 7.2"
pubDate: 2026-04-23
downloadable: false
---

Synology DSM 7 and later support **Custom Webhook** as a notification transport out of the box. This score gives Tempo a place to receive those notifications and attach 10 one-click actions on each event — open DSM, jump straight into Storage Manager or Log Center, SSH to the NAS, ping it, copy details for an incident ticket.

No adapter on the Tempo side is required. You just configure DSM to POST to Tempo.

---

## Install

1. Download `synology.tempo-score` from the button above.
2. Double-click it. Tempo opens a review sheet — click **Install**. The score is saved to `~/Library/Application Support/Tempo/Scores/synology.tempo-score`.
3. In Tempo **Settings → Ingestion**, add a token named `synology` bound to `com.synology`. Copy the token — you'll paste it into DSM in step 5.
4. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/events` (or `127.0.0.1` if Tempo is loopback-only).
5. Configure DSM (see below).

## DSM side — configure the webhook

**Control Panel → Notification → Push Service → Webhooks → Add → Custom**

| Field             | Value                                             |
|-------------------|---------------------------------------------------|
| Provider Name     | `Tempo`                                           |
| Subject Prefix    | (leave blank, Tempo will use `@@PREFIX@@` itself) |
| Subject           | `Synology notification`                           |
| URL               | `http://your-mac.local:7776/events`               |
| HTTP Method       | `POST`                                            |

In **HTTP Headers**:

| Key              | Value                                 |
|------------------|---------------------------------------|
| `Content-Type`   | `application/json`                    |
| `X-Tempo-Token`  | `<paste token from Tempo>`            |

In **HTTP Body**, paste this template. The three lines marked with `// CHANGE ME` are the values you adjust for your setup — nothing else needs to change.

```json
{
  "title": "@@PREFIX@@",
  "providerIdentifier": "com.synology",
  "eventType": "alert",
  "metadata": {
    "hostname": "nas.home.arpa",
    "subject": "@@PREFIX@@",
    "message": "@@TEXT@@"
  }
}
```

- `hostname` — the hostname or IP of your NAS. Used by every "Open DSM" / "SSH" / "Ping" action. The DSM webhook UI does **not** reliably substitute `%HOSTNAME%` in JSON body content, so the cleanest approach is to hardcode your NAS hostname here — one-time edit per NAS.

In **Events to notify**, enable the categories you want Tempo to receive (we recommend: System, Storage, Security, Backup). Save.

## What DSM actually sends

Unlike Proxmox, DSM's custom webhook has only three usable placeholders:

- `@@TEXT@@` — the rendered notification body (a human-readable string, already localized to your DSM language)
- `@@PREFIX@@` — the prefix you configured
- `%HOSTNAME%` — substituted in *some* fields (not reliably in JSON body)

This means Tempo receives a short summary string like *"Drive 3 on DS920+ has been disabled"* rather than a structured payload. The score is designed around this reality: actions use `${metadata.hostname}` (which you provided in the template above) and `${metadata.message}` (the `@@TEXT@@` blob). Severity is not parsed from the message body — all Synology events default to `alert` severity in Tempo.

If you want finer-grained severity per event type, you can duplicate the webhook in DSM, point each copy at a different matcher, and hardcode different `title`/`eventType` fields in each body template.

## Actions provided (10 total)

| Group          | Actions                                                                      |
|----------------|------------------------------------------------------------------------------|
| **DSM UI**     | Open DSM · Open Storage Manager · Open Log Center · Open Security Advisor    |
| **Shell**      | SSH to NAS · Ping NAS                                                        |
| **Clipboard**  | Copy hostname · Copy message                                                 |
| **Docs**       | DSM notifications docs · Synology Knowledge Center                           |

## Customizing

- **Non-default DSM port**: if you've changed DSM's HTTPS port from 5001, edit the `openURL` in each "Open ..." action.
- **Non-admin SSH user**: replace `admin@` with `youruser@` in the SSH action, or parametrize it with a custom metadata field.
- **Multiple NAS**: create one webhook per NAS in DSM, each with its own `hostname` in the body template. All events land in the same Tempo score — the per-event hostname drives the actions.
- **Cluster / Synology Hybrid Share**: point `hostname` at your primary NAS. Use a secondary webhook for the secondary node with its own hostname.

## Verifying

After step 5, trigger a test notification:
**Control Panel → Notification → Push Service → Webhooks → [Tempo row] → Send Test Message**

Tempo's live feed should show a new alert within a second or two. If not:

- **Settings → Help → Export diagnostics bundle** → inspect `logs.txt` for `Ingestion` entries. A 401 means the `X-Tempo-Token` header is wrong; a 422 means the body template is malformed JSON (DSM's UI doesn't validate JSON for you).
- Confirm the Mac running Tempo is reachable from the NAS on port 7776: `curl http://your-mac.local:7776/health` from an SSH session on the NAS.

---

## Troubleshooting

If the test notification doesn't land in Tempo's feed, run these five checks in order. Each narrows the problem to a specific layer (reachability, token, payload, process, history).

**1. Is Tempo reachable from the NAS?** — SSH to the NAS and run:

```sh
curl -v http://your-mac.local:7776/health
```

A `200 OK` means reachability is fine. A timeout or "No route to host" is a network problem (firewall on the Mac, WiFi isolation, VPN routing) — nothing after this point will work until it's fixed.

**2. Does the token work and does Tempo accept your payload shape?** — still on the NAS, send a synthetic event that mimics the DSM body template exactly:

```sh
curl -X POST http://your-mac.local:7776/events \
  -H 'Content-Type: application/json' \
  -H 'X-Tempo-Token: YOUR_TOKEN_HERE' \
  -d '{"title":"synology probe","providerIdentifier":"com.synology","eventType":"alert","metadata":{"hostname":"nas.home.arpa","subject":"probe","message":"manual troubleshooting"}}'
```

A `200` or `202` with "synology probe" appearing in Tempo's feed means ingestion works end-to-end. A `401` means the token is wrong or not bound to `com.synology`; a `422` means the JSON is malformed (the real DSM webhook has the same bug, same fix).

**3. Are the packets actually reaching the Mac?** — open Terminal on the Mac and watch inbound traffic:

```sh
sudo tcpdump -i any -A 'tcp port 7776 and src host your-nas.home.arpa'
```

Then send a test message from DSM. You should see HTTP POST traffic with the JSON body visible. If nothing appears, DSM is failing to reach the Mac even though step 1 succeeded — usually because DSM's webhook URL is typo'd or uses the wrong hostname.

**4. What is Tempo doing right now?** — stream Tempo's live logs:

```sh
log stream --predicate 'subsystem == "app.tempoapp.Tempo"' --level debug
```

Useful to watch the ingestion decision in real time: token lookup, validation, DB write.

**5. What did Tempo see historically?** — grep the rolling file log:

```sh
grep -h com.synology ~/Library/Application\ Support/Tempo/Logs/tempo-*.log | tail -50
```

Every Synology event Tempo has touched appears here with timestamp and outcome. This is also what `Settings → Help → Export diagnostics bundle` packages up — if you're asking for support, run step 5 first and attach the output.

---

## References

- [DSM Webhooks — Synology Knowledge Center](https://kb.synology.com/en-global/DSM/help/DSM/AdminCenter/system_notification_webhook)
- [DSM Notification overview](https://kb.synology.com/en-global/DSM/tutorial/How_to_receive_Synology_DSM_notifications)
