---
title: "Stack a multi-step job into one row"
description: "Give every event of one run the same run id and Tempo collapses start, steps, and done into a single stack instead of scattering them down the timeline."
order: 20
category: "Presentation"
pubDate: 2026-06-10
draft: false
---

# Stack a multi-step job into one row

When a script or a rule does several things in one run (start, step 1, step 2, done), you usually do not want each one as a separate row. Give every event of that run the **same run id** and Tempo collapses them into a single stack.

The bundled `tempo-post` tool, and the bundled `scripts` score, have this wired up already:

```sh
RUN="$(uuidgen | cut -c1-12)"
post() { tempo-post --provider scripts.shell --run-id "$RUN" "$@"; }

post --title "Backup started"  --run-total 4 --status "start"
post --title "Compressing"     --status "step 1"
post --title "Uploading"       --status "step 2"
post --title "Backup complete" --status "done" --final
```

`--run-id` lands in `metadata.runID`, and the bundled `scripts` score already lists `${metadata.runID}` as its **first** grouping template, so every event sharing that run id collapses into one stack out of the box. The next run gets a fresh id and a fresh stack. The other flags ride along as metadata you can read in the action panel: `--status` labels each step, `--run-total` records the step count, and `--final` marks the closing event.

This works because a score's `grouping` is an **ordered list of templates** and the **first one that resolves wins** (see [Concepts §2.6](/docs/02-concepts#26---stack-and-grouping)). A score has only one grouping; putting `${metadata.runID}` first just means a run id takes over when it is present and the score's normal key applies when it is not, so one-off events and multi-step runs live under the same score. Your own scores can do the same: the Hazel score already does.

> 💡 **Note**: this collapses a run into one stack, it is not a progress bar. The "Step N/Total" badge and the green/red run-complete coloring belong to a **run-bound** score, one whose events are all part of a single lifecycle, not to the general-purpose `scripts` catch-all. If you want that richer rendering for a specific job, give it its own run-bound score rather than posting it under `scripts`.
