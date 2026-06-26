---
title: "Fastmail"
description: "An experimental, read-only CalDAV bridge that pulls today's Fastmail calendar events into your Tempo agenda. Basic by design: manual configuration, display-only events, no write-back."
providerIdentifier: "com.caldav.fastmail"
color: "#FF0000"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

This score points Tempo's built-in CalDAV client at Fastmail and shows today's Fastmail calendar events alongside your other agenda items, with the organizer attached. Each event gets buttons to open it in Fastmail, copy its link, or email the organizer. The events are display-only, and there is nothing to install or download on the Fastmail side.

> **Experimental.** This is a basic, read-only CalDAV bridge. It was built and tested against a Fastmail account, but the implementation is intentionally limited (read-only, manual configuration) and the CalDAV handling is still being hardened. It is aimed at technical users for now.

The score is built in and seeded on first launch. There is no separate provider to add in Manage Sources.

## How it works

Fastmail is not a webhook source. Nothing on the Fastmail side posts to Tempo. Instead, Tempo's own CalDAV client connects out to Fastmail's CalDAV server, reads today's calendar events for the calendars you select, and places them in the agenda view. This is an agenda-class source, the same class as Apple Calendar: events are read-only, and Tempo never writes back to Fastmail.

The **account** (your Fastmail address and the Keychain entry that holds the app password) is configured from the score's **Source** tab in the Score Editor. Choosing *which* calendars to sync happens in **Settings → Agenda** once Tempo connects and discovers the calendar list from the server.

## Setup

**1. Edit the config file.** In the **Source** tab of the Score Editor, click **Open configuration** to open (or create):

```
~/Library/Application Support/Tempo/external-providers.json
```

Set `username` to your full Fastmail address. You can leave `calendars` empty: once Tempo connects it discovers your calendars from the server and lets you check or uncheck which to sync in **Settings → Agenda → External Providers**, saving your choices back to this file automatically. The `auth.keychainItem` value is a name you choose for the Keychain entry (for example `tempo-caldav-fastmail`).

**2. Store the app password in the macOS Keychain.** The password is never written to the config file: Tempo refuses to load a provider with an inline password. Create a Fastmail app-specific password (Fastmail: **Settings → Privacy & Security → App passwords**), then in Terminal:

```sh
security add-generic-password \
  -s tempo-caldav-fastmail \
  -a you@fastmail.com \
  -w 'your-app-specific-password'
```

The `-s` value must match `auth.keychainItem` in the config, and `-a` must match `username`.

**3. Restart Tempo.** It loads the config at launch and watches it for changes afterward.

The full walkthrough is the **Setup README** button in the Source tab. If something does not appear, check `Console.app` filtered by `Tempo`: the CalDAV engine logs what it loaded and any authentication errors.

## What you'll see

Today's Fastmail calendar events appear in your agenda, each with its organizer attached. Every event carries three buttons:

| Action | What it does |
|--------|--------------|
| **Open in Fastmail** | Opens the event in the Fastmail web app, keyed on the event's `fastmail_uid` |
| **Copy event link** | Copies the event's Fastmail web link to the clipboard |
| **Email organizer** | Starts a `mailto:` to the event's `fastmail_organizer_email` |

## Limitations

- **Read-only.** Events are display-only; there is no write-back to Fastmail. Create, edit, or delete events in Fastmail itself.
- **Manual configuration.** Account setup is a config file plus a Keychain entry; there is no point-and-click sign-in.
- **Today only.** Tempo fetches today's events for the calendars you select, not a full forward window.
- **Calendar selection lives in Settings → Agenda**, with the calendar list discovered automatically from the server.
- **Experimental.** The CalDAV handling is still being hardened.
