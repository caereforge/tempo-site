---
title: "Settings reference"
description: "Reference for every option in Tempo's Settings window across the seven tabs: Interface, Agenda, Ingestion, Security, Notifications, Maintenance, and Help."
chapter: 8
order: 8
draft: false
pubDate: 2026-05-05
---
# 8 - Settings reference

Tempo's Settings window has seven tabs: **Interface**, **Agenda**, **Ingestion**, **Security**, **Notifications**, **Maintenance**, **Help**. This chapter walks each tab section by section, explaining what every control does and when you'd use it.

Open Settings via **Cmd-,** or via the menubar icon → **Settings…**.

---

## 8.1 - Interface

The Interface tab covers visual preferences: app icon, theme, startup, the system stats footer, badge contrast, and heatmap rendering.

### App icon

- **App icon**: pick the Dock and window icon from the bundled set.

### Theme

- **Theme**: System / Light / Dark / Caereforge

Mirrors the theme submenu in Tempo's menubar icon. Available here too because on macOS 26 you can hide the menubar icon entirely; in that case the Interface tab is your only switch.

### Startup

- **Launch Tempo at login**: when enabled, macOS starts Tempo automatically when you log in

This wires up `SMAppService`. You can also manage it from **System Settings → General → Login Items**, where Tempo will appear in the list of apps that start at login.

### Labs

- **Log-line font size**: a slider from 9 to 14 pt (default 12 pt) controlling the size of the timeline log-line text
- **Dim acknowledged rows**: when enabled, acknowledged events dim to 70% opacity (the ACK badge stays visible). Dismissed events are always dimmed regardless. Off by default
- **Symbolic severity indicators**: replaces the severity color dot with shaped symbols (triangle for warning, octagon for critical, and so on) for users who find color alone hard to distinguish. Off by default

### Footer

- **Show system stats footer**: toggles the compact bar at the bottom of the main window showing CPU, memory, disk, and network usage of this Mac

On by default. The footer is a single thin row of meters and runs at low CPU cost.

### Appearance

- **Contrast-aware badges**: when enabled, status pills (OVERDUE, COMPLETED, Backup OK) swap to a contrasting hue if they'd otherwise blend into the source color. On by default

Use case: you've colored a source bright yellow, and a yellow `WARNING` pill on a yellow card is illegible. Contrast-aware badges detect the collision and shift the pill color to keep both readable. Turn off if you prefer strict semantic colors regardless.

- **Activity heatmap style**:
  - **Rounded pills** (default): adds color around events in neighboring empty hours
  - **Flat cells**: keeps each hour strictly independent

- **Heatmap colors**: three pickers, one per semantic family:
  - **Heatmap · Info**: covers regular events
  - **Heatmap · Warning**: covers warning- and error-level events
  - **Heatmap · Critical**: covers critical events (and hours dominated by errors)

A **Reset heatmap colors** link restores the defaults, which are tuned to be legible in both light and dark modes; override only if you have a strong preference.

### Accessibility

- **Colorblind mode for activity heatmap**: adds a vertical-fill encoding to the 24h heatmap (taller fill = more severe), so severity reads even when colors don't

> 💡 **Note**: this and the **Symbolic severity indicators** toggle (under Labs) are the colorblind affordances in V1. A wider audit (event-card severity coloring, source-row badges, action-panel pills) is on the V1.x roadmap.

---

## 8.2 - Agenda

The Agenda tab controls what Tempo reads from Apple Calendar and Reminders (via EventKit) to populate the agenda panel.

### Agenda Panel

- **Show personal agenda**: when off, Tempo doesn't show calendar entries or reminders in the timeline at all, so you're using Tempo for monitoring/webhook events only. The toggle is disabled (and forced off) when nothing is selected in the Sources section below

The same toggle is mirrored in the menubar icon's **View → Show personal agenda** submenu, so you can flip it without opening Settings.

### Sources

- **Calendars**: a dropdown showing "N of M selected" (or "All", or "None"); open it to tick the calendars whose events should appear in Tempo
- **Reminder lists**: same shape, for Reminders lists

Tempo only reads from selected calendars and reminder lists. New calendars or lists added to your system stay hidden until you enable them here. Unticked calendars are still visible in Calendar.app, just not in Tempo.

### CalDAV (experimental)

This section appears only when at least one CalDAV provider is configured. CalDAV sync is experimental and configured by file: an **Open external-providers.json** button opens the config, where you choose which providers and calendars Tempo syncs. Changes apply within about 30 seconds.

### Locations

