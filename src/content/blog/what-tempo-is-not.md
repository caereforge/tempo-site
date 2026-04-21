---
title: "What Tempo is not"
description: "Before launch, a clear look at what Tempo deliberately isn't — and why that matters."
pubDate: 2026-04-21
tags: ["philosophy", "design"]
---

As Tempo takes shape and gets close to release, there's one thing I think it's worth being clear about: what is Tempo *not*?

Well, to start — Tempo isn't a calendar. It shows your calendar, and your tasks if you want it to, but it isn't built to manage them. My day is full of commitments like anyone's, though, and while I'm glancing at the timeline to see what's going on in my homelab, it's useful to also see the events that sometimes feel like they're chasing me. So I can see them, and I can run actions against them (that's the whole Tempo philosophy) — but nothing close to a real calendar or to my task app of choice (Todoist, in my case).

I can mark a task as completed, and a green badge tells me so. I can also acknowledge an event — that hides it from the timeline but keeps it in the history, in case I want to bring it back. If a calendar event carries a meeting link, I can jump straight into the app (or the web URL) to join it. But not much more than that.

Tempo also isn't a cloud app. Your data lives on your Mac, in a local SQLite database. There's no sync server, no account to create, no telemetry enabled by default. If you run Tempo next to a homelab and feed it alerts from half a dozen services, none of that ever leaves your network.

And Tempo isn't a monitoring dashboard either. Tools like Grafana draw continuous metrics; Tempo collects discrete events and puts them on a single timeline — complementary, not competing.

It's also not a notification relay. Something like ntfy will happily shout at you on every device you own; Tempo won't wake you at 3am, won't escalate, won't chase you across phones. That's on purpose — quiet by design. That said, if you *do* want a ping on your phone when a specific event lands in Tempo, that's exactly what a score is for: a short action that POSTs to ntfy, Telegram, or whatever you already use is trivial to wire up, and will likely ship as one of the starter scores.

Tempo isn't an automation app either. Well — it *could* be, but the decision about what it should automate can't be mine to make. So the actions you get out of the box are deliberately basic, and nothing consequential fires unless you ask for it.

This is the principle I care most about: payloads are input; your clicks and your scores are policy; the authority to automate always belongs to you, never to whoever sent the event. A webhook from your NAS doesn't get to decide what Tempo does — you do.

That said, Tempo absolutely *has* the muscle to automate plenty. You just have to teach it how, either by wiring up a script of your own or by installing one of the scores we're building.

After launch, once the app and the community are out in the open, anyone who wants to will be able to publish actions and share scores — for both scheduled and ingested events — so you can bend Tempo to your own rhythm.

The ceiling is high. The floor is exactly where you put it.

---

**Tempo is the score. Your day is the orchestra. You are the conductor.**

— Leo di Caereforge
