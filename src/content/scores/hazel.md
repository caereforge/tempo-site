---
title: "Hazel"
description: "Bring Hazel rule fires into your Tempo timeline. Each rule firing becomes an event with one-click actions to open the file, jump to the source or destination folder, and copy the path or rule name."
providerIdentifier: "com.noodlesoft.hazel"
color: "#C77B30"
version: "1.0.0"
file: "/scores/hazel.tempo-score"
compatibility:
  - "Hazel 5"
  - "Hazel 6"
pubDate: 2026-04-28
downloadable: true
---

Hazel doesn't ship a webhook transport, but every rule can run an embedded **Run shell script** action — and that's enough. A four-line shell command in your rule POSTs to Tempo with the matched file path, the rule name, and the source / destination folders. Tempo renders the event with five clickable actions (open file, open destination, open source, copy path, copy rule name).

No adapter on the Tempo side — `/ingest` accepts the JSON the script emits.

---

## Install

1. Download `hazel.tempo-score` from the button above.
2. Double-click it. Tempo opens a review sheet — click **Install**. The score is saved to `~/Library/Application Support/Tempo/Scores/hazel.tempo-score`.
3. In Tempo **Settings → Ingestion**, add a token named `hazel` bound to `com.noodlesoft.hazel`. Copy the token — you'll paste it into the shell script in step 5.
4. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest` (or `127.0.0.1` if Hazel runs on the same Mac as Tempo, which is the common case).
5. Configure the Hazel rule (see below).

## Hazel side — add the shell action

In Hazel, edit the rule you want Tempo to receive notifications for. Add a new action: **Run shell script** → **Embedded script**. Paste this template:

```bash
#!/bin/bash
# Notify Tempo whenever this Hazel rule fires.
# Hazel exposes:
#   $1                 → matched file path
#   $HAZEL_RULE_NAME   → rule name
#   $HAZEL_FOLDER      → folder being watched
#   $HAZEL_DEST_FOLDER → destination folder (when the rule moves files)

TEMPO_HOST="127.0.0.1:7776"
TEMPO_TOKEN="paste-your-hazel-token-here"

curl -sS -X POST "http://$TEMPO_HOST/ingest" \
  -H "X-Tempo-Token: $TEMPO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{
  "title": "$HAZEL_RULE_NAME — $(basename "$1")",
  "providerIdentifier": "com.noodlesoft.hazel",
  "eventType": "alert",
  "metadata": {
    "path":   "$1",
    "rule":   "$HAZEL_RULE_NAME",
    "folder": "$HAZEL_FOLDER",
    "dest":   "$HAZEL_DEST_FOLDER"
  }
}
EOF
)"
```

Replace `TEMPO_TOKEN` with the value you copied in step 3 above. If Hazel runs on a different Mac than Tempo, replace `127.0.0.1` with your Tempo Mac's hostname (`tempo-mac.local`, your IP, etc.).

You can attach the same action to as many rules as you want — `$HAZEL_RULE_NAME` differentiates them in Tempo's feed.

## What Hazel actually sends

Each event Tempo receives looks like this in the feed:

```
Sort photos by date — IMG_4521.HEIC
```

with metadata carrying the file path, rule name, source folder, and destination folder. The five default actions interpolate those values: clicking *Open file* runs `open file:///Users/.../IMG_4521.HEIC`; *Open destination folder* runs `open file:///Users/.../Sorted/2026-04`; etc.

## Actions provided

- **Open file** — opens the matched file in the default app for its type
- **Open destination folder** — opens the folder Hazel moved/copied the file to (if applicable)
- **Open source folder** — opens the folder Hazel was watching
- **Copy file path** — full path to clipboard
- **Copy rule name** — rule name to clipboard

`Open destination folder` shows greyed-out for rules that don't move files (no `dest` in metadata) — that's the score doing the right thing: it knows the action would be a dead button, so it tells you instead of silently opening nothing.

## Troubleshooting

If Hazel rules fire but no event reaches Tempo, run these in Terminal in order until something fails:

```bash
# 1. Reachability — does Tempo's port respond?
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:7776/health
```

```bash
# 2. Token + payload — does a manual POST land in Tempo?
curl -sS -X POST http://127.0.0.1:7776/ingest \
  -H "X-Tempo-Token: paste-token" \
  -H "Content-Type: application/json" \
  -d '{"title":"hazel test","providerIdentifier":"com.noodlesoft.hazel","eventType":"alert","metadata":{}}'
```

```bash
# 3. tcpdump — confirm Hazel's POST is leaving the Mac on the right port
sudo tcpdump -i lo0 -A 'tcp port 7776' &
# Trigger your Hazel rule, then:
sudo killall tcpdump
```

```bash
# 4. Hazel's own log
log stream --predicate 'process == "Hazel"' --info --last 5m
```

```bash
# 5. Tempo's ingestion log
log show --predicate 'subsystem == "app.tempoapp.Tempo" AND category == "Ingestion"' --info --last 5m | grep -i hazel
```

Common failure modes:

- **HTTP 403** from Tempo: the token isn't authorized for `com.noodlesoft.hazel`. In Tempo Settings → Ingestion, edit the token and bind it to that exact provider, or to a parent prefix.
- **HTTP 422**: the JSON payload is malformed (commonly: a path with embedded quotes that broke the heredoc). Wrap `$1` as written in the template — the heredoc handles escaping cleanly.
- **No event at all**: Hazel didn't run the script. Check the rule preview in Hazel ("If: …, then: Run shell script") — Hazel only fires actions for rules whose conditions match the event.
