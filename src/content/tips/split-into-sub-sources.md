---
title: "Split one source into sub-sources"
description: "For the two sources you author events for, Scripts and Hazel, post under a dotted providerIdentifier to divide one source into separate rows, all styled by the same score and accepted by the same token."
order: 30
category: "Sources"
pubDate: 2026-06-10
updatedDate: 2026-07-03
draft: false
---

# Split one source into sub-sources

Sometimes one source produces a few distinct kinds of event you would like to see, hide, or focus on separately. For the two sources whose events you post yourself, **Scripts** and **Hazel**, you can split them into separate rows in the source panel without installing anything extra: post under a **dotted providerIdentifier**.

**Scripts, by what they watch.** The most useful split for a homelab or a fleet of machines is by subject, not by language. Post hardware checks (disks, temperatures, UPS) under `scripts.hardware`, service and container checks under `scripts.software`, connectivity checks under `scripts.internet`, host-level checks (load, free space, pending updates) under `scripts.hosts`, backup jobs under `scripts.backups`, and security checks (failed logins, firewall, fail2ban) under `scripts.security`. A shell script and a Python script that both watch disks belong under the same `scripts.hardware` row, because on the timeline you care about the subject, not how the script is written.

**Hazel, by rule.** Instead of everything under `com.noodlesoft.hazel`, post email-rule events under `com.noodlesoft.hazel.email` and scanner-rule events under `com.noodlesoft.hazel.scanner`. Each becomes its own row grouped under the Hazel parent, and you can hide or auto-dismiss them independently.

The segment right after the parent is **yours to invent**. Tempo doesn't predefine these, whatever segment you post under becomes the sub-source's name (an underscore turns into a space, so `scripts.free_space` reads "Free Space"). Pick names that mean something to you, keep them consistent, and the panel organizes itself.

**Only Scripts and Hazel work this way, and only one level deep.** They are the sources you author events for, so Tempo lets you carve them into arbitrary sub-sources. The other grouped sources have a fixed set of children the app defines, not ones you invent: Apple's Calendar and Reminders, UniFi's Network and Protect. And Tempo surfaces only the first segment below the parent: post to `scripts.hardware.disks` and the row reads **Hardware**, not a nested `disks` beneath it. Anything deeper rides along as the event's specific name in the action panel, it does not add another level.

This works because:

- the **token** bound to `scripts` or `com.noodlesoft.hazel` accepts any child under it (`scripts.*`, `com.noodlesoft.hazel.*`),
- the **single score** covers every sub-source (Tempo walks up the dotted name to find it),
- the **source panel** groups them under one parent row.

One score, one token, as many logical rows as you want, one level under the parent.
