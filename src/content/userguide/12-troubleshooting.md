---
title: "Troubleshooting"
description: "Tempo has only a few moving parts: the macOS app, the SQLite database, the HTTP ingestion server, EventKit for calendars, score JSON files."
chapter: 12
order: 12
draft: false
pubDate: 2026-05-05
---
# 12 — Troubleshooting

Tempo has only a few moving parts: the macOS app, the SQLite database, the HTTP ingestion server, EventKit for calendars, score JSON files. When something feels wrong, the failure is almost always in one of these, and the patterns repeat.

This chapter walks the failures we've seen, in rough order of "how often it bites people."

---

## 12.1 — Networking (LAN ingestion)

By far the most common class of problem: a source is configured, a webhook fires, but Tempo's feed stays silent. The source app reports "webhook delivered successfully," but Tempo never received it.

The full networking troubleshooting page is on the website at [tempoapp.app/scores/troubleshooting-networking](https://tempoapp.app/scores/troubleshooting-networking), with five scenarios that cover ~95% of the cases. The summary is below; for diagnostic commands and per-scenario fixes, the website page is the canonical reference.

### Quick decision tree

From the **source** machine (the one trying to send to Tempo):

```
1. curl -v http://<your-mac>:7776/health
   ├── 200 OK → Tempo is reachable. Skip to §12.3
   ├── timeout → firewall (Mac-local or router/VLAN) is dropping packets
   └── connection refused → Tempo isn't listening (Mac asleep? Tempo not running? wrong port?)

2. If timeout: ping <your-mac> from the source. If ping fails too,
   the firewall/VLAN is the problem (router or Mac-local)

3. If hostname doesn't resolve, use the LAN IP directly
```

> 🛠 **Tip**: before walking through the scenarios below, sanity-check that Tempo is actually listening. From the Mac itself: `curl http://localhost:7776/ingest -I` should reply with an HTTP response (not "connection refused"). If it refuses, Tempo isn't running, the port is wrong, or the Mac was asleep when the source posted. Open **Settings → Ingestion** to confirm port and that the server is up.

### The five scenarios that cover most cases

1. **Mac-local firewall denying inbound**: macOS Application Firewall, Little Snitch (incoming rules are separate from outgoing), LuLu. Allow Tempo
2. **Source is on a different VLAN**: your router's firewall is default-deny between VLANs. Add an allow rule for source VLAN → Mac IP, port 7776
3. **Hostname doesn't resolve from the source**: mDNS (`.local`) doesn't propagate across VLANs or through some routers. Use the Mac's LAN IP directly; pair with DHCP reservation
4. **AP / client isolation**: guest WiFi or "IoT-safe" mode prevents same-network devices from talking. Disable isolation or move source to a trusted SSID/VLAN
5. **Double NAT or a CGNAT router in the path**: your ISP-provided router does NAT *and* your own router does NAT, or the ISP uses carrier-grade NAT. The source can't reach the Mac's LAN because it's on a different translated network. Bridge the ISP router, or move the source onto the same NAT layer as the Mac

### Diagnostic bundle

Tempo's **Settings → Help → Export diagnostics bundle** generates a zip that includes:

- `firewall.txt`: reports macOS Application Firewall state, detects Little Snitch / LuLu / Murus / Radio Silence / Hands Off
- App version, configuration summary
- Last 24 hours of OSLog output

Attach this to a Discord support thread or GitHub issue. The bundle is usually 50-200 KB; no PII, no token values, no event payloads.

> 🛠 **Tip**: if the source is on the same Mac as Tempo (a script running locally), networking shouldn't be a factor. `curl http://localhost:7776/ingest` always works as long as Tempo is running. Same-Mac connectivity issues usually point at Tempo not running, the wrong port, or the wrong token, not at firewall/network problems.

---

## 12.2 — Apple Calendar sync issues

Calendar entries or reminders aren't appearing in Tempo, or they appear but reflect stale state (you marked a reminder done on iPhone, but it's still showing as open in Tempo). A few common patterns:

### Permission revoked

If Tempo lost calendar/reminders permission:

- **Symptom**: Apple Calendar source disappears from the source panel, or appears but with zero events
- **Check**: System Settings → Privacy & Security → Calendar (and Reminders). Tempo should be ticked
- **Fix**: re-tick Tempo if it's unticked. Quit and re-launch Tempo; it'll re-request access on next launch

### Calendar/list not in the allowlist

- **Symptom**: some calendars appear, others don't
- **Check**: Tempo Settings → Agenda. Each calendar and reminder list has a checkbox; only ticked ones appear in the timeline
- **Fix**: tick the missing ones

