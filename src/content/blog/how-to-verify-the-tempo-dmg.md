---
title: "Security matters: how to verify the Tempo DMG before installing it"
description: "Three independent integrity layers stand between the Tempo DMG on your Mac and what we built on ours. Here's how each works, when to verify the SHA-256 yourself, and why we publish it."
pubDate: 2026-05-14
tags: ["security", "transparency"]
draft: false
---

When you download Tempo from [tempoapp.app](https://tempoapp.app), three things check whether the file is what we shipped:

1. **macOS Gatekeeper** validates the Developer ID signature and the Apple notarization ticket when you double-click. If anything has been tampered with, the OS refuses to open it.
2. **Sparkle** validates an EdDSA signature on every update before Tempo installs it. This is independent of Apple's chain — separate key, separate verification path.
3. **You, if you want to**, can compare the SHA-256 hash of the DMG you downloaded against the one we publish on the [downloads page](https://tempoapp.app/downloads/).

The first two happen automatically. The third one is something you do explicitly, and it's the topic of this post.

## When to bother

For most users, the Gatekeeper check is enough. macOS won't open an unsigned or tampered DMG, period — that's the default safety net.

Verifying the SHA-256 yourself is useful in three situations:

- **Before opening the DMG on a Mac that's been offline for a while.** Gatekeeper relies on Apple's notarization servers to verify the ticket. If the system has stale revocation data, Gatekeeper might not catch a revoked ticket. The hash gives you a check independent of any server.
- **When you got the DMG from an unusual route** — a colleague's USB drive, a download mirror, an archive backup. Comparing the hash to what we published confirms you have the same bytes we shipped.
- **As a habit.** If you verify signed software downloads as part of how you work, this is one less thing to skip.

## How to verify

From a terminal, in the folder where the DMG landed:

```
shasum -a 256 Tempo-latest.dmg
```

You'll see a line like:

```
cf4ba0fd858f912ffb2f339ef52c1002e42c8dc6a21defee2e63f96d1fa3fe40  Tempo-latest.dmg
```

Compare the long hex string to the one shown on [tempoapp.app/downloads/](https://tempoapp.app/downloads/) under "Verify your download." If they match, you have an exact byte-for-byte copy of what we built and signed. If they don't, something is off — re-download fresh from tempoapp.app and don't open the file you have.

The hash is computed once, at release time, from the same DMG that goes to the CDN. The Homebrew cask formula carries the same hash. Same source of truth, three places it appears: the site, the cask, your terminal.

## Why we publish it

Most indie Mac apps don't publish a checksum. The DMG is signed, that's usually considered enough.

We publish it for the same reason we publish [the privacy policy](https://tempoapp.app/privacy/) up-front and don't ship any telemetry by default: we and the audience Tempo is built for care about being able to verify, not just trust. People who run Little Snitch, who read what their backup software is uploading, who'd rather understand the chain of custody than take "trust us" at face value.

The hash isn't dramatic, and it doesn't catch anything that Gatekeeper wouldn't. But it's one more independent path you can use, and we'd rather give you the option than not.

---

[Reply on Discord](https://discord.gg/QnaCNKd9CN) or [email support](mailto:support@tempoapp.app) if any of this turns up an unexpected result.

Leo from [Caereforge](https://caereforge.com)
