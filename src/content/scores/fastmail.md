---
title: "Fastmail"
description: "An experimental, read-only CalDAV bridge that pulls today's Fastmail calendar events into your Tempo agenda. Basic by design: manual configuration, display-only events, no write-back."
providerIdentifier: "com.caldav.fastmail"
color: "#FF0000"
version: "1.0.0"
pubDate: 2026-06-26
builtIn: true
---

Tempo has its own CalDAV client. This score points it at Fastmail and shows today's Fastmail calendar events alongside your other agenda items, with the organizer attached. Each event gets buttons to open it in Fastmail, copy its link, or email the organizer. Events are display-only: there is nothing to write back, and nothing to install or download on the Fastmail side.

> **Experimental.** A basic, read-only CalDAV bridge. It was built and tested against a Fastmail account, but the implementation is intentionally limited (read-only, manual configuration) and CalDAV handling is still being hardened. It is aimed at technical users for now.

The score is built in and seeded on first launch. The **account** is configured from the score's **Source** tab in the Score Editor; choosing *which* calendars to sync happens in **Settings → Agenda** once Tempo connects.

## Install

**1. Edit the config file.** In the **Source** tab, click **Open configuration** to open (or create):

```
~/Library/Application Support/Tempo/external-providers.json
```

Set `username` to your full Fastmail address. You can leave `calendars` empty: once Tempo connects it **discovers your calendars from the server** and lets you check/uncheck which to sync in **Settings → Agenda → External Providers**, saving your choices back to this file automatically. The `auth.keychainItem` value is a name you choose for the Keychain entry (for example `tempo-caldav-fastmail`).

**2. Store the password in the macOS Keychain.** The password is **never** written to the config file: Tempo refuses to load a provider with an inline password. Create a Fastmail **app-specific password** (Fastmail: Settings → Privacy & Security → App passwords), then in Terminal:

```sh
security add-generic-password \
  -s tempo-caldav-fastmail \
  -a you@fastmail.com \
  -w 'your-app-specific-password'
```

The `-s` value must match `auth.keychainItem` in the config, and `-a` must match `username`.

**3. Restart Tempo.** It loads the config at launch and watches it for changes.

The full walkthrough is the **Setup README** button in the Source tab. If something does not appear, check `Console.app` filtered by `Tempo`: the CalDAV engine logs what it loaded and any auth errors.

## What you'll see

- Today's Fastmail calendar events in your agenda, with the organizer.

Each event carries three buttons:

| Action | What it does |
|--------|--------------|
| **Open in Fastmail** | Opens the event in the Fastmail web app |
| **Copy event link** | Copies the event's Fastmail link to the clipboard |
| **Email organizer** | Starts a `mailto:` to the event's organizer |

## Limitations

- **Read-only.** Events are display-only; there is no write-back to Fastmail. Create, edit, or delete events in Fastmail itself.
- **Manual configuration.** Account setup is a config file plus a Keychain entry; there is no point-and-click sign-in.
- **Basic and experimental.** Tempo fetches today's events for the calendars you select; CalDAV handling is still being hardened.
- **Calendar selection lives in Settings → Agenda**, with the calendar list discovered automatically from the server.
