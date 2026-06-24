---
title: "Architecture and security in Tempo v1"
description: "A high-level look at how Tempo v1 is structured, and a more detailed look at the security posture. Aimed at the technical reader downloading v1 today."
pubDate: 2026-05-20
tags: ["engineering", "architecture", "security"]
---

*📅 May 20, 2026 · Updated for Tempo 1.1 · Leo from Caereforge*

A pass at what's inside Tempo v1: enough to give you a mental model of the app, with enough detail on the security side to let you decide whether you trust it on your network. The architecture section is deliberately light. My goal is to describe the shape of the system, not publish a blueprint someone could clone in a weekend. The security section is more detailed, because that's where a technical reader has earned the right to specifics.

### Architecture, high-level

Tempo is a closed-source native Mac app, distributed as a signed and notarized DMG. The binary is small (~7 MB) and Universal (Apple Silicon and Intel). It runs as a single process: no helper daemon, no background service, no shared database accessed by multiple writers.

Internally, the codebase is split into a handful of layers that map roughly to function:

- An **app lifecycle layer** that owns the window, the menubar, the SwiftUI scene, and the cross-feature wiring.
- A **core data layer** that defines the canonical event and action shapes. Every source normalizes to this representation before storage.
- A **persistence layer** on SQLite. Every schema change ships as a numbered, sequential migration; no ad-hoc `ALTER` in the running app, no "unknown key fallback" that absorbs whatever a payload happens to contain. Single file on disk under Application Support, backed up weekly (plus on-demand from Settings, to a path you choose).
- An **ingestion layer**: HTTP listener that binds the LAN by default, accepts POST requests carrying JSON payloads, validates them, enforces per-source authentication, and writes through the persistence layer.
- A **providers layer** that bridges native macOS APIs (EventKit for Apple Calendar and Reminders, plus an experimental, opt-in CalDAV engine, Fastmail-focused, added in 1.1) and surfaces their events alongside the inbound webhook signal.
- A **UI layer** in SwiftUI that renders the timeline, the agenda panel, the action panel, the score editor, and the settings.

On top of those layers sits the score abstraction. A **score** is a small JSON file that tells Tempo how a source should look in the timeline (color, severity rules, grouping policy, default actions). Scores live outside the binary, in a folder under Application Support: edit the JSON, the app picks up the change.

Scores are the boundary between Tempo's generic event model and the specifics of your stack: the payload is input, the score is policy, your clicks are the only authority that fires anything.

That is the architecture in a few paragraphs. The deeper "why" of each layer (concurrency model, JSON column versus EAV, the stateful-vs-stateless event convention, the way the schema migration system bootstraps a brand-new database) is the kind of detail that doesn't change anything for an end user, and I'd rather not publish a blueprint of internal trade-offs. The bundled scores are JSON files you can read directly. The user guide covers the user-facing shape of the model in depth.

### Security posture

This is the section where a technical reader has earned specifics. I owe you those.

**Network reach.** Tempo's ingestion listener binds `0.0.0.0` by default, not loopback. The rationale is concrete: the wedge audience runs Home Assistant, a NAS, UniFi controllers, monitoring stacks on dedicated hosts, not on the same Mac that runs Tempo. A loopback-only default would force every webhook source onto the Mac itself, or through some local SSH tunnel kludge. LAN-first is therefore a deliberate posture, not an oversight. If your setup doesn't need it, Settings → Ingestion exposes a "Limit to loopback only" toggle that flips the listener to `127.0.0.1` immediately.