- **Default maps provider**: Apple Maps or Google Maps. When a calendar event has a location that isn't already a URL, Tempo offers a one-click action to open it in your chosen maps app. Switching here applies to all future events.

### EventKit-mediated state

Calendar and reminder data flows through Apple's EventKit framework. A few caveats worth knowing:

- **Updates are notification-driven**: when you mark a reminder done in Reminders.app, Tempo updates within a second via the EventKit notification. Most of the time this is invisible; occasionally EventKit doesn't notify for a particular kind of change, and Tempo's view stays a few minutes stale until the next periodic refresh
- **iCloud sync delays compound**: if your reminders sync from another device via iCloud, EventKit waits for the iCloud sync before notifying Tempo. A reminder you complete on iPhone might take 10-30 seconds to reflect in Tempo, depending on iCloud's batch interval
- **Edge cases with task manager bridges**: if you use a task manager (Todoist, OmniFocus, Things, TickTick) that syncs to a calendar app via iCal subscription, Tempo reflects only what EventKit sees. Latency depends on the subscription refresh frequency and the task manager's export cadence

For a more thorough discussion, see [§12.2 - Apple Calendar sync issues](/docs/12-troubleshooting#122---apple-calendar-sync-issues) and [§10.1 - Apple Calendar and Reminders](/docs/10-sources-reference#101---apple-calendar-and-reminders).

---

## 8.3 - Ingestion and tokens

The Ingestion tab is where you configure the HTTP server that receives events from external sources.

### Network

- **Endpoint**: shows the URL senders should post to (`http://<this-mac-ip>:7776`, or `http://127.0.0.1:7776` in loopback-only mode)
- **Listen on port**: the TCP port Tempo's ingestion server binds to. Default `7776`. Valid range 1024-65535. Changes require a Tempo restart to take effect (the active port is shown until restart)
- **Limit to loopback only**: when enabled, only `localhost` (this Mac) can reach the ingestion endpoint. Off by default, so Tempo binds `0.0.0.0` and other machines on your LAN can post events

The default (LAN-reachable) is intentional. Most homelab users have monitoring tools running on dedicated hardware (NAS, Raspberry Pi, dedicated server) that need to send events to Tempo on the Mac. Loopback-only would make Tempo useless for that wedge.

If you don't have any external sources and just want Tempo for Apple Calendar + Reminders + the occasional curl test, loopback-only is fine.

> 🛑 **Critical**: Tempo's ingestion server uses **per-provider tokens** for authentication, not a shared secret. Every external sender should have its own token, bound to the providerIdentifier it sends as. If a token leaks (a script's GitHub repo accidentally pushed it, a NAS got compromised), delete just that token without affecting other senders. See the Tokens section below.

### Secure (TLS)

The **Accept encrypted connections (TLS)** toggle opens a second, encrypted listener next to the plain port. It is **off by default**.

