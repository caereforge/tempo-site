---
title: "Adding a button to Tempo events"
description: "A walkthrough for adding your own action button to a source's events. Open a log file from a backup alert, copy an IP from a network event, jump into a terminal at a hostname — all wired by editing one JSON file."
pubDate: 2026-05-15
tags: ["how-to"]
draft: false
---

A few weeks ago I was looking at a Kopia backup event in Tempo's feed and thought, "I wish I had a 'Tail log' button right here." The event already told me _what_ happened. I wanted one click to _go look at it_ — open the Kopia log in Console.app, see the last 50 lines, move on.

The button doesn't exist by default. So I added it. The whole thing took five minutes once I knew where to look.

This post is the "where to look" guide. If you have a source that emits events — Kopia, UniFi, Home Assistant, one of your own scripts — and you want a one-click action attached to those events, here's how to wire it.

## The setup

Tempo events come with a row of buttons in the **action panel** on the right. The default buttons are defined by a small JSON file called a **score**. There's one score per source, and a score is just a list of:

- The source's color and display name
- (Optionally) severity rules — how to classify incoming events into info / warning / error
- A list of **default actions** — the buttons you see on every event from that source

The default actions are what we care about today.

## Where the score files live

Open Finder and hit `⌘⇧G` (Go → Go to Folder), then paste:

```
~/Library/Application Support/Tempo/Scores/
```

You'll see a `.json` file for each source you've installed. The names look like `com.kopia.json`, `com.ubiquiti.unifi.network.json`, and so on. These files are user-owned — Tempo watches the folder, so any edit you save here is picked up live, no relaunch needed.

> If the source you want to customise isn't there, it means no score has been installed for it yet. Either Tempo will seed one on first run (most bundled sources self-install), or you can grab one from the Score catalog inside Tempo (Settings → Score editor) and drop it in.

## What a score looks like

Open `com.kopia.json` in your favourite text editor. The interesting part for us is the `defaultActions` block:

```json
"defaultActions": [
  {
    "label": "Open KopiaUI (desktop app)",
    "systemIcon": "externaldrive.badge.checkmark",
    "trigger": { "openURL": "file:///Applications/KopiaUI.app" }
  },
  {
    "label": "Open Kopia server (web UI)",
    "systemIcon": "server.rack",
    "trigger": { "openURL": "http://localhost:51515" }
  }
]
```

Each entry is one button. Three fields:

- **`label`** — what shows up on the button. Keep it short, this lives on screen.
- **`systemIcon`** — an SF Symbols name. Apple ships [SF Symbols](https://developer.apple.com/sf-symbols/) as a free Mac app; install it, browse, find the icon you want, right-click → Copy Name. Paste that string here.
- **`trigger`** — what happens when the user clicks the button. We'll get to triggers in a moment.

## Adding the "Tail log" button

I want a button that opens my Kopia log file in Console.app. The trigger for opening a file or URL is `openURL`. For files, the URL takes a `file://` scheme.

I add this to the `defaultActions` array (note the comma after the previous entry):

```json
{
  "label": "Tail log",
  "systemIcon": "terminal",
  "trigger": { "openTerminalWith": "tail -n 50 -f ~/.kopia.log" }
}
```

I save the file. Tempo's score watcher fires within a second — I switch back to the app and the new button is sitting on every Kopia event. Click it, Terminal opens, `tail -f` starts streaming the log.

That's the whole loop.

## The three trigger types

Three flavours of trigger cover almost everything you'd want a button to do:

### `openURL`

Opens a URL with the system handler. Examples:

```json
{ "trigger": { "openURL": "https://router.lan/" } }
{ "trigger": { "openURL": "ssh://admin@192.168.1.1" } }
{ "trigger": { "openURL": "file:///var/log/system.log" } }
{ "trigger": { "openURL": "mailto:alerts@example.com" } }
```

Any URL scheme registered on your Mac works: web, SSH, Mail, Things, Obsidian, DEVONthink, you name it. If you can click it in Safari and your Mac handles it, you can wire it as a button here.

### `openTerminalWith`

Opens Terminal.app and runs a command. Useful for `ping`, `tail`, `kopia snapshot list`, `docker ps`, anything you'd type yourself:

```json
{ "trigger": { "openTerminalWith": "ping 192.168.1.1" } }
{ "trigger": { "openTerminalWith": "kopia snapshot list" } }
```

The command runs in a new Terminal window. You see the output and can keep typing if you want.

### `copyToClipboard`

Copies a string. Often what you actually want when the event carries an identifier you'll paste somewhere else:

```json
{ "trigger": { "copyToClipboard": "192.168.1.1" } }
```

## Per-event customisation: `${metadata.xxx}`

The trigger examples above use fixed strings. But often the value you want is _on the event itself_ — the specific IP, the specific hostname, the specific URL the sender included in the payload.

For that, score actions support **metadata interpolation**. Any string in a `trigger` value can contain `${metadata.<key>}`, which Tempo replaces at click time with the actual value from that event.

Concrete: a UniFi Network event from Tempo's webhook adapter carries `metadata.ip` and `metadata.hostname`. To get a "Ping this host" button that works on _every_ UniFi event without hardcoding addresses:

```json
{
  "label": "Ping ${metadata.hostname}",
  "systemIcon": "antenna.radiowaves.left.and.right",
  "trigger": { "openTerminalWith": "ping ${metadata.ip}" }
}
```

The label itself can interpolate too — that's why you see `Ping web-01` or `Ping nas-backup` instead of a generic "Ping". The button reads the event's own metadata.

If the metadata key isn't present on a given event, that button is hidden for that event. Tempo doesn't render half-resolved templates — better quiet than confusing.

## Where to go from here

A few pointers:

- **User Guide chapter 11 — Score Authoring** walks through every field of the score JSON, the severity rules, conditional visibility, the works. Bookmark it if you start customising more than one source: [/docs/score-authoring/](/docs/score-authoring/)
- **User Guide chapter 7 — Score Editor** covers the in-app UI for editing scores. Action authoring stays in JSON for V1 — the Editor handles severity rules, colors, display names. We'll layer action authoring into the UI in a later release.
- **Tempo's Discord** is where I hang out when I'm not coding. If you wire up something cool, share it there. If you hit a snag, ping me — I read everything.

That's the whole flow. One JSON edit, one save, one new button. Tempo's design assumption is that you know what you want to click and we just give you a clean place to declare it. The score file is that place.

Let me know what you wire up.

— Leo
