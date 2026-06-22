---
title: "Is Tempo vibecoded?"
description: "Tempo is AI-assisted, but not vibecoded. Here's the difference, with concrete examples from how I built it."
pubDate: 2026-06-22
tags: [philosophy]
draft: false
---

*📅 June 22, 2026 · Leo from Caereforge*

Before getting into the question, I want to define what "to vibecode" actually means.

Karpathy coined the term in a more neutral light (give in to the vibes, embrace exponentials), but in practice it's drifted somewhere else. Today it usually points to an app whose architecture, design, and code were produced end-to-end by an AI. Someone with an LLM subscription hands the AI an idea, and the AI does the work. These apps tend to be simple. They lean on what the operating system already provides and stack a thin programmed layer on top to do some task. There's no real control over the architecture, none over the code. Security (network side and system side) is left to the AI, with no competent audit to confirm that the security level is even reasonable.

Moreover, Tempo was originally built for myself as a way to gather information into a single interface, so I could simply check Tempo rather than browse a dozen dashboards. I also wanted a place to collect the status of my scripts… and I have many, doing all sorts of tasks. But that's part of my daily job, and I'm genuinely lucky that my work matches some of my passions, like my homelab. Only later did it become a possibility: the wish to share something useful with people who, like me, can appreciate certain kinds of tools.

With that out of the way: is Tempo vibecoded?

I'd say no.

I understand code, I understand functions, I know the syntax of compiled languages, and I can write simple code in Swift — but I've never been a programmer by trade. I write shell scripts for work every day, mostly bash, some Python. I know the logic that sits behind functions. But writing a whole macOS application in Swift, with no experience building complex, structured applications, and expecting it to work the way you want — that's a completely different task. That's why Claude has been such a good partner: it gave reliability and substance to ideas of mine that would otherwise have stayed in pure-thought territory.

Tempo's author and architect is me. Design, architecture, and testing are mine; implementation is AI-assisted with Claude Code. The way it works: structured prompts that carry the architectural intent into each session, functional testing on every release before it goes out, and code reviews to go deep into how Tempo works. I've been running Tempo on my own homelab for months — Home Assistant, UniFi, Kopia, Beszel, and an *arr stack — and the pre-release polish I'm writing this from is the result of that loop.

A few concrete examples of what that means in practice:

- **The database:** I picked SQLite with GRDB instead of going with SwiftData, even though SwiftData is the modern Apple-stack default and Claude's first instinct was to pick it. I wanted explicit schema control and migrations that don't break if they run twice (or more) from day one — not magic that hides what's happening underneath. That decision happened before any code got written.

- **The ingestion threat model:** Tempo listens on TCP for events from other machines on the LAN — Home Assistant, Uptime Kuma, Kopia, custom scripts. The model I drew on paper before opening the editor:
    - bind on `0.0.0.0` by default, so my homelab use case could actually work
    - per-provider tokens with rate limiting, every request logged for security and auditing
    - no tokens stored in clear text, so sensitive information stays confidential
    - TLS on any TLS-capable source, so information is safe when it travels between hosts too

- **A real catch from a real audit:** a week before launch I ran a deep code audit with Claude at maximum-effort reasoning, looking for everything I might have missed. It found a serious one: an AppleScript-injection primitive in the path that opens Terminal commands from scores. The escape function I'd co-written only handled `"` and not `\` — which meant a malicious metadata payload could break out of the AppleScript string and execute arbitrary code. We patched it. That's exactly the kind of catch a vibecoded loop without a critical second pass doesn't perform.

- **The score system vs. the visual builder:** for v1 I had to choose between a Visual Action Builder (a GUI for editing actions and rules) and a declarative score system (JSON files, drop-in folder, double-click installer). Claude's first proposal was the GUI — friendlier for non-technical users. I went the other way. Declarative scores are more transparent, more powerful, and more aligned with my daily job and my homelab mental model, where everything is text you can read and version. The GUI will come in the future, if someone wants it — but Tempo is a technical tool, aimed at technical people who probably think the way I do and will most likely prefer (as I do) a good file to edit over a graphical interface, while keeping full control.

- **Hard constraints in `CLAUDE.md`:** there's a `CLAUDE.md` file at the root of the repository setting the project's non-negotiables: macOS 15+, Swift 6, no App Store, data stays local on the user's Mac, no telemetry — and clear, strong security. I wrote that file. It's the contract Claude works within.

Moreover, I use an instruction file called `Philosophy.md` that guides every decision I make and every iteration Claude does on the whole app. This non-technical file states clearly my idea of what software should be: safe (as much as possible), transparent in what it does, reliable (even though I can't test every environment, we'll fix any issue together), secure, and private (your data is only yours; I don't want and don't need to deal with it).

Tempo is a piece of me I'm putting out there because I think it has value, and I think it's useful.

More than that: this chance to create something — as opposed to my day job, where I administer and manage but I don't make — has touched something deep. It gave me the freedom to be what I am: someone passionate, spending his own time on something he loves, for an environment he loves.

So, in that light: no, I don't think Tempo is vibecoded. I probably could have written it on my own — but at the cost of months, if not years, of work and study. AI is a great tool for someone who knows what they're building… and I know what I wanted to achieve, and how.

---

Leo from [Caereforge](https://caereforge.com)
