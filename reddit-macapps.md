I built a Mac app that puts every event from every tool into one timeline — with contextual actions you define yourself. [Early preview]

---

[video]

---

I'm a Unix sysadmin in love with Mac, and I got tired of the same thing every day: switching between Apple Calendar, Todoist, GitHub, Grafana, scripts, and a backup tool just to understand what needs my attention right now.

So I built **Tempo** — a native Mac app that aggregates everything into a single chronological timeline.

But the aggregation part is honestly the less interesting bit.

---

**The part that actually matters:**

Every event type gets a set of actions you define yourself. A Grafana alert should surface the most appropriate tools to react — a terminal with a ready-to-go SSH command, a ping, a link to the dashboard. But those are just the defaults we're thinking of shipping. You define what buttons appear, what they do, and what parameters they use.

Actions work via **URL schemes**, terminal commands, and scripts. So `obsidian://open?vault=...`, `ssh://...`, `things:///add?...` all work natively. If the app supports it, Tempo can trigger it.

The **Action Builder** is a visual editor for this — no code required.

Tools that don't support webhooks — like **OmniFocus** or **Things 3** — connect via a short AppleScript or JXA automation. Because everything runs locally, there's no rate limiting or API overhead.

---

**A few concrete examples:**

🔴 **Grafana alert fires** → SSH, ping, and dashboard buttons already there

📅 **Meeting in 10 minutes** → Obsidian notes and related documents surface alongside it

🐙 **GitHub PR needs review** → open, approve, comment — one click

🗂 **Kopia backup completes or fails** → browse snapshot, view logs, retry

⚙️ **Script finishes** (shell, Python, Ruby, Perl, AppleScript, or any language that can run curl) → appears in the timeline with whatever actions you defined

---

**What's coming:**

- ✅ Native timeline — agenda + live feed, severity levels (critical / warning / info / ok)
- ✅ IngestionServer — local HTTP endpoint, any tool that speaks POST works
- ✅ Apple Calendar, Reminders, Todoist, GitHub, Grafana, Jira, PagerDuty, Kopia
- 🔜 Action Builder — visual editor, no code
- 🔜 CLI — full terminal interface to push events, query the timeline, manage sources
- 🔜 AI Action Builder — describe what you want, Tempo generates the action (BYOK)
- 🔜 Template gallery — share and import community setups

**Privacy/security:** no account, no cloud, no telemetry. Local SQLite on your Mac. The IngestionServer listens locally by default — LAN sources (NAS, servers, VMs) are supported with an opt-in setting.

---

I'm a sysadmin who built this with heavy AI assistance — worth being upfront about that. The app started from a personal need, not a business plan. Private beta is coming.

Waitlist at **tempoapp.app** — there's also a 2-question survey if you want to help prioritize what gets built first.

Happy to answer anything — architecture, decisions, or whatever comes to mind.

On n8n specifically: it's a great tool but it solves a different problem. n8n automates workflows server-side. Tempo centralizes *visibility* on your Mac — it reads your local calendar, tasks, and reminders (things n8n can't touch), and puts them alongside your reactive events like alerts and script results. The key distinction is between **planned events** (meetings, deadlines, reminders — things you scheduled) and **unplanned events** (alerts, failures, PR reviews — things that happen to you). Tempo shows both in the same timeline and lets *you* decide what to do. It never acts on its own. 👇
