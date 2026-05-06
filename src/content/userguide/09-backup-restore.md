---
title: "Backup and restore"
description: "This chapter covers what's worth backing up, how Tempo's built-in backup tools work, what they include and exclude, and how to move your Tempo state to a new Mac."
chapter: 9
order: 9
draft: false
pubDate: 2026-05-05
---
# 9 — Backup and restore

This chapter covers what's worth backing up, how Tempo's built-in backup tools work, what they include and exclude, and how to move your Tempo state to a new Mac.

> 💡 **Note**: V1 ships with **database backup** built in. **Configuration backup** (your edited scores, auto-rules, source overrides) is on the V1.x roadmap and not yet automated — for now, you can manually copy the relevant files. This chapter covers both: the V1 automated path for the database, and the manual path for configuration. [NEEDS REVIEW: confirm Configuration Backup scope for V1 launch — Phase 1 of the design proposal might land within V1, in which case this section needs updating. See `CONFIG_BACKUP_DESIGN_2026_05_04.md`.]

---

## 9.1 — Where your data lives

Tempo writes to one location:

```
~/Library/Application Support/Tempo/
├── Tempo.sqlite                ← event database
├── Scores/                     ← score JSON files (bundled + your edits)
│   ├── com.kopia.json
│   ├── com.unifi.json
│   └── ...
├── Themes/                     ← user-installed themes (V1.1+)
├── Sounds/                     ← user-installed sound packs (V1.x)
├── Logs/                       ← OSLog mirror, last few rotations
└── audit.log                   ← ingestion attempts (forensic)
```

Plus:

- **Preferences**: `~/Library/Preferences/app.tempo.tempo.plist` (UserDefaults — auto-ack rules, auto-dismiss rules, source colour overrides, hidden source list, theme choice, heatmap colours, etc.)
- **Ingestion tokens**: macOS Keychain, under the service name `app.tempo.tempo` [NEEDS REVIEW: confirm exact Keychain service identifier]

