---
title: "Why we call them scores"
description: "A note on the musical name behind Tempo's building blocks — and the shortlist of scores shipping at launch."
pubDate: 2026-04-23
tags: ["scores", "design", "community"]
---

If tempo in music means the speed at which a piece is played (slow or fast) and its rhythmic structure organized in steady measures (until it changes), then it's the scores that set the cadence of those measures.

The events that our servers and tools send across the network — to be understood and handled by Tempo — need to follow patterns. Scores.

That's why Tempo will ship with a set of preconfigured scores at launch — the same ones I use in my own infrastructure:

- Kopia
- Home Assistant
- Proxmox
- UniFi
- Uptime Kuma
- Apple (Calendar and Reminders)
- A generic webhook score for custom scripts

Installing a score will be dead simple: download it, double-click it, the installer window opens, and the score is ready to go.

In another post I wrote: *the payload is input, the score is policy, you're the author*. And that's exactly how it works — the score tells Tempo *how* to read an event; you decide *what* it should do in response.

But as I said, Tempo is open to the community, and it can handle a huge range of inputs — pretty much all the common ones across self-hosted and cloud tools.

When Tempo is ready for its first public release, I'll open a Discord community where we can discuss and collaborate.

The Tempo that each of you builds on top of your own infrastructure will be different. And that's exactly the point.
