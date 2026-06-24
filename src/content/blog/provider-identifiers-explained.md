---
title: "What to type when Tempo asks for a provider"
description: "The New Token sheet asks for a provider identifier. What it is, what to type for the bundled sources, and what to type for your own scripts."
pubDate: 2026-05-16
tags: ["how-to"]
draft: false
---

*📅 May 16, 2026 · Tempo 1.0.3 · Leo from Caereforge*

Open Settings → Ingestion → New Token in Tempo and you'll see two fields: a name for the token, and a **Provider** field. The token name is free text, so call it whatever helps you recognize it later. The Provider field is not free text in the same sense. It expects a specific string, and if you guess wrong the events from that sender will be rejected with a `403`.

This post is the reference for what to type there: the bundled sources, the conventions for your own senders, and the Scripts umbrella that catches everything in between.

## The mental model

The New Token sheet asks for two things, and they play very different roles:

- **Token name**: free text, just for you. Pick whatever helps you find this token later in the list: `kopia-laptop`, `homeassistant-rpi`, `nas-webhooks`, `playground`. Tempo doesn't read this string anywhere except to display it back to you in Settings. You can rename it any time without breaking the sender on the other end.
- **Provider identifier**: the canonical string from the tables below. This is the machine-readable identity of whoever is going to POST to Tempo with this token. Tempo reads it on every incoming request and uses it to decide which token authorizes which source.

So a typical Kopia token might be named `kopia-laptop` and bound to provider `com.kopia`. The name is your label; the provider is the contract.

The provider identifier is load-bearing in two places:

1. **Token binding.** A token bound to `com.kopia` only authorizes events whose `providerIdentifier` starts with `com.kopia`. If the payload declares `com.example`, Tempo rejects it (`403 Forbidden`).
2. **Score resolution.** Tempo finds the score for an event by matching its provider identifier against `<providerIdentifier>.json` in the scores directory (with prefix walking, more on this in a moment).

The friendly name that ends up in the source panel comes from the score's `displayName` field, not the provider identifier. So you don't have to optimize the ID for human readability: it can be ugly as long as it's correct.

## Umbrella sources: one parent, many children

Some sources don't show up as a single row in the source panel. They show up as a **parent row** with sub-source children nested under it. Four umbrellas ship out of the box:

| Umbrella (panel parent) | Children (what the senders use) |
|---|---|
| **Apple** | `com.apple.calendar`, `com.apple.reminders` |
| **UniFi** | `com.ubiquiti.unifi.network`, `com.ubiquiti.unifi.protect` |
| **Hazel** | `com.noodlesoft.hazel.mail`, `com.noodlesoft.hazel.keepa` |
| **Scripts** | `scripts.bash.<name>`, `scripts.python.<name>`, `scripts.php.<name>`, … |

The grouping is implicit in the provider identifier. Any two IDs that share a dot-separated prefix nest under the same parent. `com.ubiquiti.unifi.network` and `com.ubiquiti.unifi.protect` share `com.ubiquiti.unifi`, so they sit as siblings under one **UniFi** row in the panel. `scripts.bash.check_disk` and `scripts.python.sensor_poll` share `scripts`, so they sit under one **Scripts** row.

This matters when you create the token, because token authorization is also prefix-based. A token bound to `com.ubiquiti.unifi` accepts both Network and Protect payloads (the parent covers all children). A token bound to `com.ubiquiti.unifi.network` only accepts Network. Two patterns work:

- **One token per leaf**: recommended for most sources. Bind a token to `com.ubiquiti.unifi.network` for the UniFi controller, a separate token to `com.ubiquiti.unifi.protect` for the Protect controller. If one token leaks, only one source can be forged with it.
- **One token at the parent**: recommended for **Scripts**, where you'll have dozens of sub-senders (`scripts.bash.x`, `scripts.python.y`, …) and creating a token per leaf would be tedious. Bind one token to `scripts` and every `scripts.*` sender uses it.

The decision is yours. Both work; the trade-off is convenience vs blast radius if the token escapes.

## The bundled sources

Tempo ships with twenty bundled scores out of the box and growing. If you're connecting one of these common sources, this is the exact string to put in the Provider field:

| Source | Provider identifier |
|---|---|
| UniFi Network | `com.ubiquiti.unifi.network` |
| UniFi Protect | `com.ubiquiti.unifi.protect` |
| Kopia | `com.kopia` |
| Uptime Kuma | `com.uptime-kuma` |
| Home Assistant | `com.home-assistant` |
| GitHub Actions | `com.github.actions` |
| Synology | `com.synology` |
| Hazel (Mail rules) | `com.noodlesoft.hazel.mail` |
| Hazel (Keepa rules) | `com.noodlesoft.hazel.keepa` |

The vendor matters. UniFi is sold by Ubiquiti, so the ID is `com.ubiquiti.unifi.network`, not `com.unifi.network` (which would say "UniFi makes a product called Network"). Hazel is made by Noodlesoft, so it's `com.noodlesoft.hazel.*`. The reverse-DNS namespace points at the **company that ships the tool**, then the tool, then the module.

