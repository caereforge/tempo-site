---
title: "Split one source into sub-sources"
description: "Post under a dotted providerIdentifier to divide one source into separate rows in the source panel, all styled by the same score and accepted by the same token."
order: 30
category: "Sources"
pubDate: 2026-06-10
draft: false
---

# Split one source into sub-sources

Sometimes one source produces a few distinct kinds of event you would like to see, hide, or focus on separately. You can divide it in the source panel without installing anything extra: post under a **dotted providerIdentifier**.

For Hazel, instead of everything under `com.noodlesoft.hazel`, post email-rule events under `com.noodlesoft.hazel.email` and scanner-rule events under `com.noodlesoft.hazel.scanner`. Each becomes its own row grouped under the Hazel parent, and you can hide or auto-dismiss them independently.

It all just works, because:

- the **token** bound to `com.noodlesoft.hazel` already accepts any `com.noodlesoft.hazel.*` sub-source,
- the **single score** covers every sub-source (Tempo walks up the dotted name to find it),
- the **source panel** groups them under one parent row.

One score, one token, as many logical rows as you want. It fits naturally for the sources you author yourself, like Hazel and your own scripts.
