---
title: "Dev Log #1 — Engineering notes"
description: "A first look at the engineering choices behind Tempo: ingestion schema, security model, event dimensions, and what ships at v1."
pubDate: 2026-04-22
tags: ["dev-log", "engineering"]
---

Hello everyone,

I think it's time for a technical update — to share what I'm working on and where Tempo stands.

These past days have been intense. The creative flow has taken me over, and Claude has been working alongside me closely. Before going into the details, one piece of framing: Tempo is built with AI assistance, but the architectural decisions are not delegated. Threat model, schema design, naming conventions, security trade-offs — all of these cross my desk first. What follows is not a feature list: it's the engineering choices I made, that Claude then helped me implement. The code stays closed. The principles do not.

Tempo runs on my Mac every day and works well. I've focused on the tools I actually use in my environment — and on making sure that each integration holds up to the traffic it generates. The following modules are feature-complete and only need fine-tuning:

- **Apple Calendar and Reminders** behave consistently with Tempo's philosophy (aggregate, don't duplicate; the user is the authority).
- **Kopia backup** is stable. Because Kopia generates many events, it has become my main stress test for timeline readability.
- **UniFi** is integrated via native webhooks. The events you configure on the controller arrive in Tempo's timeline.
- **Antarctica** — a private Chrome extension of mine — sends events cleanly using the JSON payload schema Tempo accepts.
- **Scripts** — a generic source that ingests events from the many shell scripts running on my machine, both via `launchd` and ad-hoc.

With that context, here's where things stand.

### Ingestion and schema

The design principle for the ingestion layer is **"read defensively, generate fluently."** Inbound data is treated as untrusted input regardless of who sends it; the code Tempo generates for its own consumption can be more expressive because it owns both ends.

A few concrete choices that follow from that:

- **LAN-reachable by default (`0.0.0.0` bind), not loopback-only.** Loopback-only would have been the "safe default" for an App Store app — but Tempo's target audience runs Home Assistant, NAS, and monitoring stacks on dedicated hosts, not on the same Mac. Loopback-only would have made Tempo useless for them. LAN-first with per-provider tokens is a deliberate security posture, not an oversight. Users who prefer loopback-only can configure it.
- **Schema v1 is explicit, not magical.** Every accepted field is declared in the parser. There is no "unknown key fallback" that quietly absorbs arbitrary structure — a typo in a payload is rejected loudly so senders catch it early.
- **Reserved keys** (`externalID`, `providerIdentifier`, `startDate`, and so on) are normalized before decoding the payload, preventing collisions between user-supplied metadata and top-level fields.
- **Metadata as a single JSON column**, queried via SQLite's `json_extract()`. I rejected the EAV pattern on purpose: EAV trades write simplicity for query pain that compounds as schemas evolve. JSON1 is the adult alternative.
- **Schema migrations from day zero.** A `schema_version` table and sequential SQL migrations — no ad-hoc `ALTER` statements, no skipped versions. Every schema change is a numbered step with a rollback story.
- **Stateless vs. stateful events by convention, not by protocol split.** Presence of an `externalID` → UPSERT (stateful, e.g. Uptime Kuma monitors that re-report every 60 seconds). Absence or timestamp-based ID → INSERT (stateless, e.g. a completed Kopia snapshot). One protocol, two patterns — smaller surface area without losing expressiveness.
- **Migration safety rule:** every UNIQUE index is preceded by a pre-clean step (orphan FK cleanup + deduplication). This is a lesson from production migration incidents, not something Claude suggested.

### Security and auth

The security model started with a document, not with code. I wrote the threat model — who talks to Tempo, from where, with what level of trust — before opening the editor. Everything that follows derives from that document.

- **Security audit closed on 2026-04-20.** The three blocker issues identified in the audit were all resolved through a centralized input-validation layer. That layer enforces per-token rate limiting, size caps on every string field, URL scheme allowlisting for action triggers, and outright rejection of unauthorized fields.
- **Per-provider tokens, bound to `providerIdentifier`.** Every sender (Kopia, UniFi, Antarctica, custom scripts) gets a distinct token. If one sender leaks its token, the attacker can impersonate *that provider only* — not spoof another provider's identity. This separation is cheap to implement and makes incident response much simpler.
- **Tokens stored in the macOS Keychain**, not in `UserDefaults` or flat files. Access is mediated per-process.
- **Ingestion audit log** via the macOS unified logging system. Every accepted and rejected request is recorded with enough context to reconstruct an incident without logging the payload contents themselves.
- **No TLS on the ingestion port yet** — this is a known V2 item, explicitly tracked. The threat model treats LAN as a semi-trusted zone for v1 and I would rather document that honestly than pretend otherwise.

