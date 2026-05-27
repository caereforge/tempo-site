---
title: "CalDAV is here — starting with Fastmail"
description: "Tempo now speaks CalDAV natively. Your Fastmail calendars show up in the Agenda without going through Apple's Internet Accounts."
pubDate: 2026-05-27
tags: ["how-to", "caldav", "calendar"]
---

*📅 May 27, 2026 — Tempo 1.1 · Leo from Caereforge*

Since day one, Tempo has been reading my calendars and reminders through Apple's EventKit; whatever you see in Calendar.app or Reminders.app, Tempo sees too. That works great for iCloud and for providers you've added via System Settings → Internet Accounts. But if you're a Fastmail user (or any CalDAV provider that doesn't play nicely with Internet Accounts), you've been stuck with a workaround or nothing at all.

Not anymore. Tempo 1.1 ships with a native CalDAV engine that talks directly to your calendar server; no middleman, no Apple sync layer, no Internet Accounts entry needed. Your data still never leaves your Mac; we're just fetching it from a different door.

## Why Fastmail first?

I use Fastmail myself, and I know a lot of people do too. Fastmail's CalDAV is clean, well-documented, and supports app-specific passwords, which makes it a perfect first adapter. It's also a good signal of what's coming: the engine underneath is provider-agnostic, and more adapters (iCloud, Google, Nextcloud, generic CalDAV) are on the roadmap for Tempo 2.

## How it works

The CalDAV engine is a three-layer design:

1. **Protocol layer**: speaks RFC 4791 (CalDAV) and RFC 5545 (iCalendar). Handles discovery, sync tokens, polling, iCal parsing. You don't touch this.
2. **Adapter layer**: per-provider logic. The Fastmail adapter knows the server URL, auth method (Basic + app-specific password), and any quirks. A generic CalDAV adapter is also included for other providers.
3. **Score layer**: the `.tempo-score` file that tells Tempo how to display and act on your Fastmail events. Same system as every other Tempo source.

The engine polls your server periodically and upserts events into Tempo's local database. It uses CalDAV sync tokens, so after the first full sync only changes are fetched — it's lightweight on both your Mac and the server.

## What you get

Your Fastmail events land in the Agenda panel alongside Apple Calendar, Reminders, and everything else. They show up with:

- The calendar's own color (synced from the server)
- Recurrence indicators for repeating events
- A dedicated "Open in Fastmail" action button that takes you straight to the event in Fastmail's web UI

## Setting it up

1. **Install the score**: double-click `com.caldav.fastmail.tempo-score` — review and install.
2. **Create an app-specific password** in Fastmail: Settings → Privacy & Security → App Passwords → New. Give it CalDAV access.
3. **Configure the provider**: create or edit the file `~/Library/Application Support/Tempo/external-providers.json`:

```json
{
  "version": 1,
  "providers": [
    {
      "type": "caldav-fastmail",
      "username": "you@fastmail.com",
      "auth": { "type": "basic", "keychainItem": "tempo-caldav-fastmail" },
      "calendars": ["Personal", "Work"]
    }
  ]
}
```

4. **Store the password in Keychain**: open Keychain Access, create a new password item with name `tempo-caldav-fastmail`, account `you@fastmail.com`, and paste your app-specific password.
5. **Restart Tempo** — it picks up the config and starts syncing.

The `calendars` array controls which calendars Tempo syncs. You can also manage this from Settings → Agenda → External Providers (CalDAV), where you'll see checkboxes for each discovered calendar.

## Customizing the score

Scores are just JSON files — you can open them in any text editor. If you have the Fastmail desktop app installed, you can add a button to open it directly. Go to Settings → Scores, click "Open score location in Finder", open `com.caldav.fastmail.json`, and add an entry to the `defaultActions` array:

```json
{
  "label": "Open Fastmail app",
  "systemIcon": "envelope",
  "trigger": { "openURL": "fastmail://app" }
}
```

Save the file — Tempo picks up score changes automatically, no restart needed. This is one of the things I like about the score system: if you need a button, you add it yourself in 30 seconds.

## What about other CalDAV providers?

The generic CalDAV adapter is already included. If your provider supports standard CalDAV with Basic auth, you can point Tempo at it by using `"type": "caldav"` instead of `"caldav-fastmail"` and providing the server URL. This is experimental territory for now, I haven't tested every provider out there, and OAuth2 providers (Google, Outlook) need their own adapter work which is planned for Tempo 2.

If you try it with your Nextcloud, Radicale, or Baikal instance, I'd love to hear how it goes.

## What it doesn't do (yet)

This is a read-only integration. Tempo fetches your events; it doesn't create, edit, or delete them on the server. Write-back is a significant piece of work (conflict resolution, recurrence editing, attendee management) and it's firmly in the Tempo 2+ roadmap.

The engine also doesn't fire alarms, your calendar server and OS handle that. The bell icon in Tempo just tells you that an alarm is configured, so you know the notification is coming.