### iCloud sync delay

If you change a reminder on another device (iPhone, iPad), there's an iCloud-side delay before the change reaches macOS, plus an EventKit notification delay before Tempo sees it.

- **Symptom**: a reminder you completed on iPhone shows as open in Tempo for 30 seconds to several minutes
- **Check**: open Reminders.app on the same Mac. Does the reminder show as completed there? If not, iCloud hasn't synced yet, so wait
- **Fix**: time. There's no Tempo-side workaround for iCloud sync timing

### Task manager iCal subscription latency

If you're using a task manager (Todoist, OmniFocus, Things, TickTick) bridged to Calendar.app via iCal subscription, the path is:

```
Task manager → iCal export URL → Calendar.app subscription refresh → EventKit → Tempo
```

Each hop adds latency. The Calendar.app subscription refresh interval is typically 5-15 minutes. A change in your task manager won't reach Tempo faster than your iCal subscription's refresh.

- **Workaround**: change the subscription refresh interval to "Every 5 minutes" in Calendar.app (File → Get Info on the subscribed calendar)
- **Architectural fix**: native API integration with a specific task manager is on the V1.x+ roadmap as a candidate Tempo IAP unlock

### Subscribed calendar shows mystery items

If you see calendar entries in Tempo whose source you can't identify, the most likely cause is a **leftover iCal subscription** in Calendar.app from a service you've migrated away from.

- **Check**: open Calendar.app → File → in the sidebar, look for subscribed calendars. Right-click → Delete the obsolete one
- **Fix**: the entries disappear from Tempo on the next refresh

### EventKit doesn't notify for some change types

