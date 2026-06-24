---
title: "Endless possibilities, by design"
description: "Tempo doesn't know about your specific tools. It reads the JSON payload you send and adapts the UI to whatever fields are there. The sender writes the buttons."
pubDate: 2026-04-28
tags: ["scores", "design", "automation"]
---

*📅 April 28, 2026 · Leo from Caereforge*

I know it sounds like an exaggeration, but it's not far from the truth.

Tempo was designed to be adaptable from day one. I was using Hazel and kept thinking about what I could build if "something" could read the exit code of a rule and react with other actions: another script, another Hazel rule, a HomeKit notification. That "something" became Tempo.

Three concrete scenarios, all doable today:

- **Hazel**: a rule runs an embedded shell script that POSTs the run's outcome (a `severity` like `error` when it fails), the matched file path, and the rule name. A failed run shows red; the card carries a **Copy file path** button and a **Re-run** button that opens Terminal with the command, ready for you to run.
- **Home Assistant**: a "back home" automation sends Tempo an event with the work-PC's MAC and the HA dashboard URL. The card renders three buttons on the same row: **Open in Home Assistant** that jumps straight to the dashboard, **SSH to the box**, and **Wake the PC** that opens Terminal with a `wakeonlan` command for that MAC. One arrival, three things you might want to do, all there waiting on the click.
- **Kopia**: a finished snapshot sends Tempo the snapshot ID and path. The card carries a **Copy snapshot ID** button and a **Restore** button that opens Terminal with the `kopia snapshot restore` command pre-filled: one click to the prompt, no drilling.

**You decide what to send Tempo. Tempo builds the buttons from what it receives.**

Tempo doesn't know about your specific tool. It can't tell Hazel from UniFi from Kopia. It reads the fields in the JSON payload and adapts the UI to those fields. Change the data, change the buttons. Add a field, add a possibility.

Mechanically: the score for a source declares its actions as JSON templates. Each button's URL or shell command interpolates fields from the event payload using `${metadata.fieldname}`:

```json
"defaultActions": [
  { "label": "Open dashboard", "trigger": { "openURL": "${metadata.dashboardURL}" } },
  { "label": "Wake the PC",    "trigger": { "openTerminalWith": "wakeonlan ${metadata.mac}" } }
]
```

A field on the sender side becomes a placeholder on the score side becomes a button on the event row. Add the field, add the placeholder, click again: new button, no app rebuild. The button primitives are deliberately simple and safe: open a URL (`https`, `ssh`, and a few vetted schemes), open Terminal with a command for you to run, or copy text. Nothing fires on its own.

None of this happens without your click. That's deliberate: V1 wants you in control while we test these patterns across ten different homelabs. V2 will open up auto-firing for the scores that have proven solid, but you'll always be the one deciding which to enable, and when. The V1 architecture was built to grow into that, no rewrites.

The real limit of Tempo is whatever you can describe in a JSON payload. And that, usually, is enough.

---

Leo from [Caereforge](https://caereforge.com)
