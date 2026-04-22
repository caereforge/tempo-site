---
title: "Great News — Tempo v1 goes freeware!"
description: "Tempo v1 will ship as freeware, forever. Here's how the community will shape what comes next — and an honest look at the costs behind it."
pubDate: 2026-04-22
tags: ["announcement", "release", "community"]
---

These past days of intense development, where the creative process has taken me over completely, I've also had time to think carefully about how I'd like Tempo to grow.

Tempo costs time and money — that's true. But before thinking about recovering those costs, I care more about Tempo growing in the right way: shaped not only by my own needs, but by anyone who wants to use it and add even a small brick to the "House of Events" that Tempo is meant to be.

For this reason, **Tempo v1 will be freeware — forever.** My hope is that the community forming around it will have a real voice in the technical choices ahead. This isn't a trial, a teaser, or a free tier hiding a paywall. v1 is complete, native, local-only, yours to keep.

To move faster and ship the first release as soon as possible, there's one tradeoff: **no visual builder at launch.** Everything else is there.

### Scores

To make up for the missing builder, Tempo ships with **scores** — small declarative files (`.tempo-score`) that carry the intelligence behind Tempo's actions. They're freely downloadable, human-readable, and they can add new modules (Proxmox, Uptime Kuma, and more), bundle ready-to-use scripts to validate sources and custom payloads, or register new click-through reactions in the Action Panel.

The name is a nod to the musical theme running through Tempo's internals: v1 ships under the codename **"Largo"**, and releases will take their names from musical tempos, slowest to fastest.

### Community scores

Scores can be created by anyone. Here's how contribution will work:

- You submit a score you've written.
- I review it — checking that it works and that it's safe (no hidden network calls, no terminal actions, no disallowed URL schemes, metadata handled responsibly).
- If it passes, it joins the public catalog, downloadable by everyone.
- If it doesn't, you'll get feedback so you can iterate.

A disclaimer that will stay attached to every community score, reviewed or not: **the functional responsibility of a custom score lies with its author.** My review is a security and sanity check, not a warranty.

Reviews will happen as time allows. Tempo is free, and curating the catalog is a labor of love — not a full-time job.

### The honest part about costs

Tempo costs time and money, as I said. This is something every developer who wants to ship a complex, secure product like Tempo has to face.

It's not just the **Claude Max 20x** subscription I use as my development companion (€220/month, €180 + VAT — by far the heaviest line). It's also the **domain registration** for tempoapp.app, the **Apple Developer Program** membership needed to sign and notarize the app, and — most importantly — the time I'm carving out of the hours I'd otherwise spend with my family.

I don't pay for storage, because Tempo doesn't need any: it's private, it collects no data, and everything stays on your Mac. At least that cost I can avoid.

Then there's **Buttondown** for the newsletter — free for now, because the free tier covers up to 100 subscribers. I hope I'll have to move to the paid plan soon, because it will mean the community is growing.

### About the future

The costs and the work are real, so if the response from the community is positive, Tempo will likely have a **v2 — paid, one-time purchase, no subscriptions.** And you can be sure that anyone who contributes to the community — scores, bug reports, translations, thoughtful feedback — will be recognized with privileged conditions.

But that's future music. Right now, v1 is what matters, and v1 is free.

**Let's build Tempo together.**
