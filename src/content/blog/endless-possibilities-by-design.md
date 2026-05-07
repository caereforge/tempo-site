---
title: "Endless possibilities, by design"
description: "Tempo doesn't know about your specific tools. It reads the JSON payload you send and adapts the UI to whatever fields are there. The sender writes the buttons."
pubDate: 2026-04-28
tags: ["scores", "design", "automation"]
---

I know it sounds like an exaggeration — but it's not far from the truth.

Tempo was designed to be adaptable from day one. I was using Hazel and kept thinking about what I could build if "something" could read the exit code of a rule and react with other actions — another script, another Hazel rule, a HomeKit notification. That "something" became Tempo.

Three concrete scenarios, all doable today:

- **Hazel** — a rule that runs an embedded shell script sends Tempo the exit code, the matched file path, and the rule name. Tempo shows the event and, if the code isn't zero, paints it red and surfaces a "Re-run rule" button that fires exactly that rule again.
- **Home Assistant** — a "back home" automation sends Tempo an event with the work-PC's MAC, the HA dashboard URL, and the automation ID in the payload. The event renders three buttons on the same row: **Wake-on-LAN** that magic-packets the PC, **Open in Home Assistant** that jumps straight to the automation's page, and **Re-run automation** that POSTs back to HA's API to fire it again. One arrival, three things you might want to do — all there waiting on the click.
- **Kopia** — a finished snapshot sends Tempo the snapshot path. The event renders a "Restore from this snapshot" button that opens KopiaUI directly on that snapshot — one click, no drilling.

**You decide what to send Tempo. Tempo builds the buttons from what it receives.**

Tempo doesn't know about your specific tool — it can't tell Hazel from UniFi from Kopia. It reads the fields in the JSON payload and adapts the UI to those fields. Change the data, change the buttons. Add a field, add a possibility.

Mechanically: the score for a source declares its actions as JSON templates. Each button's URL or shell command interpolates fields from the event payload using `${metadata.fieldname}`:

```json
"defaultActions": [
  { "label": "Wake-on-LAN",   "trigger": { "openURL": "wol://${metadata.mac}" } },
  { "label": "Open dashboard", "trigger": { "openURL": "${metadata.dashboardURL}" } }
]
```

A field on the sender side becomes a placeholder on the score side becomes a button on the event row. Add the field, add the placeholder, click again — new button, no app rebuild.

None of this happens without your click. That's deliberate: V1 wants you in control while we test these patterns across ten different homelabs. V2 will open up auto-firing for the scores that have proven solid — but you'll always be the one deciding which to enable, and when. The V1 architecture was built to grow into that, no rewrites.

The real limit of Tempo is whatever you can describe in a JSON payload. And that, usually, is enough.