EventKit's notification system isn't comprehensive. Some kinds of changes (a calendar's colour changing in Calendar.app, certain attachment edits) don't fire a notification, and Tempo's view stays a few minutes stale until the next periodic refresh.

- **Workaround**: quit and re-launch Tempo for an immediate refresh
- **Acceptable**: most users never notice this; the changes that don't notify are rare and mostly cosmetic

---

## 12.3 — A score isn't appearing

You've created a score (or are using a bundled one) and events from the source aren't being styled the way you expected.

### Symptom: events arrive but render with default styling, no severity

- **Check 1**: open the Score Editor for the provider. Is the score loaded? If the editor shows "No score selected" when you click on the provider's chip, the score file may not be parsing
- **Check 2**: open Console.app, filter by subsystem `app.tempoapp.Tempo`. Look for "Failed to parse score" or "Schema validation error" messages
- **Fix**: validate the JSON manually. Run `jq . ~/Library/Application\ Support/Tempo/Scores/<provider>.json`; if it errors, fix the JSON. Otherwise check against the schema at `https://tempoapp.app/schema/score.schema.json`

### Symptom: events arrive, severity is set, but custom labels show literal `${metadata.xxx}`

- **Cause**: the score's interpolation references a metadata key that the payload doesn't include
- **Check**: open the Score Editor → Available keys strip. The chips show keys actually present in recent events. If `${metadata.host}` shows up literally, `host` isn't in the strip: the payload doesn't have it
- **Fix**: either change the score to reference a key that's actually present, or change the upstream sender to include the missing key

### Symptom: events don't arrive at all

- **Check 1**: confirm the request is reaching Tempo. Open Console.app, filter by `app.tempoapp.Tempo`. Send a test event. You should see "Accepted ingestion ..." or "Rejected ingestion ... reason: <reason>"
  - **No message at all** → the request isn't reaching Tempo. Networking problem (§12.1)
  - **"Rejected: invalid token"** → token is wrong or revoked. Settings → Ingestion → confirm the token is active and correct
  - **"Rejected: provider mismatch"** → token is bound to a different providerIdentifier than the payload declares. Either change the payload's `providerIdentifier` or rebind the token
  - **"Rejected: schema validation: <field>"** → payload is malformed. The error message names the offending field
- **Check 2**: rate limiting. If you're sending many events rapidly (a script in a tight loop), the rate limit may be active: 120 requests per minute, per token, on a sliding 60-second window. Wait a minute for the window to slide, or split load across more tokens. There is no per-IP limit, so an extra bound token raises your effective ceiling

### Symptom: score has rules but the wrong rule is firing

- **Cause**: rules evaluate top-to-bottom, first match wins. A more general rule above a more specific one means the specific case never gets reached
- **Check**: in the Score Editor, look at rule order. The Try panel on the right shows you which rule actually fires for a recent event
- **Fix**: move the specific rule above the general one (use the up-arrow on the rule card)

### Symptom: bundled score's behaviour seems off after an app update

- **Cause**: an update may have improved a bundled score, but your local edits to that score persist (Tempo doesn't overwrite user edits on update)
- **Fix**: to drop your local edits and pick up the bundled version, quit Tempo, delete `~/Library/Application Support/Tempo/Scores/<provider>.json`, and relaunch. Tempo reseeds that score from the bundle on launch. Duplicate the score first (chip bar → **Duplicate**) if you want to keep your customizations to merge back manually

---

## 12.4 — DMG won't open / Gatekeeper warning

You downloaded the DMG and macOS refuses to open Tempo.

### Symptom: "Tempo can't be opened because it is from an unidentified developer"

- **Cause**: macOS doesn't recognise the signature. Usually caused by a corrupted download or a non-default browser stripping the quarantine attribute oddly
- **Fix 1** (preferred): re-download the DMG from `downloads.tempoapp.app`. Use the default browser for the download (Safari or whatever else is set in System Settings)
- **Fix 2**: if re-downloading still produces this dialog, open System Settings → Privacy & Security. Scroll to the "Security" section. Click **Open Anyway** next to the Tempo entry

### Symptom: "Tempo is damaged and can't be opened"

- **Cause**: almost always a corrupted download. The signature check failed because the file's bytes don't match what we shipped
- **Fix**: re-download the DMG. If it persists, verify the SHA-256 checksum against the value on the changelog page. If the checksum matches but macOS still rejects, file a GitHub issue with your macOS version and the checksum

### Symptom: macOS opens the DMG but the Tempo icon launches and immediately quits

- **Cause**: typically a missing entitlement or a permission dialog being dismissed without granting
- **Fix**: check Console.app for `app.tempoapp.Tempo` entries around the launch time. Look for "missing entitlement" or "permission denied" errors. The most common cause in this state is Calendar/Reminders permission being denied at first launch: open System Settings → Privacy & Security → Calendar and tick Tempo

---

## 12.5 — Performance with many sources

If your timeline has tens of thousands of events and Tempo feels sluggish:

### Reduce retention

- Settings → Maintenance → Database → **Keep events for** → pick a window (90 days, 6 months, 1 year)
- On the next launch, Tempo deletes events older than the window. Database shrinks; queries get faster

The 84-day heatmap window means anything beyond that isn't visualised anyway, so a 90-day or 180-day retention is usually fine for active users.

### Auto-dismiss noisy sources

- Settings → Maintenance → Auto-dismiss → enable per source for the chatty ones
- Auto-dismissed events stay in the database (subject to retention) but drop off the live feed

### Hide sources you're not currently using

- Source panel → info button (ⓘ) → **Hide from timeline**
- Hidden sources stop contributing to the feed and the heatmap. Their events still arrive and are stored; un-hide later if you want them back

### Tighten grouping

- A source that produces many similar events with no grouping is the most likely cause of a long feed. Score Editor → Stack grouping → enable, with a grouping template that clusters related events

### Vacuum the database

If retention has deleted a lot of rows, the database file may have empty space. Tempo runs `VACUUM INTO` automatically every time it produces a backup snapshot, so an easy way to reclaim space is to trigger an on-demand backup from **Settings → Maintenance → Database → Backup now**, then keep using Tempo as normal.

For a direct vacuum on the live database, quit Tempo and run:

```bash
sqlite3 ~/Library/Application\ Support/Tempo/Tempo.sqlite 'VACUUM;'
```

V1 does not expose a manual "Vacuum now" button in the UI; it's a candidate for a future release.

### When all of the above isn't enough

Open a Discord support thread with your diagnostic bundle (Settings → Help → Export diagnostics). We'll look at your config and timeline volume; if there's a deeper issue, we'd rather hear about it.

---

## 12.6 — Logs and diagnostic export

### OSLog (Console.app)

Tempo uses Apple's unified logging system. Logs are accessible via Console.app:

1. Open Console.app
2. In the left sidebar, click your Mac name
3. In the top filter bar, set: **Subsystem: `app.tempoapp.Tempo`**
4. Click **Start Streaming** to watch live, or **Action → Include Info Messages** for retrospective lookback

Useful filters:

- `Action: Include Info Messages` for general activity
- `Process: Tempo` if you have a noisy log feed and want only Tempo entries
- Search for specific terms: "Failed to parse", "Rejected ingestion", "Score reload", etc.

### Diagnostic bundle

The single-click way to grab "everything Tempo support might want":

- **Settings → Help → Export diagnostics bundle…**

The bundle is a zip containing:

- `manifest.json`: bundle version, app version, generation timestamp
- `system.txt`: macOS version, hardware summary
- `firewall.txt`: macOS Application Firewall state, third-party firewall detection
- `config.json`: your Tempo configuration summary (sources connected, retention, auto-rules, but *not* tokens or event payloads)
- `oslog.log`: the last 24 hours of Tempo's OSLog output

Use the bundle when:

- Asking for help on Discord or GitHub
- Reporting a bug
- Comparing behaviour with another user

What's *not* in the bundle:

- Token **values** (only token names appear, in `config.json`)
- Event payloads or titles
- Calendar contents
- Anything in your `~/Library/Application Support/Tempo/Scores/` (your score files)

If a support request needs your scores, attach them separately. The bundle deliberately excludes them because scores can contain `${metadata.xxx}` interpolations that a paranoid eye might read as data leakage even though they're just templates.

### Audit log

Every ingestion attempt, accepted or rejected, is captured in OSLog (subsystem `app.tempoapp.Tempo`, category `Ingestion`). Look for `Accepted ingestion` or `Rejected ingestion` entries. Each entry includes:

- Source IP
- Token name (never the value)
- Provider identifier
- Transport (TLS or cleartext)
- Result + reason on rejection

**Rejections** are also written to a CSV file at `~/Library/Application Support/Tempo/rejections.csv` (capped at the last 500 rows). There is no `Logs/` directory and no rolling daily file log; accepted events and the full history live in OSLog only.

Rejections are surfaced as a UI: the **Security Audit window**, reachable from the shield icon or **Settings → Security**. It has **Security** and **All** tabs and shows, per rejected attempt, the status code, source IP, token name (never the value), provider, transport (TLS vs cleartext), and reason; you can mark an entry as handled. The window is backed by `rejections.csv` (last 500 rows).

For accepted events and full history beyond the rejection feed, read OSLog via Console.app filtered on the subsystem. The diagnostic bundle carries roughly the last 24 hours of OSLog automatically. For long-term forensics, set up macOS log forwarding to a syslog server (out of scope for this guide, but documented in Apple's `os_log` reference).

---

## 12.7 — Resetting scores to bundled defaults

If a bundled score has drifted into a state you don't understand, or you want to undo wholesale customization:

### Reset a single score

1. Quit Tempo
2. Delete `~/Library/Application Support/Tempo/Scores/<provider>.json` (move to Trash to keep a recovery option)
3. Re-launch Tempo

On launch, Tempo reseeds that score from the version that ships in the app bundle. Your customizations are gone, so duplicate the score first via the chip bar's **Duplicate** if you want a backup.

### Reset all scores

To reset every bundled score at once:

1. Quit Tempo
2. Delete the contents of `~/Library/Application Support/Tempo/Scores/` (move to Trash to keep a recovery option)
3. Re-launch Tempo

On launch, the bundled scores are seeded fresh. Any user-authored scores you wrote from scratch and didn't keep elsewhere are gone, so back up first.

### Reset settings

To reset Tempo's UserDefaults (theme, footer toggle, heatmap colours, auto-rules, source overrides):

1. Quit Tempo
2. Run in Terminal: `defaults delete app.tempoapp.Tempo`
3. Re-launch Tempo

This removes all your preferences. Calendar permission, ingestion tokens (in Keychain), and event database are unaffected.

> ⚠️ **Warning**: reset is destructive. Always make a backup (Settings → Maintenance → Database → Backup now) before resetting anything you can't easily reconstruct.

### Full nuclear reset

If you want Tempo back to first-launch state:

1. Quit Tempo
2. Move `~/Library/Application Support/Tempo/` to Trash
3. Run `defaults delete app.tempoapp.Tempo`
4. Open Keychain Access, delete all entries for `app.tempoapp.Tempo`
5. Re-launch Tempo

You're back to "first launch, grant calendar permission" state. Use this only if everything else has failed.

---

## When troubleshooting fails

If you've worked through this chapter and the problem persists, the project's support channels are:

- **Discord**: invite link at [tempoapp.app/community](https://tempoapp.app/community/)
- **GitHub Issues**: [github.com/caereforge/tempo-site/issues](https://github.com/caereforge/tempo-site/issues) for site/docs issues, public repo for the app to come post-V2
- **Email**: `support@tempoapp.app`

When asking for help, include:

- Your macOS version (System Settings → General → About)
- Your Tempo version (menubar Tempo → About Tempo)
- The diagnostic bundle (Settings → Help → Export diagnostics)
- A description of what you expected vs what happened

The support team is one person (the founder) plus the community. We'll get back to you, but be patient: this is freeware in V1, not a 24/7 enterprise product.