## Downloadable scores from the catalog

Beyond the bundled set, the [score catalog at tempoapp.app/scores](/scores/) hosts a growing list of `.tempo-score` files you can download and double-click to install. Once installed they behave exactly like bundled scores: you still need a token in Settings → Ingestion bound to the provider identifier below, and your sender POSTs the same way:

| Source | Provider identifier |
|---|---|
| Proxmox VE | `com.proxmox` |
| Proxmox Backup Server | `com.proxmox.backup` |
| Pi-hole | `net.pi-hole.pi-hole` |
| Jellyfin | `org.jellyfin` |
| Vaultwarden | `com.vaultwarden` |
| Hazel (umbrella, other rule types) | `com.noodlesoft.hazel` |

Each catalog page documents the exact webhook URL, the headers the sender needs to set, and the metadata fields the score reads. The provider identifier in the token sheet matches the one in the table above: copy-paste, not retype, to avoid the trailing-space class of bugs.

## Sources that don't need a token

One source skips the HTTP ingestion server entirely, so there's no token to create for it: **Apple Calendar and Reminders**. Tempo reads it directly via EventKit on first launch, after you grant permission. The provider identifiers exist (`com.apple.calendar`, `com.apple.reminders`) but you don't type them anywhere; they're internal.

The principle generalises: if your source isn't push-based (a sender that POSTs to Tempo) but pull-based (Tempo fetches from somewhere), the token concept doesn't apply.

## Beta: Fastmail CalDAV

Tempo 1.0.3 ships a **CalDAV engine** for pulling calendar events directly from a CalDAV server, no webhook involved. The engine is in beta and currently scoped to **Fastmail only**; other CalDAV providers (iCloud, Google Calendar, Nextcloud, generic CalDAV servers) are not supported yet. Promotion to a first-class source with a proper Settings UI is planned for a later release.

CalDAV is neither bundled into the app nor downloadable from the public score catalog. **There is no in-app configuration screen in V1**: wiring it up requires editing a JSON file by hand and storing your Fastmail app-specific password in the macOS Keychain via Terminal. It's not difficult, but it's not the one-click flow other sources have. Set aside about five minutes.

The two artifacts you'll touch:

- **A score file**: `com.caldav.fastmail.tempo-score`, hosted at <https://tempoapp.app/scores/beta/com.caldav.fastmail.tempo-score>. This styles incoming Fastmail events in the timeline (color, default severity, three action buttons).
- **An engine config file**: `external-providers.json` at `~/Library/Application Support/Tempo/`, which you create yourself. This is what the CalDAV engine reads at launch to know which server to pull from and how to authenticate.

Provider identifier: `com.caldav.fastmail`. You won't type it in the New Token sheet (CalDAV is pull-based, no token needed); the engine populates the timeline from the server and the score styles what shows up.

