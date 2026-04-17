Tempo — I'm building a Mac app that puts every event from every tool into one timeline

---

Hey MPU,

I've been a long-time lurker and occasional poster here, and this community has shaped a lot of how I think about Mac workflows. So this feels like the right place to share something I've been building.

**The problem I kept running into:**

I use Apple Calendar, Todoist, GitHub, Grafana, and a handful of scripts and backup tools. Each one has its own notification, its own window, its own rhythm. By the time something needs my attention — a server alert, a PR, a backup failure — I've already lost context switching between apps.

I wanted one place to see everything.

---

**What I built:**

**Tempo** is a native Mac app that aggregates events from all your tools into a single chronological timeline, and surfaces contextual actions for each one.

A few examples of what that looks like in practice:

- A **Grafana alert** fires → Tempo shows it in the timeline with SSH, Ping, and Open Dashboard buttons already there
- A **task** is due today in Todoist, OmniFocus, or Things 3 → it appears in the timeline with a direct "open in app" action
- A **client meeting** starts in 10 minutes → your Obsidian notes and relevant documents appear alongside the calendar event
- A **GitHub PR** needs review → it shows up with a direct Open PR action
- A **Kopia backup** completes (or fails) → it's logged in the feed with Browse snapshot and View logs

The actions use **URL schemes** and terminal commands — so `obsidian://open?vault=...`, `ssh://...`, `things:///add?...` all work natively. If the app supports it, Tempo can trigger it.

**Tempo is also fully themeable.** Because your timeline should look the way you want it to.

---

**The extensibility part (for those who like to tinker):**

Any tool that can send a POST request already works with Tempo — no plugin, no SDK needed. You define the payload, Tempo renders it with whatever actions you configure.

This means shell scripts, cron jobs, custom automations — anything you already run on your Mac can post an event to Tempo with a single `curl`.

Tools that don't support webhooks natively — like **OmniFocus** or **Things 3** — can be connected as sources using a short AppleScript or JXA automation. Because Tempo runs entirely on your Mac, there's no rate limiting or API overhead: your local apps become first-class sources. OmniFocus in particular exposes its entire data model via AppleScript — tasks, projects, tags, due dates, defer dates — so the integration can be as deep as you want it to be.

---

**What's coming:**

- Action Builder — a visual editor to create custom buttons and commands for any event type
- CLI — a full terminal interface: push events, query the timeline, manage sources, trigger actions
- AI Action Builder — describe what you want in plain English, Tempo generates the action (BYOK)
- Template gallery — share and import community setups

**Privacy:** no account, no cloud, no telemetry. Everything lives in a local SQLite database on your Mac.

---

I'm building this solo. Private beta is coming — if this sounds like something you'd use, I'd love to have you on the waitlist. There's also a short 2-question survey to help me figure out what to build first.

👉 **tempoapp.app**

Happy to answer questions, hear what integrations would matter most to you, or just talk through the workflow problems this is trying to solve.
