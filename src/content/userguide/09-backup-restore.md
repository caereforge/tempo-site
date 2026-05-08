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

> 💡 **Note**: V1 ships with a unified `.tempobackup` bundle that captures both your event database **and** your configuration (edited scores, auto-rules, source overrides, curated preferences). The same bundle restores both halves atomically. This chapter walks through the bundle layout, how to schedule and trigger backups, and how to restore on a new Mac.

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

- **Preferences**: `~/Library/Preferences/app.tempoapp.Tempo.plist` (UserDefaults — auto-ack rules, auto-dismiss rules, source colour overrides, hidden source list, theme choice, heatmap colours, etc.)
- **Ingestion tokens**: macOS Keychain, under the service name `app.tempoapp.Tempo` (account `providerTokens.v1`). Tokens you've explicitly saved via the **Save in Keychain** button live under a separate service `app.tempo.tempo.publictoken`, one entry per token name.

The events database is the heaviest item (typically a few MB to a few hundred MB depending on how long you've been running Tempo and how chatty your sources are). Everything else is tiny — scores are kilobytes each, preferences are a single plist.

### What's *not* in `~/Library/Application Support/Tempo/`

- The Tempo application itself (`/Applications/Tempo.app`) — comes from the DMG, not user data
- Any data your sources own (Calendar.app's database, Reminders.app's database, Kopia's repo data) — Tempo *reads* these via system frameworks, it doesn't *store* them
- Anything sent in by webhooks (the events themselves are stored in `Tempo.sqlite`, not the raw webhook bodies)

---

## 9.2 — Database backup

The Database backup lives in **Settings → Maintenance → Database**. It's the V1 automated path.

### What's in a backup bundle

Each backup is a `.tempobackup` bundle (a zip with a custom extension) carrying a versioned `manifest.json` plus:

- The **SQLite database** as a `VACUUM INTO` snapshot (`database.sqlite`) — safe to take while Tempo is running
- A **curated slice of your preferences** (`settings.json`) — appearance and heatmap colours, agenda settings, retention windows for events and Protect thumbnails, backup intervals and destination, ingestion server configuration (port, loopback-only flag), app icon variant. The full allowlist is enumerated in `BundleManifest.swift` for the technically curious — keys not on it are excluded by design
- **Rule blobs** under `rules/` — auto-ack thresholds (global + per-source overrides), auto-dismiss policies, liveness thresholds (global + per-source overrides), hidden-sources list, source-level colour and name overrides, source aliases
- The **`Scores/` folder** verbatim — every JSON in `~/Library/Application Support/Tempo/Scores/`, both bundled scores you may have edited and any custom scores you've authored

Bundle file name: `tempo-backup-YYYYMMDD-HHmmss.tempobackup`

### What's *not* in a backup bundle

- **Ingestion tokens** — handled separately via the Keychain. See the next sub-section
- **Custom themes and sound packs** — these aren't a V1 feature; drop-in folders for both ship in V1.1+. When they land, they'll be backed up alongside scores
- **Logs** — diagnostic-only, not configuration
- **Audit log** — forensic record of ingestion attempts; restoring it on a new Mac would be misleading (different machine, different history)

### Tokens are deliberately not in the backup

Ingestion tokens — both their values *and* their names — are never written to the backup bundle. The list of token names alone reveals which services your Mac talks to (Kopia, UniFi, GitHub Actions, …), which is sensitive infrastructure metadata; the values themselves are credentials. Both belong in the macOS Keychain, not in a file on a backup drive.

If you want your tokens to survive a Mac swap, the path is **Settings → Ingestion**, click the **Save in Keychain** button on each token you care about. That mirrors the token to a per-token Keychain item with `kSecAttrSynchronizable=true`, which iCloud Keychain replicates to your other Macs. On a fresh Mac, after iCloud Keychain has synced (give it a minute), the tokens are reachable from the Keychain Access app under service names starting with `app.tempoapp.tempo.token.`.

A V1.1+ panel will let you re-import these synced Keychain entries back into Tempo automatically. For V1, the import is manual — see [§9.4 — Step 4](#step-4--recreate-or-import-your-ingestion-tokens) below for the procedure.

> 🛑 **Critical**: this exclusion is a security feature, not an oversight. If a backup bundle could be exfiltrated and contained your tokens, an attacker could ingest events posing as your sources, or worse — read your sources' identity surface. Keep tokens in the Keychain (encrypted, sandboxed, optionally synced via iCloud), keep backup bundles for the rest.

### How to take a backup

In **Settings → Maintenance → Database**:

1. **Backup interval** picker — Off, every 6h, every 12h, every 18h, every 24h, every 2 days, every 7 days, or every 30 days
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

Configuration is **already inside the `.tempobackup` bundle** the V1 backup tool produces — scores, curated settings, rule blobs, and source overrides all ride alongside the database (see §9.2 for the full inventory). You don't need a separate manual step for the V1 launch set; one bundle covers both database and configuration.

### When manual mirroring still makes sense

Two cases where copying files alongside the bundle is useful:

- **Custom themes and sound packs** (V1.1+) — once these features ship, drop-in folders (`~/Library/Application Support/Tempo/Themes/`, `~/Library/Application Support/Tempo/Sounds/`) can be mirrored manually until they're folded into the bundle
- **Out-of-band copies** for paranoia — a weekly cron or a Hazel rule that mirrors the entire `~/Library/Application Support/Tempo/` folder (minus `Tempo.sqlite`, `Logs/`, and `audit.log`) into a separate destination is a fine "belt and braces" approach if you want a flat-file copy distinct from the `.tempobackup` zip

```bash
# Snippet for the out-of-band copy approach
rsync -a --exclude='Tempo.sqlite*' --exclude='Logs/' --exclude='audit.log' \
  ~/Library/Application\ Support/Tempo/ \
  ~/iCloud\ Drive/Tempo/Mirror/
```

The bundle remains the canonical, atomic, restore-preview-aware path. The mirror is supplementary.

### What changes how often

- **Scores** change when you edit them — typically once after install (during initial setup), then occasionally (a new use case, a rule tweak). Re-backup after every editing session
- **Preferences** change with every Settings change — mostly stabilises after initial setup
- **Themes / sounds** are stable once installed
- **Tokens** (Keychain) — you set them once when configuring sources; rarely changes after that

### What's already in the `.tempobackup` bundle

The V1 bundle covers all four categories above (scores, curated preferences, rule blobs, and the database). Your auto-rules, source overrides, scores, and source colour customisations all ride inside the bundle and restore atomically. The only manual piece left is the Keychain tokens.

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

1. **Settings → Maintenance → Database → Restore from backup…**
2. A file picker opens, scoped to `.tempobackup` bundles
3. Tempo previews what's about to be replaced (current state vs. backup state, summary of database row counts and configuration deltas)
4. Click **Restore** to apply
5. Tempo writes a small `PreRestore-<timestamp>.tempobackup` snapshot of your current state next to the bundles (an "undo last restore" safety net), then applies the bundle atomically and relaunches itself

After relaunch, Tempo opens with your old database, your scores, and your curated preferences in place. The source panel should look the way it did on the old Mac.

### Step 4 — Recreate (or import) your ingestion tokens

Tokens didn't ride the backup bundle (see §9.2). Two paths to bring them onto the new Mac:

#### A — You used "Save in Keychain" with iCloud Keychain sync enabled (recommended)

1. Wait a minute or two after the new Mac signs into your Apple ID — iCloud Keychain needs time to replicate
2. Open **Keychain Access** (Spotlight → "Keychain Access")
3. Filter the list to entries whose service starts with `app.tempoapp.tempo.token.`
4. For each entry: double-click → tick **Show password** (Touch ID / login password prompt) → copy the value
5. In Tempo, **Settings → Ingestion → + Add token**: paste the value, set the same name as the source Mac, and bind it to the same `providerIdentifier` it had there (Keychain Access shows the binding in the entry's account field)

A V1.1+ release will collapse this into a single **Import from Keychain** button so the manual copy/paste loop goes away.

#### B — You didn't save tokens to Keychain

The original token values are gone with the source Mac. Generate fresh tokens in **Settings → Ingestion → + Add token**, then update each upstream sender (Kopia, UniFi, Home Assistant, …) with the new values. Tedious, but correct: a Mac migration is also a perfectly fine moment to rotate tokens you no longer fully trust or to drop tokens for sources you no longer use.

> 🛠 **Tip**: regardless of which path you used last time, keep a list of which sources use which token names somewhere outside Tempo (Notes.app, a file in your password manager). Token names are descriptive ("Kopia NAS", "GitHub Actions relay"); a list of names is enough to systematically recreate everything without forgetting a source.

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

- `manifest.json` — version + inventory of what's in the bundle
- `database.sqlite` — VACUUM INTO snapshot of the events database
- `settings.json` — curated allowlist of UserDefaults keys
- `rules/` — auto-ack thresholds, auto-dismiss policies, liveness thresholds, hidden-sources list, source-level overrides
- `Scores/` — directory with your bundled and customised score JSON files

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
- **No errors in the Console.app log** filtered by subsystem `app.tempoapp.Tempo` around the backup time

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