**Encrypted ingestion (opt-in).** Since 1.1, alongside the plain port Tempo can run a TLS listener (`8776`, off by default) with a self-signed certificate it generates locally: no certificate authority, no external service. You enable it in Settings → Ingestion, and you can mark individual tokens *Require TLS*: those senders are then refused on the plain port, which closes the downgrade path. Plain HTTP stays the default for trusted LANs; TLS is there for the senders or networks that warrant it. The full reasoning is on the [security page](/security/#tls).

**Per-provider tokens.** Every sender (Kopia, UniFi, Home Assistant, your custom scripts) gets its own token, bound to a provider identifier prefix. Tokens are not shared, not derived from a master secret, and not bundled with the app. You generate them in Settings, paste them into the sending tool's configuration, and revoke them independently. Binding is namespace-scoped: an unbound token authorizes nothing, and a token bound to `com.x` covers `com.x` and its sub-namespaces but never its siblings. If one sender's token leaks, the attacker can impersonate that sender only: they cannot pose as another provider, and cannot escalate to a Tempo-wide compromise.

**Keychain-stored secrets.** Tokens live in the macOS Keychain, scoped to the Tempo process. Not in `UserDefaults`, not in flat files, not in environment variables. Per-process access mediation is enforced by the OS, not by app-level discipline.

**Input validation and rate limiting.** Every accepted request passes a centralized validator: the schema is strict (unknown fields are rejected, not silently absorbed); every string field has a size cap; URL schemes in action triggers are explicitly allowlisted (`https`, `ssh`, `mailto`, and a small handful of vetted app schemes, with no `javascript:` and no exotic schemes). A remote payload also can't declare a `file:` action; `file:` works only from a score you installed locally (so Hazel's "Open file" or Kopia's "Open KopiaUI" open on your click), never from the wire. Per-token rate limits prevent a misconfigured sender from drowning the database.

**Audit log.** Every accepted and every rejected request is recorded through the macOS unified logging system. The log captures enough metadata to reconstruct an incident (token used, source IP, response code, timestamp) but does not record the payload contents themselves. Export the diagnostic bundle from Settings → Help if you ever need to share it with me without sharing the data inside the events.

**Local data, no telemetry.** Tempo does not include any third-party analytics SDK. The app does not phone home. There's no license server to check against, since v1 is freeware. The database stays on your disk. Backup files stay on a path you choose: iCloud Drive, a mounted NAS, a local folder, all work uniformly because Tempo just writes to the path you give it.

**Signing and notarization.** The DMG is signed with Caereforge's Apple Developer ID and notarized through Apple's notarization service. Gatekeeper verifies authenticity on first launch automatically. If you'd like an extra integrity check from a terminal, the SHA-256 of the current release is published on the [downloads](/downloads/) page.

**Auto-update.** Tempo updates via Sparkle, with EdDSA-signed appcasts. The update flow verifies the appcast signature, then the DMG signature, then notarization: three independent checks before anything writes to your Applications folder.

**Distribution-level analytics, disclosed honestly.** Cloudflare serves the downloads. The CDN records aggregate counts at the edge (downloads per day, broad country attribution, version requested). No IP retention, no cookies, no fingerprinting, no per-user tracking. The full disclosure is on the [privacy page](/privacy/). The distinction between *app-level telemetry* (none) and *distribution-level edge analytics* (aggregate, server-side, no PII) is one I take seriously and would rather make explicit than gloss over.

### Honest gaps in v1

A few things I am explicit about:

- **Plain HTTP is still the default.** Encrypted ingestion shipped in 1.1 (see the security posture above), but it's opt-in: out of the box the listener speaks plain HTTP, calibrated for a LAN you trust. Turn on TLS, or front Tempo with a Caddy/nginx proxy, when your network warrants it.
- **No outbound automation, no bidirectional sync.** Tempo reads events. It does not POST back to your sources. v2 may extend this behind explicit per-action trust gates; v1 deliberately does not.
- **Closed source.** v1's binary is closed, which means you cannot audit the code. What I offer in compensation: notarized + signed binary, disclosed threat model (this post), scores as plain-text JSON you can read and modify, an audit log that records every request, and the [scope-and-discipline post](/blog/what-tempo-is-not/) that lays out what Tempo will and will not become.

Security questions and feedback are welcome on the [tempo-scores GitHub repo](https://github.com/caereforge/tempo-scores), alongside score contributions. The Discord (link in the menu) is where deeper conversations happen.

---

Leo from [Caereforge](https://caereforge.com)