The events database is the heaviest item (typically a few MB to a few hundred MB depending on how long you've been running Tempo and how chatty your sources are). Everything else is tiny — scores are kilobytes each, preferences are a single plist.

### What's *not* in `~/Library/Application Support/Tempo/`

- The Tempo application itself (`/Applications/Tempo.app`) — comes from the DMG, not user data
- Any data your sources own (Calendar.app's database, Reminders.app's database, Kopia's repo data) — Tempo *reads* these via system frameworks, it doesn't *store* them
- Anything sent in by webhooks (the events themselves are stored in `Tempo.sqlite`, not the raw webhook bodies)

---

## 9.2 — Database backup

The Database backup lives in **Settings → Maintenance → Database**. It's the V1 automated path.

### What's in a backup bundle

Each backup is a `.tempobackup` bundle (a zip with a custom extension) containing:

- The **SQLite database** as a `VACUUM INTO` snapshot — safe to take while Tempo is running
- Your **preferences** (UserDefaults)
- The **`Scores/` folder** (your customised + bundled scores)

Bundle file name: `tempo-backup-YYYYMMDD-HHmmss.tempobackup`

### What's *not* in a backup bundle

- **Ingestion tokens** — these live in the macOS Keychain and are never written to the bundle. After restoring on a new Mac, you'll need to recreate or re-install your tokens (and update upstream tools to use the new tokens)
- **Logs** — diagnostic-only, not configuration
- **Audit log** — forensic record of ingestion attempts; restoring it on a new Mac would be misleading (different machine, different history)

> 🛑 **Critical**: tokens are deliberately excluded. The Keychain stores them encrypted with your login keychain password, which doesn't transfer cleanly to a different Mac. If a backup bundle could be exfiltrated and contained your tokens, an attacker could ingest events to your Tempo instance posing as your sources. The exclusion is a security feature.

### How to take a backup

In **Settings → Maintenance → Database**:

1. **Backup interval** picker — pick a cadence (Off / Daily / Weekly / On-demand only) [NEEDS REVIEW: confirm exact options]
2. **Destination** file picker — pick the folder where bundles are written
3. **Keep last** — how many bundles to retain (older ones are pruned automatically)
4. **Backup now** button — runs an immediate on-demand backup, regardless of schedule

Scheduled backups run on the configured cadence as long as Tempo is running. If your Mac is asleep at the scheduled time, the backup runs at the next wake.

### Where to put your backups

The recommended destination is **iCloud Drive**:

- Sync is transparent — Apple-native, encrypted at rest
- Backups land on every device signed into the same iCloud account
- Restore on a new Mac just works: install Tempo, sign into iCloud, the backups are already there

```
iCloud Drive/Tempo/Backups/
├── tempo-backup-20260504-030000.tempobackup
├── tempo-backup-20260427-030000.tempobackup
├── tempo-backup-20260420-030000.tempobackup
└── ...
```

Other options that work fine:

- **Local folder** — a path on this Mac. Useful for testing or for users who don't use iCloud
- **Mounted external** — NFS share, SMB share, USB external drive. Tempo writes to the mounted path the same way it writes to local paths

> ⚠️ **Warning**: don't pick a destination that lives *inside* `~/Library/Application Support/Tempo/`. Tempo's backup of itself, in itself, is a bad time — the bundle ends up containing previous bundles recursively. Use a destination outside the Tempo app-support directory.

> 💡 **Note**: a destination on a network share that may not be mounted at backup time will silently fail. Schedule a daily reminder for yourself if you've picked a flaky destination, or use iCloud which handles mount-state transparently.

---

## 9.3 — Configuration backup

> 🚧 **V1.x roadmap**: a dedicated **Configuration Backup** tool is planned but not yet shipped. It'll bundle scores, rules, settings, source overrides, and (with opt-in) tokens into a single `.tempo-config-backup` file with restore preview and atomic apply. See `CONFIG_BACKUP_DESIGN_2026_05_04.md` in the project for the design proposal.

Until that ships, the V1 path for configuration backup is **manual**: copy the relevant files alongside your `.tempobackup` bundles.

### Manual configuration backup

The pieces that aren't in the V1 database backup, in order of how often they change:

```bash
# Scores you've edited (and added, if any)
cp -R ~/Library/Application\ Support/Tempo/Scores ~/iCloud\ Drive/Tempo/Backups/

# Preferences (auto-rules, source overrides, theme, heatmap colours)
cp ~/Library/Preferences/app.tempo.tempo.plist ~/iCloud\ Drive/Tempo/Backups/

# Custom themes (V1.1+ when added)
cp -R ~/Library/Application\ Support/Tempo/Themes ~/iCloud\ Drive/Tempo/Backups/

# Custom sounds (V1.x when added)
cp -R ~/Library/Application\ Support/Tempo/Sounds ~/iCloud\ Drive/Tempo/Backups/
```

In practice, a weekly cron or a Hazel rule that mirrors `~/Library/Application Support/Tempo/` (minus `Tempo.sqlite`, minus `Logs/`, minus `audit.log`) into your iCloud backup folder is enough.

### What changes how often

- **Scores** change when you edit them — typically once after install (during initial setup), then occasionally (a new use case, a rule tweak). Re-backup after every editing session
- **Preferences** change with every Settings change — mostly stabilises after initial setup
- **Themes / sounds** are stable once installed
- **Tokens** (Keychain) — you set them once when configuring sources; rarely changes after that

### What about the `.tempobackup` bundle's preferences subset?

The V1 database backup *does* include preferences (UserDefaults). So if you're using the automated `.tempobackup`, your auto-rules and source overrides are already covered. The manual step is mostly about scores (the V1 backup *also* includes scores in the bundle, so technically the manual approach above is redundant for those two — see below).

[NEEDS REVIEW: re-read SettingsView.swift backup-now logic to confirm scores ARE included in `.tempobackup` bundle. Earlier reading said yes — "Scores folder" — but verify. If yes, this section can be much shorter. If no, the manual cp is genuinely required.]

Either way: a folder of bundle files (DB + scores + preferences) plus your Keychain tokens recreated by hand is the V1 baseline.

---

## 9.4 — Restoring on a new Mac

The path from "blank Mac" to "Tempo running with your old setup":

### Step 1 — Install Tempo

Download the same DMG you'd use on any new install: `downloads.tempoapp.app`. Drag to Applications. Open Tempo and grant the calendar/reminders permissions when prompted.

At this point you have a Tempo running with empty database, default scores, no custom rules.

### Step 2 — Locate your most recent backup

Two paths depending on how you backed up:

**If your destination is iCloud Drive** — open `iCloud Drive/Tempo/Backups/` (or whatever subfolder you used). The latest bundle should already be there once iCloud has synced.

**If your destination is a local folder or external drive** — copy the bundle onto the new Mac via USB, AirDrop, network share, whatever's convenient.

### Step 3 — Restore

[NEEDS REVIEW: confirm exact restore UI flow in V1. The design proposal describes a Restore button + preview sheet + atomic apply, but check whether V1 ships:
- A Restore button in Settings → Maintenance → Database, OR
- Drag-drop bundle on the Tempo app icon, OR
- Manual unzip + place files

If V1 ships only manual restore, document that.]

Likely flow:

1. **Settings → Maintenance → Database → Restore from backup…**
2. File picker — select the `.tempobackup` file
3. Preview shows what's about to be replaced (current state vs backup state, summary)
4. Click **Restore**
5. Tempo applies the bundle atomically and prompts to restart

After restart, Tempo opens with your old database, your scores, your preferences. The source panel should look the way it did on the old Mac.

### Step 4 — Recreate ingestion tokens

Tokens were excluded from the backup. To recreate:

1. **Settings → Ingestion → Tokens → + Add token**
2. For each token you had on the old Mac, create a fresh one with the same name and provider binding
3. Update each upstream source (Kopia, UniFi, Home Assistant, etc.) to use the new token value

> 🛠 **Tip**: keep a list of which sources use which token names somewhere outside Tempo (Notes.app, a file in your password manager). Token names are descriptive ("Kopia NAS", "GitHub Actions relay"); a list of names is enough to systematically recreate everything without forgetting a source.

### Step 5 — Verify

Walk through your sources one at a time:

- Open the source's row in the source panel — does it show the right colour and display name?
- Trigger an event (run a backup, click a test in Uptime Kuma, send a curl)
- Confirm the event arrives in the timeline with the right severity, label, actions

If something looks off, [§12.3 — A score isn't appearing](/docs/12-troubleshooting#123-a-score-isnt-appearing) covers the common failure modes after a restore.

---

## 9.5 — Verifying a backup

A backup is only as good as your confidence that it'll actually restore. A few sanity checks worth running periodically:

### File-level checks

A `.tempobackup` bundle is a zip with a known structure. You can inspect it from Terminal:

```bash
unzip -l tempo-backup-YYYYMMDD-HHmmss.tempobackup
```

Expected contents:

- A `manifest.json` describing what's in the bundle
- `database.sqlite` — the events database
- `preferences.plist` — your UserDefaults
- `Scores/` — directory with your score JSON files

[NEEDS REVIEW: confirm exact bundle structure vs the design proposal vs what V1 actually ships. Likely close to the proposed shape but verify.]

### Restore-test procedure

The single most reliable way to know your backup works is to actually restore it. The lightest-weight version:

1. Take a manual backup with **Backup now**
2. On the same Mac, grab a copy of the bundle and put it somewhere safe
3. (Optionally) Restore the bundle right back over the live state — the result should be identical, since the bundle was just taken
4. Confirm the timeline still looks right after the restore

For a more thorough test, restore on a different Mac (or a fresh user account) and confirm it works there. This is exactly the new-Mac migration flow above; running it once a year as a fire-drill is good hygiene.

### Health indicators

A few signs that suggest a backup is healthy:

- **Bundle file size** is consistent with previous backups for the same Mac (a sudden 10× drop is a red flag — something probably failed silently)
- **The retention policy is rotating files correctly** — `ls -lat` on the backup folder should show fresh bundles being created and old ones being pruned according to the **Keep last** setting
- **No errors in the Console.app log** filtered by subsystem `app.tempo.tempo` around the backup time

---

## A note on what *not* to back up to

Tempo's backup is for *your* data. It's not designed to:

- **Sync state between two running Macs** — backup → restore is a one-way flow at a moment in time. Don't restore the same bundle on a second Mac that's also running Tempo unless you're prepared for both Macs to drift independently after that
- **Roll back to a previous date** as a routine workflow — restore is for migration and disaster recovery, not "let me undo yesterday's edits". For experimental score editing, use the Score Editor's **Discard** and **Reset to bundled defaults** instead
- **Replace versioned source control for scores** — if you're maintaining custom scores and want history, put your `~/Library/Application Support/Tempo/Scores/` directory under git. Tempo's backup gives you point-in-time bundles; git gives you per-edit history

---

## Where to go from here

- **Adjusting backup cadence and destination** → [§8.4 — Maintenance](/docs/08-settings-reference#84-maintenance)
- **Recreating ingestion tokens after a migration** → [§8.2 — Ingestion and tokens](/docs/08-settings-reference#82-ingestion-and-tokens)
- **Understanding what's stored where** → §9.1 above
- **Troubleshooting after a restore** → [§12 — Troubleshooting](/docs/12-troubleshooting)
