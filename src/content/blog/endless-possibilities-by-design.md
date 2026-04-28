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
- **Home Assistant** — a "back home" automation sends Tempo an event with the work-PC endpoint in the payload. Tempo shows a "Wake-on-LAN" button that targets that IP. Imagination is the only limit — back home → turn on lights, wake the PC, resume the song you were listening to in the car.
- **Kopia** — a finished snapshot sends Tempo the snapshot path. The event renders a "Restore from this snapshot" button that opens KopiaUI directly on that snapshot — one click, no drilling.

**You decide what to send Tempo. Tempo builds the buttons from what it receives.**

Tempo doesn't know about your specific tool — it can't tell Hazel from UniFi from Kopia. It reads the fields in the JSON payload and adapts the UI to those fields. Change the data, change the buttons. Add a field, add a possibility.

None of this happens without your click. That's deliberate: V1 wants you in control while we test these patterns across ten different homelabs. V2 will open up auto-firing for the scores that have proven solid — but you'll always be the one deciding which to enable, and when. The V1 architecture was built to grow into that, no rewrites.

The real limit of Tempo is whatever you can describe in a JSON payload. And that, usually, is enough.
