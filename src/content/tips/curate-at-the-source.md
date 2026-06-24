---
title: "Curate at the source, not in Tempo"
description: "The cheapest way to keep a feed quiet is to send less. Filter at the source first, narrow the score second, and hide in Tempo only as a last resort."
order: 40
category: "Sources"
pubDate: 2026-06-10
draft: false
---

# Curate at the source, not in Tempo

A noisy timeline is almost always a sending problem, not a Tempo problem. The order of intervention, cheapest first:

1. **Filter at the source.** An event that is never sent costs nothing. In Home Assistant, label the handful of entities you actually want and forward only those. In UniFi Protect, scope the alarm to person detection on the cameras that matter, not every motion. In Uptime Kuma, enable the notification on your critical monitors first.
2. **Narrow the score.** If a source sends a bit more than you want, the score can drop or downplay what you do not care about.
3. **Hide in Tempo.** Last resort: the source panel can hide a source you have decided you never want to see.

A related habit: when **two sources see the same device** (UniFi sees a TV as a network client, Home Assistant sees it as a media player), pick the one with the cleaner signal and let only that one report it.

New to a source? Start narrow and widen later. It is much easier to add what you are missing than to dig out from a flood.