### Event model — state, severity, and user actions

One of the architectural choices I am most pleased with: every event in Tempo carries **three orthogonal dimensions**.

- **State** — the world-state as reported by the sender: `firing`, `resolved`, or `info`. This answers "is the underlying condition still active?"
- **Severity** — sender-declared outcome/urgency: `info`, `ok`, `warning`, `error`, `critical`. This answers "how bad or good was this?"
- **User actions** — `acknowledged`, `dismissed`, or neither. This is the user's territory, never written by senders.

Many alerting tools collapse these into a single field. The result is the "everything looks like an alert" problem: a completed backup and a failed backup show up identically because the UI only knows "event exists." By keeping the dimensions separate, Tempo can show a successful Kopia snapshot with a calm green `ok` badge and a failed one with a loud red `error` badge — same underlying state, opposite severity. The feed becomes readable at a glance, which is the whole point.

Severity is new in this cycle. Score authors can declare it explicitly in the payload, or rely on declarative rules in the score that evaluate against metadata (`match: { exitCode: 0 } → severity: ok`), with the payload always winning when set. The color-only heuristic I briefly considered as a fallback was rejected: a red calendar event is not an error.

### Stateful entities

For modules that monitor long-lived subjects (Uptime Kuma monitors, Home Assistant sensors), Tempo stores one row per monitored subject, updated in place. User actions — an acknowledgement, a dismiss — are preserved across re-ingests so the user's input survives the sender's noise.

The practical effect: Uptime Kuma re-notifying every 60 seconds produces one row in the timeline, not 60. An acknowledged monitor stays acknowledged until the writer signals a state transition. This part is partially shipped; the remaining pieces unlock fully-fledged Kuma and Home Assistant adapters.

### Scores

Scores are `.tempo-score` files — declarative JSON documents registered via `Info.plist`. Double-click opens a review sheet; Install adds them to the catalog. A file watcher on `~/Library/Application Support/Tempo/Scores/` also picks up drop-in files with zero app restart.

Scores support variable interpolation resolved at click time (`${metadata.xxx}`, `${startDate}`, and so on), with clear UI feedback when a field is missing — no silent failure.

The launch lineup aims to include scores for Kopia, UniFi, Home Assistant, Uptime Kuma, and Generic Webhook, plus three or four essentials. The final list will depend on review time available before release.

### Feed and dismiss

- **Append-only continuous feed** with a rolling window; no pagination. Events flow in chronologically, and the UI surfaces what is relevant without forcing the user into navigation gestures they did not ask for.
- **Dismiss works on individual events and on grouped stacks.** The per-source "dismiss all" is a single DB write — important when a noisy source fires a burst.
- **Per-source auto-dismiss and automatic retention** are already shipped. Users get to decide how long Tempo keeps history.
- **Per-source history view** lets users review and restore anything they have dismissed, without leaving the source panel.
- **Source visibility toggle** with prefix-based grouping (e.g. `lab.docker.*` collapsing under `lab.*`) so a user managing dozens of scripts does not drown in a flat list.

### Infrastructure

The website `tempoapp.app` is hosted on Cloudflare Pages with an Astro build; the site repo is public at `caereforge/tempo-site`. The app itself and all user data stay local: SQLite on disk, no cloud sync, no third-party telemetry endpoint. **Telemetry, if it ships, will be opt-in, anonymized, and user-controlled — never default-on, never PII.** This is non-negotiable.

### What is changing at launch

Two changes worth flagging:

- **No visual builder at v1.** Score authoring happens via JSON, with a catalog of preconfigured ones for common sources. A visual builder is a V2 item.
- **Tempo v1 is freeware — forever.** Full context and the reasoning behind this decision are in the [freeware announcement](/blog/tempo-goes-freeware/).

That is it for Dev Log #1. Dev Log #2 will likely focus on whatever the launch week surfaces.
