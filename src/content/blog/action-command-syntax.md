---
title: "Writing action commands in Tempo"
description: "How to template Tempo's action buttons with ${...} placeholders: event fields and metadata, shell quoting for terminal commands, running scripts on a remote host, and opening links in a specific browser."
pubDate: 2026-07-02
tags: ["guide", "scores"]
draft: false
---

*📅 July 2, 2026 · Leo from Caereforge*

Every event in Tempo can carry action buttons: ping the host that just went quiet, traceroute it, run your own check script, open a dashboard, copy a value out of the payload. What makes them useful is that they're templated. You write them once in a score, with `${...}` placeholders, and Tempo fills them in from each event's data the moment you click.

Here is the syntax, and the one rule that matters for terminal commands.

### The placeholders

Event fields: `${title}`, `${startDate}`, `${endDate}`, `${eventType}`, `${providerIdentifier}`, `${externalID}`, `${calendarID}`, `${color}`. Dates come out as ISO 8601.

Metadata, by dotted path: `${metadata.ip}`, `${metadata.host}`, and nested keys like `${metadata.disk.path}` walk into nested JSON objects.

So a script that POSTs a "host unreachable" event carrying `{"metadata": {"host": "nas.lan", "ip": "192.168.1.23"}}`, through the built-in Scripts source, can drive buttons that ping it, traceroute it, or run your own probe against it.

### Three trigger types, three escaping rules

Tempo escapes substituted values differently depending on where they land:

- Open URL: verbatim, since URL schemes handle their own escaping. `ssh://admin@${metadata.host}` opens `ssh://admin@nas.lan`.
- Copy to clipboard: verbatim too, because clipboard text is literal by design.
- Run in Terminal: Tempo wraps every substituted value in POSIX single quotes for you.

### The one rule for terminal commands

Because Tempo single-quotes the values, write the placeholder with no quotes around it. Use `~/bin/probe.sh ${metadata.host}`, not `~/bin/probe.sh "${metadata.host}"`.

It matters the moment a value has a space. A check script pointed at a mount, say `~/bin/spacecheck.sh ${metadata.mount}` with `mount` set to `/Volumes/Time Machine`, becomes `~/bin/spacecheck.sh '/Volumes/Time Machine'`, and it just works. Add your own quotes and you double them up and break it.

It isn't only about spaces, though. Single-quoting is what keeps a payload honest: whatever a sender puts in a field is treated as one literal string, never as shell syntax. A value like `$(reboot)` or `; rm -rf ~` lands as literal characters inside quotes. It can't break out and run. The payload is data; your click is the only thing that acts.

### Running something on a remote host

The event usually names a host, so the natural next move is to reach into it. SSH, and let Tempo quote the values:

`ssh admin@${metadata.host} systemctl status ${metadata.service}`

becomes `ssh admin@'nas.lan' systemctl status 'nginx'`. SSH joins the trailing arguments and runs `systemctl status nginx` on the host. Notice there are no quotes of your own around the placeholders. Tempo's single-quoting already makes each value one safe argument.

For a fixed command with nothing substituted into it, quoting it normally is fine:

`ssh admin@${metadata.host} 'tail -n 50 /var/log/syslog'`

But when a command gets real (a pipe, a value in the middle, anything you would otherwise quote twice), don't. Put the logic in a small script on the host and just call it:

`ssh admin@${metadata.host} ~/bin/diagnose.sh ${metadata.target}`

The command stays trivial to read, the logic lives where it runs, and there is no nested quoting to get wrong.

One practical note: these SSH buttons are smoothest with key-based auth set up. Add your public key to the host once, with `ssh-copy-id admin@nas.lan` or a matching entry in `~/.ssh/config`, and the command runs the instant you click. Without a key, Tempo still opens Terminal and runs the command; it just stops to ask for the password first. Keys are the safer option anyway.

### Missing values hide the button

If an action references a key the event doesn't carry, like `${metadata.ip}` on an event with no `ip`, Tempo doesn't render a broken button. It hides it. So you can write a rich set of buttons in a score and trust that each one only appears when the event actually has what it needs.

### A few real ones

| Trigger | You write | It runs or opens |
|---|---|---|
| Terminal | `ping ${metadata.ip}` | `ping '192.168.1.23'` |
| Terminal | `traceroute ${metadata.host}` | `traceroute 'nas.lan'` |
| Terminal | `~/bin/healthcheck.sh ${metadata.host}` | runs your probe against the host |
| Terminal | `ssh admin@${metadata.host} ~/bin/diagnose.sh` | runs your script on the remote host |
| Open URL | `ssh://admin@${metadata.host}` | opens an SSH session |
| Clipboard | `${metadata.ip}` | copies the raw IP |

### Opening in a specific browser

An Open URL action uses your default browser. To send a link somewhere specific, there are two paths.

Some browsers register their own URL scheme, so you can target them straight from an Open URL action:

- Chrome: `googlechromes://${metadata.host}:8006`. The `s` forces https; drop it for plain http.
- Firefox: `firefox://open-url?url=https://${metadata.host}:8006`
- Edge: `microsoft-edge://` works the same way as Chrome.

Safari, or any app, has no such scheme. To force it, use a Run in Terminal action with `open -a`:

`open -a Safari https://${metadata.host}:8006`

The `open -a <App>` form works for any installed browser, so it's the reliable fallback whenever a scheme isn't available. It resolves cleanly too, since Tempo quotes the substituted value: `open -a Safari https://'nas.lan':8006`.

### Where you write it

Two ways, same result. The Score Editor's Actions tab lets you add a button, pick the trigger, and type the command with `${...}` in it, no JSON needed. Or you can edit the score's JSON directly if you prefer files. Either way the JSON stays the source of truth.

Leo from [Caereforge](https://caereforge.com)
