---
title: "Adding a button to Tempo events"
description: "How to add a custom action button to a source's events: open a log file, copy an IP, or jump to a terminal at a hostname. One JSON file, no relaunch."
pubDate: 2026-05-15
tags: ["how-to"]
draft: false
---

*📅 May 15, 2026 · Tempo 1.0.3 · Leo from Caereforge*

Some time ago I was looking at a card from a Kopia backup in my timeline and thought I wanted to tail the logfile to check some data. I was about to fire my terminal up but I thought: why don't I create a new button in Tempo? It took 5 minutes. Tempo picked up the change live, and the button was ready to click.

## How the buttons work

The row of buttons on the right side of an event comes from a small JSON file called a **score**. You can find it in `~/Library/Application Support/Tempo/Scores/`. There's one score per source (named after it). The score declares the source's color and display name, optionally a few severity rules, and a list of `defaultActions`. The default actions are the buttons.

For Kopia, I simply opened my score (`com.kopia.json`) in vim, and edited the block I cared about:

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

One entry per button. Three fields each:

- `label`: what the user sees on the button. Keep it short.
- `systemIcon`: an SF Symbols name. Apple ships [SF Symbols](https://developer.apple.com/sf-symbols/) as a free Mac app; install it, browse, right-click → Copy Name, paste here.
- `trigger`: what happens on click. The interesting one.

## Adding the "Tail log" button

What I wanted was a button that runs the command `tail -n 50 -f ~/.kopia.log`. I added an entry to the array (note the comma):

```json
{
  "label": "Tail log",
  "systemIcon": "terminal",
  "trigger": { "openTerminalWith": "tail -n 50 -f ~/.kopia.log" }
}
```

I saved the file and Tempo's watcher fired almost immediately. Once back in the app, my button was there.

Done.

## What you can put in `trigger`

Three flavors of trigger cover most of what you'd want.

**`openURL`** opens any URL with the system handler. So this works:

```json
{ "trigger": { "openURL": "https://router.lan/" } }
{ "trigger": { "openURL": "ssh://admin@192.168.1.1" } }
{ "trigger": { "openURL": "file:///var/log/system.log" } }
{ "trigger": { "openURL": "mailto:alerts@example.com" } }
```

Any URL scheme registered on your Mac works. Web, SSH, Mail, Things, Obsidian, DEVONthink. If you can click it from Safari and your Mac handles it, you can wire it as a button.

**`openTerminalWith`** opens Terminal and runs a command. `ping`, `tail`, `kopia snapshot list`, `docker ps`, anything you'd type yourself:

```json
{ "trigger": { "openTerminalWith": "ping 192.168.1.1" } }
{ "trigger": { "openTerminalWith": "kopia snapshot list" } }
```

You see the output, you can keep typing in the same window if you want.

**`copyToClipboard`** copies a string. Useful when the event carries an identifier you'll paste somewhere else:

```json
{ "trigger": { "copyToClipboard": "192.168.1.1" } }
```

## Per-event values: `${metadata.xxx}`

The examples above use fixed strings. But often what you want is on the event itself. The specific IP, the specific hostname, the URL the sender included in the payload.

For that, any string in a `trigger` (or in `label`) can contain `${metadata.<key>}`, which Tempo replaces at click time with the value from that event.

A UniFi Network event from the bundled webhook adapter carries `metadata.ip` and `metadata.hostname`. So a "Ping this host" button that works on every UniFi event without hardcoding addresses:

```json
{
  "label": "Ping ${metadata.hostname}",
  "systemIcon": "antenna.radiowaves.left.and.right",
  "trigger": { "openTerminalWith": "ping ${metadata.ip}" }
}
```

The label interpolates too. That's why you see `Ping web-01` or `Ping nas-backup` on the row instead of a generic "Ping": the button reads the event's own metadata.

If a key isn't on a given event, the button is hidden for that event. Tempo doesn't render half-resolved templates; quiet is better than confusing.

## A few pointers from here

- **Chapter 11, Score authoring** in the User Guide is the reference: every field, the severity rules, conditional visibility. Worth a bookmark once you start customizing more than one source: [/docs/11-score-authoring/](/docs/11-score-authoring/)
- **Chapter 7, Score Editor** covers the in-app UI for editing scores. The Editor handles colors, severity rules, grouping, display names. Action authoring stays in JSON for V1 and lands in the UI later.
- **Discord** is the easiest way to ask if something doesn't work, and the easiest way to show off what you wired together. I read everything there.

That's it. One JSON edit, one save, one new button. Tempo's design assumption is that you know what you want to click, and the score file is just a clean place to declare it.

Leo from [Caereforge](https://caereforge.com)