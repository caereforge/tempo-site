---
title: "Stack a multi-step job into one row"
description: "Give every event of one run the same run id and Tempo collapses start, steps, and done into a single stack instead of scattering them down the timeline."
order: 20
category: "Presentation"
pubDate: 2026-06-10
draft: false
---

# Stack a multi-step job into one row

When a script or a rule does several things in one run (start, step 1, step 2, done), you usually do not want each one as a separate row. Give every event of that run the **same run id** and Tempo stacks them into one.

The bundled `tempo-post` tool has this built in:

```sh
RUN="$(uuidgen | cut -c1-12)"
post() { tempo-post --provider scripts.shell --run-id "$RUN" "$@"; }

post --title "Backup started"  --run-total 4 --status "start"
post --title "Compressing"     --status "step 1"
post --title "Uploading"       --status "step 2"
post --title "Backup complete" --status "done" --final
```

`--run-id` shares the key (it lands in `metadata.runID`), `--status` labels each step, `--run-total` shows progress, and `--final` marks completion. Every event with that run id collapses into one stack; the next run gets a fresh id and a fresh stack.

If a score already groups by something else (the Hazel score groups by rule), make `${metadata.runID}` the **first** grouping template. A run id then wins when it is present, and the normal grouping applies when it is not, so both styles live under one score.
