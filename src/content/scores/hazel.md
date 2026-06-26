---
title: "Hazel"
description: "Bring Hazel rule fires into your Tempo timeline. Each firing becomes an event with one-click actions to open the file, jump to a folder, or copy the path."
providerIdentifier: "com.noodlesoft.hazel"
color: "#C77B30"
version: "1.0.0"
compatibility:
  - "Hazel 5"
  - "Hazel 6"
pubDate: 2026-04-28
builtIn: true
---

Hazel doesn't ship a webhook transport, but every rule can run an embedded **Run shell script** action, and that's enough. A four-line shell command in your rule POSTs to Tempo with the matched file path, the rule name, and the source / destination folders. Tempo renders the event with five clickable actions (open file, open destination, open source, copy path, copy rule name).

No adapter on the Tempo side: `/ingest` accepts the JSON the script emits.

---

## Install

1. Tempo ships this score **built-in** — it's seeded into `~/Library/Application Support/Tempo/Scores/` on first launch, so there's nothing to download.
2. In Tempo, open **Manage Sources** and enable **Hazel** (built-in scores are activated there; only the generic Scripts source auto-installs).
3. In Tempo **Settings → Ingestion**, add a token named `hazel` bound to `com.noodlesoft.hazel`. Copy the token; you'll paste it into the shell script in step 5.
4. Note your Tempo endpoint: `http://<your-mac-hostname>:7776/ingest` (or `127.0.0.1` if Hazel runs on the same Mac as Tempo, which is the common case).
5. Configure the Hazel rule (see below).

## Hazel side: add the shell action

In Hazel, edit the rule you want Tempo to receive notifications for. Add a new action: **Run shell script** then **Embedded script**. Paste this template:

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

# Default provider - every Hazel rule POSTs under the umbrella id and
# the score above renders all of them with the same five actions. Good
# when you have one or two Hazel rules and want them grouped together.
PROVIDER="com.noodlesoft.hazel"

# Optional - turn this rule into its own sub-source under the Hazel
# umbrella. Pick a short stable suffix (scanner, mail, photos,
# downloads, ...) and uncomment the line below. Use ONE level only:
# the suffix is the sub-source row, and anything deeper rolls up into
# it (com.noodlesoft.hazel.scanner.invoices still shows under Scanner).
# The same Tempo token works for any com.noodlesoft.hazel.* sub-source
# as long as it's bound to the parent prefix in Settings → Ingestion.
#
# Examples (uncomment ONE):
#   PROVIDER="com.noodlesoft.hazel.scanner"   # ~/Scans → invoice PDFs
#   PROVIDER="com.noodlesoft.hazel.mail"      # Mail rule export → receipts, shipping, price drops
#   PROVIDER="com.noodlesoft.hazel.downloads" # ~/Downloads → cleanup, sorting
#   PROVIDER="com.noodlesoft.hazel.photos"    # ~/Pictures import → organising shots

curl -sS -X POST "http://$TEMPO_HOST/ingest" \
  -H "X-Tempo-Token: $TEMPO_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{
  "title": "$HAZEL_RULE_NAME - $(basename "$1")",
  "providerIdentifier": "$PROVIDER",
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

You can attach the same action to as many rules as you want: `$HAZEL_RULE_NAME` differentiates them in Tempo's feed.

## What Hazel actually sends

Each event Tempo receives looks like this in the feed:

```
Sort photos by date - IMG_4521.HEIC
```

with metadata carrying the file path, rule name, source folder, and destination folder. The five default actions interpolate those values: clicking *Open file* runs `open file:///Users/.../IMG_4521.HEIC`, *Open destination folder* runs `open file:///Users/.../Sorted/2026-04`, etc.

## Umbrella source and sub-sources

By default every Hazel rule POSTs under `com.noodlesoft.hazel`, so all of
them appear together as a single **Hazel** row in Tempo's source panel,
distinguished only by event title (the rule name). That works well for
one or two rules; it gets crowded once you have a dozen.

Tempo also recognizes **sub-source** provider identifiers of the form
`com.noodlesoft.hazel.<suffix>`. Each sub-source appears as a child row
visually nested under the **Hazel** parent, the same pattern as Apple
Calendar/Reminders under Apple, or UniFi Network/Protect under UniFi.
The shell template above shows several commented examples: uncomment
one to make a specific rule emit under its own sub-source.

### Bundled sub-scores

Tempo ships two sub-scores out of the box that override the parent's
file-pattern actions with semantically appropriate ones. Install them
and Hazel rules POSTing under those sub-sources get the right buttons
without any score authoring:

- **`com.noodlesoft.hazel.mail`**: when Hazel hands off an email
  (carrier delivery notification, parsed receipt, price-drop alert,
  third-party notification forwarded into a folder), actions are
  *Open in Mail*, *Open link*, *Copy sender*, *Copy rule name*. The
  metadata Hazel sends should include `sender`, `messageID`, and
  ideally a primary `url` from the email body.

Seeds automatically on first launch, no separate install step.

### Custom sub-sources

You can also pick your own suffix for any rule that doesn't fit the
bundled scenarios. The sub-source row appears with the suffix as label;
without a dedicated sub-score, it falls back to the parent Hazel
score's five default actions (Open file / Open destination folder /
Open source folder / Copy file path / Copy rule name).

Naming convention is yours. A few examples:

- `com.noodlesoft.hazel.photos`: `~/Pictures` import / organization rules
- `com.noodlesoft.hazel.downloads`: `~/Downloads` cleanup / triage rules
- `com.noodlesoft.hazel.<anything>`: your own categories

## Actions provided

- **Open file**: opens the matched file in the default app for its type
- **Open destination folder**: opens the folder Hazel moved/copied the file to (if applicable)
- **Open source folder**: opens the folder Hazel was watching
- **Copy file path**: full path to clipboard
- **Copy rule name**: rule name to clipboard

`Open destination folder` shows grayed-out for rules that don't move files (no `dest` in metadata). That's the score doing the right thing: it knows the action would be a dead button, so it tells you instead of silently opening nothing.

## Troubleshooting

If Hazel rules fire but no event reaches Tempo, run these in Terminal in order until something fails:

```bash
# 1. Reachability - does Tempo's port respond?
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:7776/health
```

```bash
# 2. Token + payload - does a manual POST land in Tempo?
curl -sS -X POST http://127.0.0.1:7776/ingest \
  -H "X-Tempo-Token: paste-token" \
  -H "Content-Type: application/json" \
  -d '{"title":"hazel test","providerIdentifier":"com.noodlesoft.hazel","eventType":"alert","metadata":{}}'
```

```bash
# 3. tcpdump - confirm Hazel's POST is leaving the Mac on the right port
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
- **HTTP 422**: the JSON payload is malformed (commonly: a path with embedded quotes that broke the heredoc). Wrap `$1` as written in the template; the heredoc handles escaping cleanly.
- **No event at all**: Hazel didn't run the script. Check the rule preview in Hazel ("If: …, then: Run shell script"). Hazel only fires actions for rules whose conditions match the event.