The full step-by-step walkthrough (generating the Fastmail app-password, the `security add-generic-password` Keychain command, the JSON shape with worked examples, the duplicates-with-Internet-Accounts caveat) lives at [github.com/caereforge/tempo-scores/tree/main/beta](https://github.com/caereforge/tempo-scores/tree/main/beta). The raw `.json` source for the score is in the same directory if you want to inspect it before installing.

If you want CalDAV for a non-Fastmail provider, the honest answer is "not yet": feedback in [Discord](https://discord.gg/QnaCNKd9CN) helps prioritize which server lands next.

## Your own senders: the Scripts umbrella

Most homelab Tempo installs grow a tail of small senders: a cron job that watches disk space, a Python script that scrapes a sensor, a shell one-liner triggered by `launchd`, a webhook from a tool that doesn't have a dedicated score.

You could give each of these its own provider ID and write a score for it. But you usually don't want to: that's a lot of one-off scores for things that all behave the same way. The **Scripts** umbrella (introduced above) exists for exactly this case. Anything you POST under a `scripts.*` identifier lands under the **Scripts** parent row in the source panel, with severity inferred from `metadata.label` and a couple of generic action buttons already wired up.

The convention is:

```
scripts.<language>.<name>
```

You pick the language slug and the script name. So `scripts.bash.check_disk`, `scripts.php.log_scan`, `scripts.python.sensor_poll`. Tempo doesn't care what `<language>` says; it's purely for your own organization. Pick what helps you scan the list.

In Settings → Ingestion create **one token** bound to provider `scripts` (the parent). That single token authorizes every `scripts.*` sender via prefix matching, with no need to create a separate token for each script. Name it something like `scripts-all` or `homelab-scripts` so you recognize it later.

Here's what that looks like for each common language. The URL is the same in every case, `http://<your-mac>:7776/ingest` (replace `<your-mac>` with `localhost` if the sender runs on the same Mac as Tempo, or the Mac's LAN IP if it runs on another machine on the network).

### Bash

```bash
#!/usr/bin/env bash
TEMPO_TOKEN="your-token-here"
USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')

curl -s http://localhost:7776/ingest \
  -H "Content-Type: application/json" \
  -H "X-Tempo-Token: $TEMPO_TOKEN" \
  -d @- <<EOF
{
  "title": "Disk usage at ${USAGE}%",
  "providerIdentifier": "scripts.bash.check_disk",
  "metadata": { "label": $([ "$USAGE" -gt 80 ] && echo '"warning"' || echo '"ok"') }
}
EOF
```

### Python

```python
import requests, shutil

usage = shutil.disk_usage('/')
percent = round(usage.used / usage.total * 100)

requests.post(
    'http://localhost:7776/ingest',
    headers={'X-Tempo-Token': 'your-token-here'},
    json={
        'title': f'Disk usage at {percent}%',
        'providerIdentifier': 'scripts.python.check_disk',
        'metadata': {'label': 'warning' if percent > 80 else 'ok'},
    },
)
```

### Node.js

```javascript
const used = 87; // your computed value

await fetch('http://localhost:7776/ingest', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tempo-Token': 'your-token-here',
  },
  body: JSON.stringify({
    title: `Disk usage at ${used}%`,
    providerIdentifier: 'scripts.node.check_disk',
    metadata: { label: used > 80 ? 'warning' : 'ok' },
  }),
});
```

### PHP

```php
<?php
$used = 87;

$payload = json_encode([
    'title' => "Disk usage at {$used}%",
    'providerIdentifier' => 'scripts.php.check_disk',
    'metadata' => ['label' => $used > 80 ? 'warning' : 'ok'],
]);

$ch = curl_init('http://localhost:7776/ingest');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-Tempo-Token: your-token-here',
    ],
]);
curl_exec($ch);
curl_close($ch);
```

### AppleScript

AppleScript shells out to `curl`. The trick is escaping the JSON cleanly:

```applescript
set tempoToken to "your-token-here"
set payload to "{\"title\":\"Backup completed\",\"providerIdentifier\":\"scripts.applescript.backup_notify\",\"metadata\":{\"label\":\"ok\"}}"

do shell script "curl -s http://localhost:7776/ingest " & ¬
    "-H 'Content-Type: application/json' " & ¬
    "-H 'X-Tempo-Token: " & tempoToken & "' " & ¬
    "-d " & quoted form of payload
```

All five land in the same **Scripts** umbrella, grouped by the language slug you chose. The `metadata.label` value (`"warning"`, `"ok"`, `"error"`, `"critical"`) drives the severity badge: that's the convention the bundled Scripts score reads.

## Custom reverse-DNS for everything else

If your sender isn't a quick script and you want it to look like a built-in source, with its own color, display name, and action buttons, then write your own score for it. Pick a reverse-DNS identifier that points at the tool's actual vendor:

- `com.cloudflare.tunnel` for a Cloudflare Tunnel webhook
- `org.jellyfin` (the project ships under jellyfin.org, no commercial vendor)
- `net.pi-hole.pi-hole`
- `com.example.my-internal-tool` for something only you run

Two more namespaces are recognized by convention for local senders, in case you don't want to use `scripts.*`:

- **`local.<name>`**: sender runs on the same Mac as Tempo. `local.check_disk`, `local.backup_notify`.
- **`lab.<host>.<name>`**: sender runs on another LAN host. `lab.nas01.smart_check`, `lab.pi4.temp_monitor`.

These don't have a bundled umbrella the way `scripts.*` does. They're just naming conventions that keep your source panel readable as the list grows.

## Why the right ID matters

If the field accepts any string, why not type `unifi`? Because then the token binds to `unifi`, the payload also has to say `unifi`, and there is no `unifi.json` score on disk. So your event still lands (Tempo doesn't refuse events for missing scores), but it lands as a bare, unstyled card in the timeline, with the literal text `unifi` as the source name in the panel. No color, no severity rule, no action buttons. You've cut yourself off from the bundled score's work.

The same logic applies in reverse for the umbrella case. `com.ubiquiti.unifi` works as a token-binding parent, but if a payload itself declares `providerIdentifier: "com.ubiquiti.unifi"` (not `.network`, not `.protect`), Tempo will accept it and render a card under a generic UniFi parent row. That's useful occasionally, but you'd miss the per-sibling color and metadata wiring that the leaf scores provide. Senders should always declare the leaf ID; the parent ID is for token binding and panel grouping.

The right string costs you nothing and gives you everything the bundled score was written for. Copy-paste from the tables above, don't retype.

## Further reading

- **User Guide §10, Sources reference** documents each bundled source end-to-end, including the exact webhook URL and headers each one expects: [/docs/10-sources-reference/](/docs/10-sources-reference/)
- **User Guide §11, Score authoring** is the field-by-field spec for the score file format if you're writing your own: [/docs/11-score-authoring/](/docs/11-score-authoring/)
- **Discord** is the fastest path if your sender is still hitting `403` after reading this. Paste the curl command and the error and we'll figure it out together.

Leo from [Caereforge](https://caereforge.com)