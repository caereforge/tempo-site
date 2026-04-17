# tempo-site

Landing page for **Tempo** — the macOS event hub for homelabs.

Live at **[tempoapp.app](https://tempoapp.app)**.

## What is Tempo?

A native macOS app that pulls every signal from your homelab — Home Assistant,
Uptime Kuma, Kopia, UniFi, CI/CD, custom scripts — into one chronological
timeline, alongside your calendar and tasks. Each event ships with the actions
you'd reach for: SSH, dashboard, terminal command, Apple Shortcut.

Local-first. LAN-reachable HTTP ingestion with per-provider tokens. No cloud,
no account, no telemetry. Tempo shows and proposes; it never acts on its own.

## Why Tempo exists

I've spent most of my career as a Unix sysadmin — the kind of work where you
learn, over time, that the machine doesn't care how pretty your dashboard is.
It cares whether you notice the thing that matters, in time.

Eventually I came home from that and kept doing the same thing for myself.
A homelab grew. Home Assistant, a UniFi stack, Uptime Kuma, Kopia backups,
a couple of always-on services, GitHub Actions for side projects, the calendar
and reminders that actually run my life. Seven browser tabs every morning,
each speaking its own language, none of them talking to each other.

Dashboards didn't solve it — dashboards ask you to look at them. What I wanted
was the Unix instinct expressed through the Mac: the power of the terminal
and the craft of native macOS design, in one surface. One timeline, everything
that happened, in order, with the right action one click away. Local-first,
because the data stays on my machines. LAN-reachable, because the services
don't run on the Mac. Never acts on its own, because silent automations are
how you lose trust in your own system.

Tempo is that tool.

Read the full story at [tempoapp.app/#story](https://tempoapp.app/#story).

## About this repository

This repo holds the source of the public landing page only. The Tempo
application itself is in private development and is not open source.

Deployed automatically to Cloudflare Pages on push to `main`.

## Devlog

Public progress log lives on the site: [tempoapp.app/#devlog](https://tempoapp.app/#devlog).
Every dated entry is also a commit in this repo's history.

## License

MIT — see [LICENSE](LICENSE).