- **TLS port**: `8776` by default (the plain port + 1000; configurable, same 1024-65535 range). The TLS listener runs **alongside** the plain `7776`, not instead of it, so a mixed fleet (some senders speak HTTPS, some don't) keeps working while you migrate. It must differ from the plain port
- The certificate is **self-signed** and generated on first enable. Download and manage it in **Settings → Security → TLS certificate** (see §8.4)

### Tokens

The Tokens section lists every active ingestion token. Each row shows:

- **Token name** (something descriptive, like "Kopia NAS" or "check_disk script")
- **Bound provider**: the `providerIdentifier` this token is allowed to send as, or "⚠ Not bound: authorizes nothing" for a legacy unbound token
- **Last used** (or "Never used")
- **Masked token value** (first 8 / last 4 characters) with a **Copy** button
- **Save in Keychain** button: stores the token as a user-visible Keychain entry. With iCloud Keychain enabled, the saved token also syncs to your other Macs
- **Allowed source IPs**: a collapsible per-token IP allowlist (exact IPs or CIDR blocks). Empty means any source IP may post as this token
- **Require TLS for this provider**: a per-token toggle (the padlock). When on, this provider's POSTs are accepted only on the TLS listener; a plain-port attempt is rejected with an opaque 401 and logged in the Security Audit
- **Action menu (⋯)**: Rename…, Rotate, Delete

#### Adding a token

The **Add Token** button opens a sheet. Both fields are required:

- **Name**: descriptive label, e.g., "Kopia NAS" or "check_disk script"
- **Provider identifier**: a `providerIdentifier` like `com.kopia` or `scripts.shell`. The token accepts events for this provider and any sub-namespace (e.g. `scripts.shell` also accepts `scripts.shell.check_disk`) and rejects any payload declaring a different provider

Binding is mandatory: an unbound token authorizes nothing. Because a token is bound to one provider, leaking one script's token can't spoof your other sources.

#### The X-Tempo-Token header

Every POST to `/ingest` must include the token in the `X-Tempo-Token` header:

```
POST /ingest HTTP/1.1
Content-Type: application/json
X-Tempo-Token: <your-token-here>

{ ... }
```

Tokens are stored in your macOS Keychain (not on disk in cleartext). Tempo retrieves them at server startup; rotating a token in Settings updates the Keychain entry and forces re-authentication on the next request.

> ⚠️ **Warning**: delete a token that you're not using. Idle tokens are still valid; an attacker who finds one (in an old commit, in a leaked backup, in a screenshot you posted to a forum) can still hit your Tempo instance with it. Tokens cost nothing to delete; deleting a stale one is the single best housekeeping action you can take.

#### Audit log

Every ingestion attempt, accepted or rejected, is logged via Apple's unified logging system (`os.Logger`). Filter by subsystem `app.tempoapp.Tempo` in **Console.app** to see the trail. The log captures:

- Timestamp
- Source IP
- Token name (never the value)
- Provider identifier
- Accept / reject result, with reason on rejection (invalid token, malformed JSON, rate-limited, etc.)

Useful for diagnosing "why didn't my event arrive?" See [§12.3 - A score isn't appearing](/docs/12-troubleshooting#123---a-score-isnt-appearing).

In V1 the audit log is not exposed inside the Ingestion tab itself. To inspect it live, open **Console.app** and filter by subsystem `app.tempoapp.Tempo`. To share it with support, use **Help → Export diagnostics bundle…**: the bundle includes the last 24 hours of OSLog output (no token values, no payload contents).

---

## 8.4 - Security

The Security tab sets the server-wide posture for who can reach Tempo, and manages the TLS certificate.

### Network access

- **Only accept events from trusted networks**: when on (the default), Tempo refuses any source outside the ranges below, at the application layer, independent of your firewall. This keeps an accidentally internet-exposed host (for example a public IPv6) protected. Turn it off only if you deliberately rely on your network firewall instead

### Trusted networks

A list of allowed address ranges (exact addresses or CIDR blocks), with **Add**, a per-row remove button, and **Reset to defaults**.

The defaults cover private, loopback, link-local, ULA, and Tailscale ranges, so Tempo works out of the box on a flat LAN. Narrow it to specific subnets if you segment with VLANs, or widen it for an unusual internal range. This defends against the public internet, not a compromised device already inside a trusted range.

### Audit

- **Open Security Audit**: opens the audit window listing every rejected request

If any requests reached Tempo from outside your local network, an exposure warning appears here noting that your host may be reachable from the internet.

### TLS certificate

When the TLS listener is off, this section explains how to enable it (the **Accept encrypted connections (TLS)** toggle in the Ingestion tab). When on, Tempo shows the certificate's details:

- **Covers**: the subject alternative names the certificate is valid for
- **Expires**: the expiry date, with a warning **60 days** before it lapses
- **SHA-256**: the certificate fingerprint

Three buttons manage the certificate:

- **Download certificate…**: saves a `tempo-cert.pem` byte-identical to what Tempo serves. A sender pins it with `curl --cacert <file>` (or a CA file in a library's TLS context) to encrypt and verify, or skips verification (encrypt only) when pinning is impractical
- **Regenerate**: mints a new certificate and removes the old one. Every sender that pinned the current certificate must be updated with the new one
- **Remove**: deletes the certificate and its private key from the Keychain and turns off the TLS listener

Loading your own certificate in place of the self-signed one is planned for a later 1.x update. See the [security page](/security/#tls) for the threat-model reasoning.

---

## 8.5 - Notifications

The Notifications tab controls the dock badge counter and the per-source chime.

### Global

- **Enable sounds**: a master switch for the per-source sound checkboxes. When off, no source plays a sound regardless of its own checkbox; individual choices are preserved

### Per source

A table with two checkboxes per source row, **Badge** and **Sound**:

- **Badge** (default on): this source's needs-attention events (high severity, not yet acked or dismissed) count toward the dock icon counter. That includes a non-firing event a score has marked critical, not just outages
- **Sound** (default off): a single macOS "Glass" chime plays when a new event arrives from this source. Opt in only for sources where an audible cue matters

A toggle on a parent source (e.g. *Scripts*) cascades to its children unless a child has its own explicit override. Agenda sources (calendar, reminders) aren't listed: they don't push events in real time, so neither a badge nor a sound applies to them.

---

## 8.6 - Maintenance

The Maintenance tab is the umbrella for housekeeping behaviors: rules that fire on a schedule (auto-ack, auto-dismiss), the source liveness threshold, and the database (retention, feed window, image retention, backups).

A segmented picker at the top of the tab switches between four sub-sections: **Auto-ack**, **Auto-dismiss**, **Liveness**, **Database**.

### Auto-ack

Auto-ack rules automatically acknowledge events older than a configurable threshold. The badge stops flagging them, but they stay in the feed until dismissed (manually or by an auto-dismiss rule). Set ack faster than dismiss for the smoothest flow.

#### Global defaults (per severity)

Five rows, one per severity, each with a threshold picker:

- **Info**: default **6 hours**
- **OK**: default **6 hours**
- **Warning**: default **24 hours** (one full day, covering an overnight cycle)
- **Error**: default **Never** (real incidents stay loud until you acknowledge them)
- **Critical**: default **Never**

The threshold options on each picker are: **Never, 1 hour, 6 hours, 12 hours, 1 day, 3 days, 7 days**.

#### Per-source overrides

Below the global defaults, a list of sources Tempo has seen, each with an "Edit" button to override the globals for just that source. Useful when one source produces info-noise (Kopia "No Change" results) you want cleared faster than info events from a chattier source.

Sources without an explicit override use the globals.

> 💡 For per-event ack rules based on the event's metadata (e.g. "ack Protect events where type=animal but not type=person"), see **Score Editor → Ack and dismiss**.

### Auto-dismiss

Same shape as Auto-ack, but instead of acking, the rule **dismisses** the event after the threshold, removing it from the active feed entirely (still in the database, still in source history).

Auto-dismiss rules run hourly. Dismissed events stay in the database (subject to the retention policy in the Database tab); they just drop off the live timeline so you don't have to keep dismissing stale rows manually.

#### Per-source rules

The Auto-dismiss tab is per-source by default: each source has its own enable/threshold setting. There's no global default for auto-dismiss; you opt in per source as you decide it's worth it. Threshold options are **1 hour, 4 hours, 8 hours, 12 hours, 1 day, 3 days, 7 days**.

### Liveness

The Liveness tab sets the threshold below which a source's bolt indicator stays lit. A source is "live" if it has emitted any event within the threshold; silent for longer, the bolt disappears and the badge drops to outline-only or vanishes.

#### Global default

- **Default threshold**: defaults to **24 hours**

Short enough to spot a quiet monitor within a day, long enough not to alarm on any source that ticks daily or weekly.

- **Show activity on healthy sources**: when on, a healthy, live source shows small VU-style ticks of how many events it emitted within its liveness window (vitality, not severity). The ticks are log-scaled and deliberately neutral, so the red/yellow badges still stand out. Off by default

#### Per-source overrides

Same pattern as auto-ack: a list of sources with Edit buttons. Override the default for sources whose tempo isn't "about a day."

- High-frequency sensor pinging every hour → 1h, so silence shows up fast
- Weekly Kopia snapshot → 7d, so the bolt doesn't disappear between runs
- Hourly cron job → 2h, so a missed run is visible

### Database

The Database tab covers permanent retention, the in-memory feed window, image retention, and app backups.

#### Retention

- **Keep events for**: picker with options **Forever** (default), 30 days, 90 days, 6 months, 1 year, 2 years

Permanently deletes older events from the database on app launch and when the setting changes. Default keeps everything.

> 💡 **Note**: the [source history view](/docs/14-glossary#source-history-view) (the GitHub-style 84-day grid you reach from a source's menu) visualizes the last 84 days. Setting retention shorter than 84 days will leave the corresponding tiles permanently empty; historical activity outside the retention window can't be reconstructed. Dismissed events keep contributing to the history view until they fall out of retention.

For most users, **Forever** is the right choice. Tempo's database is small (most events are a few hundred bytes) and disk space is cheap. Pick a window only if your timeline grows large enough to feel slow (millions of events) or you have policy reasons to limit retention.

#### Live feed window

- **Show recent events for**: how many days of recent history the live feed keeps in memory
- **Cap per day**: an upper bound on events held in memory per day

This only bounds what's resident in memory, never what's stored or counted. Older events load as you scroll and stay searchable, and anything still firing stays in the feed regardless of age, so the dock badge never misses an open alert. A shorter window keeps the app responsive on a busy feed; the per-day cap protects weaker machines when a single day floods with events.

#### Image retention

- **Keep thumbnails for**: how long Tempo keeps inline images that some tools (such as UniFi Protect) attach to their events. Default **1 day**; options run to **Forever**
- **Currently stored**: a read-only readout of how many thumbnails and how much disk the cache currently holds

When the window passes, Tempo strips the image but keeps the rest of the event (timestamp, device ID, alarm name, eventLink) until the general retention policy sweeps it away. Your tool's own dashboard remains the canonical archive for older clips, reachable from each event via its "Open in" action.

#### App backup

- **Backup interval**: picker with **Disabled, Every 6 hours, Every 12 hours, Every 18 hours, Every 24 hours, Every 2 days, Every 7 days, Every 30 days** (default Disabled)
- **Destination**: the chosen backup directory, with a **Choose…** button
- **Keep last**: a stepper (1-100) for how many backup bundles to retain (older ones are pruned)
- **Backup now**: runs an on-demand backup immediately, independent of the schedule
- **Reveal in Finder**: opens the destination folder
- **Restore from backup…**: opens a `.tempobackup` bundle, previews its contents, and applies it with a relaunch

Each backup is a **`.tempobackup` bundle** with a versioned manifest containing:

- The SQLite database (as a `VACUUM INTO` snapshot, safe to take while Tempo is active)
- A curated slice of your settings
- The rule blobs (auto-ack, auto-dismiss, liveness, source overrides)
- The `Scores/` folder (your customized and bundled scores)

Bundles are named `tempo-backup-YYYYMMDD-HHmmss.tempobackup` and pruned beyond the retain count.

> 🛑 **Critical**: ingestion tokens are stored in the macOS Keychain and are **never written to the backup bundle** (neither the values nor the names). When you restore on a new Mac, you'll need to recreate or re-install your ingestion tokens manually. Everything else (events, settings, scores, source colors, auto-rules) is in the bundle and restores automatically.

The recommended destination is **iCloud Drive**: sync is transparent, backups land on every device that's signed into the same iCloud account. Local paths or mounted remote filesystems work too; Tempo writes to the path you give it.

#### Restore from backup

The **Restore from backup…** button opens a file picker scoped to `.tempobackup` bundles, previews what's inside, and applies the bundle atomically with a relaunch. A pre-restore snapshot of your current state is saved before anything is overwritten. Detailed walkthrough in [§9.4 - Restore from a backup](/docs/09-backup-restore#94---restoring-on-a-new-mac).

---

## 8.7 - Help

The Help tab handles two support tasks: explain the source-panel badge legend in detail, and let you export a diagnostic bundle.

### Source panel badges

A live legend showing the badge variations (Red, Yellow, Green, Gray, Bolt, Number, Activity meter) with sample swatches and the same descriptive text the source-row tooltips use. Same vocabulary; same in-context cue you'd see from hovering a real badge.

Useful as a printable reference if you want to onboard another household member or a colleague to your Tempo setup.

### Diagnostics

- **Export diagnostics bundle…**: creates a zip with:
  - App version and build number
  - Configuration summary (which sources are connected, retention setting, auto-rule overrides)
  - The last 24 hours of Tempo's OSLog output

The bundle excludes:

- Token values (only token names appear)
- Event payloads (no metadata, no titles)
- Calendar contents

Attach it to a Discord support thread or a GitHub issue when reporting a problem. The whole bundle is usually 50-200 KB.

After export, Tempo offers **Show in Finder** so you can locate the file before sending.

### Where the rest of the support links live

The Settings → Help tab is intentionally narrow: badge legend and diagnostics export. Everything else lives in the **menubar** so it's reachable without opening Settings:

- **Tempo → About Tempo**: version, build, credits
- **Tempo → Check for Updates…**: Sparkle update check
- **Help → Tempo Documentation**: opens [tempoapp.app/docs](https://tempoapp.app/docs/)
- **Help → Community**: opens [tempoapp.app/community](https://tempoapp.app/community/) (Discord invite)
- **Help → Privacy Notice**: opens [tempoapp.app/privacy](https://tempoapp.app/privacy)
- **Help → License & Disclaimer**: opens [tempoapp.app/license](https://tempoapp.app/license)

---

## Where to go from here

- **Backing up properly before a migration** → [§9 - Backup and restore](/docs/09-backup-restore)
- **Tuning a noisy source** → [§7.5 - Stack grouping](/docs/07-score-editor#75---stack-grouping) for grouping; **Auto-ack** in this chapter for severity-aware aging
- **Troubleshooting unexpected behavior** → [§12 - Troubleshooting](/docs/12-troubleshooting)
- **Per-source color and display name overrides** → [§4 - Source panel](/docs/04-source-panel)
