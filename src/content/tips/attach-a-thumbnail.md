---
title: "Attach a thumbnail to any event"
description: "Any source can put a base64 image in metadata.thumbnail and Tempo shows it inline. Best for things you recognize at a glance, not text scans."
order: 10
category: "Presentation"
pubDate: 2026-06-10
draft: false
---

# Attach a thumbnail to any event

Tempo can show an image inline on an event. UniFi Protect uses this to put a camera snapshot on a motion alert, but it is not Protect-only: **any source can do it**. Put a base64 data URI in `metadata.thumbnail`:

```json
{
  "title": "Document scanned",
  "providerIdentifier": "com.noodlesoft.hazel.scan",
  "metadata": {
    "thumbnail": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }
}
```

A Hazel rule that grabs a frame, a script that snapshots a screen, a webhook from any tool that can attach an image: all of it shows up as a preview on the event.

## Pick images that read at a glance

In v1.1 the thumbnail is **not clickable** (there is no zoom yet). Tempo shows it scaled to the width of the actions panel, so it is a *preview*, not a viewer. That makes it a good fit for things you recognize instantly:

- a face or a scene (who is at the door)
- a chart or a status screen
- a poster or an album cover

It is the wrong tool for anything that needs detail to be legible, like a **scan of a text document**: shrunk to preview size you cannot read it. Attach the recognizable image, and keep the source app as the place you open the full thing (each event's **Open in** action takes you there).

## Keep an eye on size

Thumbnails travel inside the event (roughly 10 to 60 KB each), so a busy source with thumbnails on can grow the database. Tempo keeps each image for the window set in **Settings > Database > Image retention**, then strips just the image while the event itself survives. Pick the longest window you actually look back at.
