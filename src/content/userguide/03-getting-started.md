---
title: "Getting started"
description: "This chapter takes you from a downloaded DMG to a Mac with Tempo running, ingestion ready to receive events, and a clear picture of what the three panels do."
chapter: 3
order: 3
draft: false
pubDate: 2026-05-05
---
# 3 — Getting started

This chapter takes you from a downloaded DMG to a Mac with Tempo running, ingestion ready to receive events, and a clear picture of what the three panels do. The whole thing should take about ten minutes.

If you're allergic to setup walkthroughs and just want events in the feed, [§1.4 — Tempo in five minutes](/docs/01-introduction#14--tempo-in-five-minutes) is the abbreviated version.

---

## 3.1 — Install Tempo

### Get the DMG

Tempo is distributed as a signed and notarised disk image. Download it from:

- [downloads.tempoapp.app](https://downloads.tempoapp.app) — always the latest release
- [tempoapp.app/changelog](https://tempoapp.app/changelog) — versioned download links if you want a specific release

The DMG is around **7 MB** depending on the release. Verify the SHA-256 checksum against the value published on the changelog page if you'd like an extra integrity check; this is optional but recommended for tools that talk to the rest of your homelab.

### Drag to Applications

Open the downloaded DMG. The volume mounts and shows a single window with two icons: the Tempo app and a shortcut to your Applications folder. Drag Tempo onto Applications.

> 💡 **Note**: don't run Tempo from inside the DMG. macOS will let you, but the app can't update itself from a read-only volume and a few permissions (Calendar, Reminders) get re-prompted every launch because the binary's path keeps changing. Drag to Applications first, then eject the DMG.

After dragging, you can right-click the DMG in Finder → **Eject "Tempo Installer"** (or whatever the volume is named).

### First open and Gatekeeper

The first time you open Tempo, macOS verifies the signature with Apple's notarisation service. This takes a couple of seconds and you'll see the app icon in the Dock with a brief delay before the window appears.

If you downloaded Tempo through a non-default browser or an automation, macOS may show a Gatekeeper dialog asking you to confirm the app comes from an identified developer:

> "Tempo" is an app downloaded from the Internet. Are you sure you want to open it?

Click **Open**. If macOS refuses to open the app entirely (some browsers strip the quarantine attribute in ways that confuse Gatekeeper), open **System Settings → Privacy & Security**, scroll to the "Security" section, and click **Open Anyway** next to the Tempo entry. You'll only need to do this once.

> ⚠️ **Warning**: if a dialog says the app is "damaged and can't be opened", the most common cause is a corrupted download. Re-download the DMG from `downloads.tempoapp.app` rather than trying to bypass the warning. The signature check is what tells you the file you have is the file we shipped.

### Alternative: install via Homebrew

If you manage your Mac stack with Homebrew, you can install Tempo through a public Caereforge tap instead of downloading the DMG manually:

```bash
brew tap caereforge/tap
brew install --cask tempo
```

The cask fetches the exact same signed and notarised DMG from `downloads.tempoapp.app`, verifies its SHA-256, and installs `Tempo.app` into `/Applications` — identical end state to the manual flow above. Drag-to-Applications is handled for you, and the first-open Gatekeeper checks still apply on the next launch.

**Updating**:

Tempo auto-updates via Sparkle by default — same as the DMG flow. New releases are delivered in-app through **Tempo → Check for Updates…** or automatically at the configured interval. If you'd rather drive updates through Homebrew, both options work:

```bash
brew upgrade --cask tempo
```

…fetches the latest cask version and replaces `Tempo.app`. There's no conflict between Sparkle and `brew upgrade` — both point at the same DMG on `downloads.tempoapp.app`. Pick whichever flow fits your routine.

> 💡 **Note**: `brew livecheck` reads Tempo's Sparkle appcast directly, so the cask catches up automatically with each release. You don't need to wait for a separate `brew update` cadence — `brew upgrade --cask tempo` always reflects what's live.

**Uninstalling**:

```bash
brew uninstall --cask tempo
```

…removes `Tempo.app` only. To also clear preferences, scores, the local event database, and caches in one step, add `--zap`:

```bash
brew uninstall --cask --zap tempo
```

The `--zap` flag wipes `~/Library/Application Support/Tempo` (database, scores, configuration), preferences, caches, and saved application state. This is the cleanest reset, equivalent to a fresh install on the next `brew install`.

The tap source is public at [github.com/caereforge/homebrew-tap](https://github.com/caereforge/homebrew-tap) — open an issue there if the cask metadata needs adjusting (description, version, dependencies). For Tempo itself, the usual channels apply: GitHub issues, Discord, or `support@tempoapp.app`.

---

## 3.2 — First launch and permissions

### What you'll see at first

The first time Tempo launches, the main window opens at its default size of 1200×760 pixels. Three panels are visible:

- **Source panel** on the left, mostly empty except for a yellow accent line and a button
- **Event panel** in the centre, also mostly empty
- **Action panel** on the right, showing a placeholder

A clock icon appears in the macOS menubar. That's Tempo's menubar item — it stays there even when the window is closed.

### The ingestion server

Behind the scenes, Tempo also starts its **ingestion server** on first launch. This is a small HTTP server that listens on port `7776` by default, bound to `0.0.0.0` (all interfaces) so other machines on your LAN can reach it. The first time it starts, Tempo generates a default ingestion token and stores it in your macOS Keychain.

You won't see anything in the UI to indicate this — it just runs. To verify it's working, open **Settings → Ingestion**: you'll see the listen address, the active tokens, and a copy-to-clipboard button for each token.

> 💡 **Note**: the ingestion server is what lets external sources (Home Assistant, Uptime Kuma, Kopia, GitHub Actions, custom scripts) send events to Tempo via HTTP POST. It's on by default because Tempo without external sources is essentially a viewer for your day's calendar and reminders — useful, but a fraction of the product. Leaving the server running costs ~a kilobyte of memory and one TCP listen socket; the moment you decide to wire up your first source it just works without revisiting Settings. If you genuinely won't use external sources, you can disable it in [§8.2 — Ingestion and tokens](/docs/08-settings-reference#82-ingestion-and-tokens).

### macOS firewall

If you have **System Settings → Network → Firewall** turned on, macOS may prompt you the first time the ingestion server tries to bind a public-facing port:

> "Do you want the application 'Tempo' to accept incoming network connections?"

Click **Allow**. Without this, only `localhost` (your own Mac) can talk to Tempo's ingestion endpoint, and the rest of your homelab can't reach it.

> ⚠️ **Warning**: if you're testing Tempo and the firewall prompt didn't appear but external sources can't connect, see [§12.1 — Networking](/docs/12-troubleshooting#121-networking-lan-ingestion). Common culprits in order: macOS Application Firewall, Little Snitch / LuLu deny-incoming rules, third-party VPN clients that re-route LAN traffic.

### Network firewall and VLANs

The macOS firewall is only the first hop. The packet still has to travel from the source machine (your NAS, Home Assistant box, monitoring server) to the Mac running Tempo, which means **your network firewall and VLAN configuration matter too**.

If your homelab is on a flat network (everything on one subnet, no VLANs), this section is usually a no-op — once the macOS firewall allows Tempo, traffic flows. If you've segmented your network, read on.

**Common scenario**: your Mac sits on the trusted/admin VLAN, while monitored services live on dedicated VLANs (IoT, servers, cameras, DMZ). Most prosumer routers default-deny inter-VLAN traffic — so without an explicit rule, your Home Assistant on VLAN 40 can't reach your Mac on VLAN 10, and the webhook silently drops.

**What to check on your network gear**:

- **Inter-VLAN routing rule** for the source VLAN → Mac IP, TCP port `7776` (or whatever port you've configured Tempo to listen on). On UniFi: *Settings → Firewall & Security → Firewall Rules → Create New Rule*. On pfSense: *Firewall → Rules → [source VLAN tab] → Add*. On OPNsense: same shape. On consumer routers: look for "Inter-VLAN" or "Network access" in advanced settings
- **Client isolation** on guest WiFi or "IoT-safe" SSIDs — if your source lives on an isolated WiFi, even same-subnet devices can't talk to each other. Disable isolation on that network, or move the source onto a non-isolated SSID
- **mDNS / Bonjour reflection** — `your-mac.local` resolution typically doesn't cross VLANs. Either enable mDNS reflector on your router (UniFi has it; many others do), or use the Mac's LAN IP directly in webhook URLs and pair it with a DHCP reservation so the IP stays stable

Keep firewall rules narrow — specific source IP, specific destination IP, specific port. Tempo's ingestion is token-authenticated, so the firewall isn't your only line of defence, but a tight rule is good hygiene.

> 💡 **Note**: this is only the headline. The full troubleshooting walk-through with five scenarios (Mac-local firewall, VLAN routing, hostname resolution, client isolation, server-not-listening) is in [§12.1 — Networking](/docs/12-troubleshooting#121-networking-lan-ingestion). If first-source setup gets stuck, that's the page to reach for.

### Optional: Calendar and Reminders

If you'd like a glance at your day's calendar entries and reminders inline with the rest of your feed, Tempo can read them from macOS via EventKit. This is a **convenience utility**, not a calendar app — Tempo shows the items, but never edits, creates, or schedules them (the one exception: you can mark a reminder as completed from the action panel). Calendar.app and Reminders.app stay your editor.

On first launch, macOS may prompt you for Calendar and Reminders access. You're free to **decline** — Tempo works without them, the agenda section just stays empty. If you grant access and later decide you'd rather not see calendar in Tempo, three ways to disable it:

- **Quick toggle** — menubar Tempo icon → **View → Show personal agenda** (turns the entire agenda section off in one click)
- **Granular control** — **Settings → Agenda** lets you enable or disable individual calendars and reminder lists, so you can keep work calendars in but mute the personal ones, or vice versa
- **Full revoke** — System Settings → Privacy & Security → Calendar (and Reminders), un-tick Tempo

If you keep it on, your calendar entries and reminders appear as an "Apple Calendar & Reminders" source in the source panel — same shape as any other source, hideable, filterable, and configurable like the rest.

---

## 3.3 — A tour of the three panels

The Tempo window is a fixed three-column layout. Each column is resizable by dragging the divider between them, but you can't reorder them — left is always sources, centre is always the timeline, right is always the action panel. The aim is muscle memory: after a few days, your eyes know where to look without thinking.

### Source panel (left)

The source panel lists every source Tempo knows about. Each row shows:

- A **coloured dot** on the far left — the source's identifying colour, click it to change
- The **source name** — bold or dimmed depending on whether the source is hidden
- A **priority badge** on the right, combining three orthogonal signals:
  - **Colour** — the maximum severity of currently outstanding events from that source (red = error/critical, yellow = warning, green = ok/info, no fill = empty)
  - **Number** — the count of actionable (non-acked, non-dismissed) events
  - **Bolt** ⚡ — appears when the source is currently "live" (emitting events recently); fades when it's been silent past a configurable threshold
- An **info button** (ⓘ) on the far right that opens a menu — Show only this source / Add to filter / Show all sources / Hide from timeline / Show history

Filtering the timeline to one or more sources happens through the info menu (ⓘ) — click it on a source row, then **Show only this source** (or **Add to filter** to combine multiple). A yellow filter banner appears across the top of the event panel listing the active filter; click the banner to clear. The source row itself is not a click target — that's a deliberate choice to keep clicking on the row from feeling like a state change you didn't plan for.

A button at the bottom of the source panel switches the panel into **Manage Sources** mode — a different view where you can add new sources, reorder existing ones, and change source-level settings. The button label adapts to your current source count: "Get started — add a source" with one or two sources, "Add a source" with three or four, "Manage sources" with five or more.

### Event panel (centre)

This is where the timeline lives. Three things are stacked vertically:

1. **Tab selector** at the top — switches the centre panel between **Timeline** (the chronological feed of events, the default view), **Score Editor** (chapter 7) and **Search** (find an event by title, metadata, or source)
2. **Day picker** — a small date control next to the tab selector. Lets you jump to any past day to see what the timeline looked like then
3. **24-hour activity heatmap** — a horizontal strip of 24 segments, one per hour, coloured by the highest-severity event in that hour. Click a segment to scroll the feed to that hour
4. **Event feed** — chronological list of events, with day separators ("TODAY", "YESTERDAY", weekday name for older days), each event rendered as a card

The feed is virtualised, so scrolling stays smooth even with thousands of historical events.

### Action panel (right)

The right column shows context for whatever's currently selected in the event panel:

- **Nothing selected** — placeholder ("Select an event to see actions")
- **One event selected** — header (title + severity meta-text), action buttons (the ones the score declared), metadata table (the full payload as key/value pairs)
- **Multiple events selected** (Cmd-click or Shift-click in the feed) — bulk panel with "Acknowledge all (N)" and "Dismiss all (N)" buttons

Clicking an action button resolves any `${...}` placeholders in the trigger and dispatches the action — opens a URL, runs a Terminal command, or copies a string to your clipboard. The event stays selected so you can fire multiple actions in sequence.

> 🛠 **Tip**: metadata values in the action panel are selectable text — click and drag to highlight a value, then `Cmd-C` to copy. A dedicated copy-on-click affordance is on the V1.1+ roadmap (with an opt-in setting so you don't accidentally copy on every selection click).

---

## 3.4 — Connect your first source

Every source needs a small amount of setup on the *upstream* side — telling Home Assistant or Kopia or your custom script where to send events. (The exception is the optional Apple Calendar / Reminders utility covered in §3.2, which is purely on the Mac side.)

### The general shape

Every source follows the same conceptual pattern:

1. **The upstream tool sends a webhook** to Tempo's ingestion server: `POST http://your-mac.local:7776/ingest`
2. **The request includes a token** for authentication: `X-Tempo-Token: <token>`
3. **The body is JSON** with at least a title, an event type, and a provider identifier
4. **Tempo's ingestion server validates** the token, parses the JSON, runs it through the bundled or user-authored score for that provider, and writes the resulting event to the database
5. **The event appears in the feed** within a second

Bundled scores ship for the providers most homelab users have: Kopia, UniFi, Home Assistant, Uptime Kuma, GitHub Actions, Synology. For each, [§10 — Sources reference](/docs/10-sources-reference) has a per-source setup section: where to point the webhook in the upstream tool, what payload fields the score expects, what to expect in the timeline.

### A two-minute test before connecting anything real

Before you set up your first real source, it's worth confirming Tempo's ingestion path actually works on your Mac. The `curl` command below sends a fake event to your local Tempo, no upstream tools involved:

```bash
# Replace <token> with the token from Settings → Ingestion (click the
# clipboard icon next to it).
curl -X POST http://localhost:7776/ingest \
  -H "Content-Type: application/json" \
  -H "X-Tempo-Token: <token>" \
  -d '{
    "title": "First test event",
    "eventType": "alert",
    "providerIdentifier": "com.test",
    "metadata": { "host": "demo", "outcome": "ok" }
  }'
```

If everything's set up correctly, the response is:

```json
{ "status": "accepted", "id": "<some-uuid>" }
```

…and within a second, an event titled "First test event" appears in your timeline with `com.test` as the source. If that doesn't happen, jump to [§12.1 — Networking](/docs/12-troubleshooting#121-networking-lan-ingestion).

### Picking your first real source

Most users connect a real source in this order:

1. **Something you already have running** — your Kopia backups or your Home Assistant instance. Pick whichever is easier to reach (i.e., whichever you have the admin UI open in another tab right now)
2. **Something with frequent events** — a CI workflow, a noisy monitor — so you see Tempo's grouping and severity behaviour kick in within a few minutes rather than waiting for a daily cron
3. **A custom script** — once the bundled sources are familiar, the [`tempo_send.sh` helper](/docs/10-sources-reference#1010--tempo_sendsh-helper) makes it trivial to wire any cron job, post-commit hook, or shell script into Tempo

Pick one and follow the matching section in [§10 — Sources reference](/docs/10-sources-reference). Each setup section is two to four pages, takes 5-15 minutes end-to-end.

### When something doesn't work

The single most common failure mode for first-time setup is the request never reaches Tempo because:

- **The Mac's hostname doesn't resolve** from the upstream machine. Try `ping <your-mac>.local` from the upstream host. If it fails, use the LAN IP directly (e.g., `http://192.168.1.20:7776/ingest`)
- **macOS Application Firewall is blocking incoming connections**. See above; allow Tempo
- **The token is wrong**. Tokens are case-sensitive and have no whitespace tolerance — copy via the clipboard icon in **Settings → Ingestion**, not by hand
- **The upstream tool wasn't restarted** after you changed its webhook config. Most tools (Kopia, Kuma) hot-reload; some (custom scripts using a daemon) don't

Tempo's audit log records every payload that hits the ingestion endpoint, accepted or rejected, with the reason for rejection. To inspect it, open **Console.app** and filter by subsystem `app.tempoapp.Tempo`. For sharing with support, use **Settings → Help → Export diagnostics bundle…** — it includes the last 24 hours of OSLog output (no token values, no event payloads).

---

## Where to go from here

You have Tempo installed, the ingestion server ready to accept events, and a sense of what each panel does. From here:

- **Customise how a source looks** in the feed → [§7 — Score Editor](/docs/07-score-editor) — assign different colours, custom labels, group repeated events, define action buttons
- **Connect more sources** → [§10 — Sources reference](/docs/10-sources-reference) for the bundled set; [§10.2 — Generic webhook](/docs/10-sources-reference#102-generic-webhook) for anything else
- **Adjust visual preferences** → [§8.1 — Interface](/docs/08-settings-reference#81-interface) — appearance, footer toggle, heatmap colours, badge contrast
- **Set up automatic housekeeping** → [§8.4 — Maintenance](/docs/08-settings-reference#84-maintenance) — auto-ack, auto-dismiss, retention

If anything along the way didn't behave the way this chapter described, [§12 — Troubleshooting](/docs/12-troubleshooting) covers the failure modes we've seen.
