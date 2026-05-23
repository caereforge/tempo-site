# Webhook & Notification Research for Tempo Score Catalog

Research date: 2026-05-23. Covers 100+ tools across homelab, DevOps, Mac productivity, IoT, media, office, and monitoring categories. Purpose: inform score development, documentation, and integration templates for Tempo V1.x and V1.1.

---

## Bundled Sources (already have scores)

### Home Assistant
- **Webhook:** Yes, via `rest_command` (outgoing POST from automations)
- **Key fields:** `entity_id`, `state`, `device_class`, `friendly_name`, `area_name`, `attributes.*`, `event_type`, `from_state`, `to_state`
- **Notes:** User constructs the payload via Jinja2 templates. Bundled HA score already has 67 rules. Need to ship a ready-to-paste `rest_command` YAML template.
- **Docs:** [rest_command](https://www.home-assistant.io/integrations/rest_command/), [triggers](https://www.home-assistant.io/docs/automation/trigger/), [templating](https://www.home-assistant.io/docs/configuration/templating/)

### Kopia
- **Webhook:** Yes (native, since v0.19+). Webhook, Email, Pushover notification profiles.
- **Key fields:** Snapshot ID, source host/user/path, start/end time, duration, total file size/count, error count, delta vs previous, failed entries
- **Caveat:** Webhook sends rendered text/HTML body, NOT structured JSON. Subject in HTTP header. Template customizable via `kopia notification template set` — could output JSON.
- **Also:** Snapshot Actions (shell scripts with env vars: `KOPIA_SNAPSHOT_ID`, `KOPIA_SOURCE_PATH`)
- **Docs:** [webhook CLI](https://kopia.io/docs/reference/command-line/common/notification-profile-configure-webhook/), [actions](https://kopia.io/docs/advanced/actions/)

### Uptime Kuma
- **Webhook:** Yes (generic webhook among 90+ notification providers)
- **Key fields:** `heartbeat.status` (0=DOWN,1=UP,2=PENDING,3=MAINTENANCE), `heartbeat.msg`, `heartbeat.ping`, `heartbeat.time`, `heartbeat.duration`, `monitor.name`, `monitor.url`, `monitor.type`, `monitor.tags[]`
- **Custom body:** Liquid template syntax with `{{ msg }}`, `{{ status }}`, `{{ name }}`, `{{ monitorJSON.* }}`, `{{ heartbeatJSON.* }}`
- **Docs:** [webhook source](https://github.com/louislam/uptime-kuma/blob/master/server/notification-providers/webhook.js), [wiki](https://github.com/louislam/uptime-kuma/wiki/Notification-Methods)

### UniFi Network + Protect
- **Webhook:** Yes, via Alarm Manager (GET or POST to any URL)
- **Network events:** Client connected/disconnected, WAN offline/failover, threat detected, honeypot, device adopted/offline, VPN disconnect
- **Protect events:** Motion, person, vehicle, animal, package, face (known/unknown), line crossing, audio alarms (smoke, CO, glass break, siren, baby cry, bark), doorbell ring
- **Protect payload:** `alarm.name`, `alarm.sources[].device` (MAC), `alarm.triggers[].key` (detection type), `alarm.thumbnail` (base64 JPEG), `timestamp`
- **Caveat:** No official public API docs — all community reverse-engineered
- **Docs:** [Alarm Manager](https://help.ui.com/hc/en-us/articles/27721287753239), [Protect webhooks](https://help.ui.com/hc/en-us/articles/25478744592023)

### Synology DSM
- **Webhook:** Yes (DSM 7+, Control Panel > Notification > Webhooks)
- **Template vars:** `@@TEXT@@` (message body), `@@PREFIX@@` (title), `%HOSTNAME%`, `%DATE%`, `%TIME%`
- **Events:** Storage/SMART, power/UPS, security, network, system updates, Hyper Backup, Surveillance Station, Download Station, etc.
- **Caveat:** Payload is template-based text, not structured JSON with discrete event-type/severity fields
- **Docs:** [Webhooks](https://kb.synology.com/en-us/DSM/help/DSM/AdminCenter/system_notification_webhook)

### GitHub Actions
- **Webhook:** Yes (repository webhook events)
- **Key events:** `workflow_run` (requested/in_progress/completed), `workflow_job` (queued/in_progress/completed)
- **Key fields:** `workflow_run.name`, `.status`, `.conclusion` (success/failure/cancelled/timed_out), `.head_branch`, `.head_sha`, `.html_url`, `.run_number`, `.created_at`, `.run_started_at`, `.updated_at`
- **Duration:** Not a direct field, compute from `updated_at - run_started_at`
- **Docs:** [webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads), [creating webhooks](https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks)

### Scripts (generic)
- **Webhook:** N/A — user scripts POST directly to Tempo
- **Key fields:** User-defined. Convention: `metadata.keyword`, `metadata.script_name`, `metadata.host`

---

## Catalog Sources (downloadable scores exist)

### Proxmox VE + PBS
- **Webhook:** Yes (PVE 8.3+ / PBS 3.3+, native webhook target)
- **PVE events:** `vzdump` (backup success/fail), `replication` (failure), `fencing`, `package-updates`, `system-mail`
- **PBS events:** `gc`, `prune`, `sync`, `tape-backup`, `tape-load`, `verification`, `acme`, `package-updates`
- **Template vars:** `{{ title }}`, `{{ message }}`, `{{ severity }}`, `{{ timestamp }}`, `{{ fields.<name> }}`, `{{ secrets.<name> }}`
- **Helpers:** `{{ escape }}`, `{{ url-encode }}`, `{{ json fields }}`
- **Caveat:** VM start/stop/migrate NOT covered by notification events (need hookscripts)
- **Docs:** [PVE notifications](https://pve.proxmox.com/pve-docs/chapter-notifications.html), [PBS notifications](https://pbs.proxmox.com/docs/notifications.html)

### Pi-hole
- **Webhook:** No. Read-only REST API only.
- **Workaround:** Poll API or use third-party scripts
- **Docs:** [API](https://docs.pi-hole.net/api/)

### Jellyfin
- **Webhook:** Yes (via official plugin)
- **Events:** ItemAdded, PlaybackStart/Progress/Stop, AuthenticationFailure/Success, SessionStart, PendingRestart, UserCreated/Deleted, etc.
- **Key fields:** ServerName, NotificationType, Timestamp, ItemId, ItemType, Name, SeriesName, SeasonNumber, EpisodeNumber, DeviceName, UserName
- **Docs:** [webhook plugin](https://github.com/jellyfin/jellyfin-plugin-webhook)

### Vaultwarden
- **Webhook:** Yes (native, `WEBHOOK_URL` env var)
- **Events:** Cipher CRUD (1100-series), login events (1000-series), org events (1500-series)
- **Payload:** Bitwarden event log schema — metadata/IDs only, never vault item contents
- **Docs:** [wiki](https://github.com/dani-garcia/vaultwarden/wiki)

---

## Roadmap Sources (planned scores)

### Tailscale
- **Webhook:** Yes (native, all plans)
- **Events:** `nodeCreated/Deleted/Approved/KeyExpired/KeyExpiringInOneDay/NeedsApproval`, `policyUpdate`, `userCreated/Approved/RoleUpdated`, `exitNodeIPForwardingNotEnabled`, `subnetIPForwardingNotEnabled`
- **NOT available:** Node online/offline, auth key usage, exit node changes
- **Payload:** JSON array of events, each with `timestamp`, `version`, `type`, `tailnet`, `message`, `data` (nodeID, deviceName, managedBy, actor, url)
- **Signing:** `Tailscale-Webhook-Signature` header (HMAC-SHA256)
- **Docs:** [webhooks](https://tailscale.com/kb/1213/webhooks)

### Grafana
- **Webhook:** Yes (native contact point)
- **Events:** Alert state changes (firing, resolved)
- **Key fields:** `receiver`, `status`, `alerts[]` (status, labels, annotations, startsAt, endsAt, generatorURL, values), `groupLabels`, `commonLabels`, `title`, `message`, `state`
- **Docs:** [webhook notifier](https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/webhook-notifier/)

### Prometheus Alertmanager
- **Webhook:** Yes (native receiver)
- **Key fields:** `version`, `groupKey`, `status` (firing|resolved), `alerts[]` (status, labels, annotations, startsAt, endsAt, generatorURL, fingerprint)
- **Docs:** [configuration](https://prometheus.io/docs/alerting/latest/configuration/)

### TrueNAS
- **Webhook:** No generic webhook (on roadmap). Supports Slack, PagerDuty, Email, SNMP.
- **Events:** Pool degraded, SMART, replication, scrub, network, service failures
- **Workaround:** Point Slack webhook URL at relay service
- **Docs:** [alert services](https://www.truenas.com/docs/scale/systemsettings/alertssettingsservicescreen/)

### pfSense / OPNsense
- **pfSense:** No native webhook (PR pending). SMTP/Telegram/Pushover only.
- **OPNsense:** Partial (via Monit scripts). Community tool [opnsense-alerts](https://github.com/AstroEldravn/opnsense-alerts).
- **Events:** Gateway status, interface link, disk usage, certificate expiry, IPsec tunnel, OpenVPN

### AdGuard Home
- **Webhook:** No. Feature requested, not implemented (DoS concerns).
- **Workaround:** HA integration polls sensors

### Portainer
- **Webhook:** Inbound only (POST triggers container redeploy). No outgoing event notifications.

### Docker
- **Webhook:** Partial. Registry has native push/pull notifications. Engine needs third-party bridge for `docker events`.
- **Docker Hub:** Outgoing webhooks on image push

### Sonarr / Radarr / Lidarr / Readarr
- **Webhook:** Yes (all have native webhook, Settings > Connect)
- **Events:** Grab, Download, Upgrade, Rename, SeriesAdd/Delete, Health, ApplicationUpdate
- **Payload:** Rich JSON with series/movie/album info, release details, quality, file paths
- **Docs:** [Servarr wiki](https://wiki.servarr.com/sonarr/settings#connect)

### Nextcloud
- **Webhook:** Yes (native since v28+)
- **Events:** File CRUD, calendar events, share events, user lifecycle, app enable/disable, login/logout
- **Signing:** `X-Nextcloud-Webhooks` header (HMAC)
- **Caveat:** Default delivery latency up to 5 min (cron-based)
- **Docs:** [webhook listeners](https://docs.nextcloud.com/server/stable/admin_manual/webhook_listeners/index.html)

### Gitea / Forgejo
- **Webhook:** Yes (native, extensive, GitHub-compatible)
- **Events:** create, delete, fork, push, issues, pull_request, pull_request_review, repository, release, package, wiki (20+ types)
- **Docs:** [Gitea webhooks](https://docs.gitea.com/usage/webhooks), [Forgejo webhooks](https://forgejo.org/docs/next/user/webhooks/)

### Cloudflare Notifications
- **Webhook:** Yes (native generic webhook)
- **Events:** DDoS, SSL/TLS, Tunnel health, DNS changes, WAF, Load Balancing, Pages builds, Workers errors, Billing, Origin Health
- **Signing:** `cf-webhook-auth` header
- **Docs:** [configure webhooks](https://developers.cloudflare.com/notifications/get-started/configure-webhooks/), [payload schema](https://developers.cloudflare.com/notifications/reference/webhook-payload-schema/)

---

## Not in Roadmap — Good Webhook Support

### Restic
- **Webhook:** No native. JSON output with `--json` flag.
- **Key fields (summary):** `snapshot_id`, `files_new/changed/unmodified`, `data_added/data_added_packed`, `total_files_processed`, `total_bytes_processed`, `backup_start/end`, `total_duration`
- **Integration:** Wrapper script parses JSON summary + exit code, POSTs to Tempo
- **Alternative wrappers:** Backrest (Discord/Slack/Gotify/HC.io), resticprofile (HTTP hooks with Go templates)
- **Docs:** [scripting](https://restic.readthedocs.io/en/stable/075_scripting.html)

### CrowdSec
- **Webhook:** Yes (native HTTP notification plugin)
- **Key fields:** `Alert.Source.Value` (IP), `Alert.Scenario`, `Alert.Decisions[].Type/Duration`, `Alert.EventsCount`, `Alert.StartAt/StopAt`
- **Docs:** [HTTP plugin](https://docs.crowdsec.net/docs/notification_plugins/http/)

### Fail2ban
- **Webhook:** Yes (via custom action.d with curl)
- **Events:** `actionban`, `actionunban`, `actionstart`, `actionstop`
- **Variables:** `<ip>`, `<name>` (jail), `<failures>`, `<bantime>`, `<time>`, `<match>`

### Watchtower
- **Webhook:** Yes (via Shoutrrr generic webhook)
- **Events:** Container updated, update failed, session summary
- **Note:** Original repo archived Dec 2025, maintained fork by nicholas-fedor

### Diun (Docker Image Update Notifier)
- **Webhook:** Yes (native, first-class)
- **Key fields:** `status` (new/update), `image`, `digest`, `created`, `platform`, `hub_link`
- **Docs:** [webhook notifier](https://crazymax.dev/diun/notif/webhook/)

### Healthchecks.io
- **Webhook:** Yes (native outgoing)
- **Events:** Check goes down, check goes up
- **Variables:** `$NAME`, `$STATUS`, `$TAGS`, `$BODY`
- **Docs:** [healthchecks.io/docs](https://healthchecks.io/docs/)

### Plex
- **Webhook:** Yes (Plex Pass required)
- **Events:** media.play/pause/resume/stop/scrobble/rate, library.new, admin.database.backup/corrupted, device.new
- **Caveat:** Sends multipart/form-data, not application/json
- **Docs:** [webhooks](https://support.plex.tv/articles/115002267687-webhooks/)

### Tautulli
- **Webhook:** Yes (richest Plex notification system)
- **Events:** Playback Start/Stop/Pause/Resume/Error, Watched, Buffer Warning, Recently Added, Plex Server Down/Up
- **Variables:** `{title}`, `{show_name}`, `{username}`, `{player}`, `{quality_full}`, `{server_name}`, `{poster_url}`, `{plex_url}`
- **Docs:** [notification agents guide](https://docs.tautulli.com/using-tautulli/notification-agents-guide)

### Miniflux
- **Webhook:** Yes (native since v2.0.48)
- **Events:** `new_entries`
- **Payload:** Feed + entries array with full content
- **Signing:** `X-Miniflux-Signature` (HMAC-SHA256)
- **Docs:** [webhooks](https://miniflux.app/docs/webhooks.html)

### Overseerr / Jellyseerr
- **Webhook:** Yes (native, 12 event types)
- **Events:** MEDIA_PENDING/APPROVED/AVAILABLE/DECLINED/FAILED, ISSUE_CREATED/COMMENT/RESOLVED/REOPENED
- **Docs:** [webhooks](https://docs.overseerr.dev/master/using-overseerr/notifications/webhooks)

### Invoice Ninja
- **Webhook:** Yes (native, 59+ events)
- **Events:** Full CRUD on Client, Invoice, Quote, Payment, Expense, Task, Project, Credit, Product, Purchase Order
- **Docs:** [webhooks](https://invoiceninja.github.io/en/webhooks/)

### Firefly III
- **Webhook:** Yes (native)
- **Triggers:** STORE/UPDATE/DESTROY_TRANSACTION, STORE/UPDATE/DESTROY_BUDGET, ANY
- **Docs:** [webhooks](https://docs.firefly-iii.org/how-to/firefly-iii/features/webhooks/)

### Paperless-ngx
- **Webhook:** Yes (via Workflows, v2.3+)
- **Events:** Consumption Started, Document Added, Document Updated, Scheduled
- **Template vars:** `{{doc_title}}`, `{{correspondent}}`, `{{document_type}}`, `{{tags}}`, `{{custom_fields}}`
- **Docs:** [workflows](https://docs.paperless-ngx.com/usage/#workflow-action-webhook)

### BookStack
- **Webhook:** Yes (native, 40+ activity types)
- **Events:** Page/Chapter/Book/Bookshelf CRUD, comments, auth events, settings, permissions
- **Docs:** [webhooks](https://www.bookstackapp.com/docs/admin/webhooks/)

### Outline
- **Webhook:** Yes (native, 50+ events)
- **Events:** Documents, collections, comments, users, groups, revisions, attachments, shares, pins
- **Docs:** [developers](https://www.getoutline.com/developers)

### Planka
- **Webhook:** Yes (native, 40+ events)
- **Events:** Cards, boards, lists, comments, tasks, projects, custom fields, attachments, labels, users
- **Docs:** [docs.planka.cloud](https://docs.planka.cloud)

### Vikunja
- **Webhook:** Yes (native, project + user scopes)
- **Events:** task.created/updated/deleted, task.assignee/comment/attachment/relation events, project events
- **Signing:** HMAC-SHA256 via `X-Vikunja-Signature`
- **Docs:** [webhooks](https://vikunja.io/docs/webhooks)

### Netdata
- **Webhook:** Yes (Cloud + Agent level)
- **Events:** Alert state transitions (CLEAR/WARNING/CRITICAL)
- **Key fields:** `alarm_name`, `chart`, `status`, `old_status`, `value`, `host`, `duration`
- **Docs:** [webhook](https://learn.netdata.cloud/docs/alerts-&-notifications/notifications/centralized-cloud-notifications/webhook)

### Zabbix
- **Webhook:** Yes (native media type, JavaScript payload transformation)
- **Events:** Trigger/problem events (PROBLEM/RESOLVED/UPDATE), discovery, autoregistration
- **Docs:** [webhook](https://www.zabbix.com/documentation/current/en/manual/config/notifications/media/webhook)

### ChangeDetection.io
- **Webhook:** Yes (native + Apprise)
- **Key fields:** Watch URL, title, current/previous snapshot, diff, trigger text, screenshot URL
- **Docs:** [notification config](https://github.com/dgtlmoon/changedetection.io/wiki/Notification-configuration)

### MinIO
- **Webhook:** Yes (first-class, S3-compatible event notifications)
- **Events:** ObjectCreated/Removed/Accessed/Restored, BucketCreated/Removed, Replication
- **Payload:** Amazon S3 event notification JSON format
- **Docs:** [bucket notifications](https://docs.min.io/enterprise/aistor-object-store/administration/bucket-notifications/)

### Duplicati
- **Webhook:** Yes (built-in `--send-http-json-urls`)
- **Key fields:** OperationName, ParsedResult (Success/Warning/Error), Duration, ExaminedFiles, BytesUploaded/Downloaded, Errors, Warnings
- **Docs:** [advanced options](https://docs.duplicati.com/community-docs/community-docs-advanced-options)

### Authentik
- **Webhook:** Yes (native Notification Transports)
- **Events:** login, login_failed, logout, authorize_application, user_write, model CRUD, policy_execution, system_exception, password_set, flow_execution
- **Docs:** [events](https://docs.goauthentik.io/docs/events/)

### ZeroTier
- **Webhook:** Yes (paid plans, ZeroTier Central)
- **Events:** NETWORK_JOIN/AUTH/DEAUTH, org membership events
- **Signing:** `X-ZTC-Signature`
- **Docs:** [webhooks](https://docs.zerotier.com/webhooks/)

### Gatus
- **Webhook:** Yes (native)
- **Events:** Endpoint triggered (unhealthy) / resolved (healthy)
- **Docs:** [alerting](https://gatus.io/docs/alerting/overview)

### Semaphore (Ansible UI)
- **Webhook:** Yes (native)
- **Events:** Task START/SUCCESS/FAILURE
- **Signing:** HMAC-SHA256 via `X-Semaphore-Signature-256`
- **Docs:** [notifications](https://semaphoreui.com/docs/administration-guide/notifications)

### AWX/Tower (Ansible)
- **Webhook:** Yes (native, first-class)
- **Events:** Job started/succeeded/failed
- **Payload:** Jinja2-customizable, full job metadata
- **Docs:** [notifications](https://docs.ansible.com/ansible-tower/latest/html/userguide/notifications.html)

### SonarQube
- **Webhook:** Yes (native)
- **Events:** Quality gate status after analysis
- **Signing:** HMAC-SHA256 via `X-SonarQube-Signature`
- **Docs:** [webhooks](https://docs.sonarsource.com/sonarqube/latest/project-administration/webhooks/)

### Harbor
- **Webhook:** Yes (native)
- **Events:** PUSH/PULL/DELETE_ARTIFACT, SCANNING_COMPLETED/FAILED, QUOTA events, REPLICATION, TAG_RETENTION
- **Docs:** [webhooks](https://goharbor.io/docs/latest/working-with-projects/project-configuration/configure-webhooks/)

### Sentry
- **Webhook:** Yes (via Internal Integrations)
- **Events:** issue (created/resolved/assigned), error, comment, event_alert, metric_alert
- **Signing:** HMAC-SHA256
- **Docs:** [webhooks](https://docs.sentry.io/organization/integrations/integration-platform/webhooks/)

### Docuseal
- **Webhook:** Yes (native)
- **Events:** form.viewed/started/completed/declined, submission CRUD, template CRUD
- **Docs:** [API](https://www.docuseal.com/docs/api)

### Tdarr
- **Webhook:** Yes (native)
- **Events:** transcode_start/success/error, health_check_start/success/error

### Unmanic
- **Webhook:** Yes (via plugin)
- **Events:** worker_start/complete, postprocessor_task_results

---

## Not in Roadmap — No Webhook (need wrapper/bridge)

### Tools that need a shell script wrapper to POST to Tempo:
- **Restic** — JSON output with `--json`, parse summary + exit code
- **rsnapshot** — `cmd_preexec`/`cmd_postexec` hooks
- **Rclone** — No hooks, wrap in script or use GoMFT
- **Time Machine** — Distributed notifications via Hammerspoon or Shortcuts.app
- **Homebrew** — No hooks, wrap `brew` in alias/function
- **Arq Backup** — Post-flight shell scripts
- **Carbon Copy Cloner** — Post-flight shell scripts
- **qBittorrent** — "Run external program on completion" with `%N`, `%D`, `%Z` vars
- **Transmission** — `script-torrent-done-filename` hook with `TR_TORRENT_*` env vars
- **Deluge** — Execute plugin (torrent added/completed)
- **SABnzbd** — Notification scripts + Apprise URLs

### Tools with no webhook AND no easy workaround:
- **Pi-hole** — Poll API only
- **AdGuard Home** — Poll API only
- **Little Snitch** — No API, log monitoring only
- **Lulu** — No API, log monitoring only
- **Hetzner Cloud** — No alerting system
- **Nebula VPN** — Log-only
- **Unbound DNS** — Log-only
- **CoreDNS** — dnstap streaming, no webhook
- **Cockpit** — No webhook (feature request open)
- **Standard Notes** — E2E encrypted, no server-side events
- **Actual Budget** — Local-first, Node.js API only
- **Monica CRM** — Email/Telegram reminders only
- **Calibre-Web** — No webhook (feature request pending)
- **Immich** — No webhook (feature request pending)
- **Linkding** — No webhook (feature request pending)
- **Wiki.js** — v3 planned, v2 has nothing
- **Stirling-PDF** — Stateless processor

---

## Bridge Tools (relay from tools without webhooks)

| Tool | Best Role | How |
|------|-----------|-----|
| **Apprise** | Universal adapter | `json://tempo-url` routes any Apprise-compatible tool to Tempo |
| **Node-RED** | Most flexible bridge | HTTP in + transform + HTTP out, or MQTT subscriber + HTTP out |
| **n8n** | Structured bridge with logging | Webhook trigger + Code node + HTTP Request |
| **ntfy** | Lightweight pub/sub | Tools POST to topic, subscriber forwards to Tempo |
| **Gotify** | Collection point | WebSocket listener relays to Tempo |
| **MQTT/Mosquitto** | IoT data bridge | Needs Node-RED/n8n/mqttwarn to bridge to HTTP |

---

## IoT / Smart Home

| Tool | Native Webhook | Mechanism |
|------|---------------|-----------|
| **EMQX** | Yes | Rule Engine + Webhook Sink |
| **Shelly (Gen2+)** | Yes | Native, up to 20 hooks/device |
| **HomeSeer (HS4)** | Yes | Built-in, all device events |
| **ESPHome** | Indirect | `http_request` component in automations |
| **Tasmota** | Indirect | `WebQuery` in Rules |
| **openHAB** | Indirect | HTTP Actions in rules |
| **ioBroker** | Indirect | JavaScript adapter scripts |
| **Homebridge** | No (plugin) | homebridge-http-webhooks |
| **Zigbee2MQTT** | No | MQTT only, bridge needed |
| **deCONZ/Phoscon** | No | WebSocket only |

---

## Mac-Specific Tools

| Tool | Native HTTP | Event-Driven | Integration |
|------|------------|-------------|-------------|
| **Hammerspoon** | Yes (`hs.http`) | Excellent (many watchers) | Best Mac event-to-HTTP bridge |
| **Keyboard Maestro** | Yes (POST/GET URL action) | Excellent (many triggers) | Native webhook sender |
| **BetterTouchTool** | Yes (Send HTTP Request) | Good | Native webhook sender |
| **Shortcuts.app** | Yes (Get Contents of URL) | Good (automations) | No-code webhook sender |
| **Raycast** | Yes (fetch in extensions) | Limited (user-invoked) | Medium |
| **Alfred** | Via shell scripts | Limited (user-invoked) | Medium |
| **Stream Deck** | Via plugins/scripts | User-triggered | Can trigger HTTP requests |

### Mac Productivity Apps (detailed)

| App | AppleScript | Shortcuts | Native HTTP | Event Triggers | Tempo Integration Path |
|-----|:-----------:|:---------:|:-----------:|:--------------:|----------------------|
| **DEVONthink** | Full | No | Via script | Rich (import, modify, tag, schedule via Smart Rules) | Smart Rule → shell script → POST |
| **Drafts** | No | Yes | **Yes** (HTTP class) | Manual/chained actions | Native HTTP action step |
| **OmniFocus** | Full (Pro) | Yes | **Yes** (URL.FetchRequest) | Manual/URL only | Native Omni Automation JS |
| **Notion** | No | No | **Yes** (webhook actions) | Property/schema/comment changes | Native outgoing webhooks |
| **Obsidian** | No | Limited | Via plugins | Via plugin API (file create/modify/delete) | Webhooks plugin or Templater |
| **Hazel** | Yes | Yes | Via shell | File appears/changes in folder | Shell script → POST |
| **PopClip** | Yes | No | Via shell | Text selection | Shell script extension |
| **Things 3** | Full | Yes | No | None | AppleScript → shell → POST |
| **Fantastical** | Limited | Yes | No | None | Shortcuts bridge |
| **Bear** | No | Yes | No | None | Shortcuts bridge |
| **Craft** | No | Yes | No | None | Shortcuts bridge |
| **Hookmark** | Pro | Yes | No | None (action-driven) | AppleScript bridge |
| **Cardhop** | Limited | Yes | No | None | Shortcuts bridge |
| **MindNode** | Yes | Yes | No | None | Shortcuts bridge |
| **Marked 2/3** | Partial | No | No | On render | Preprocessor script |

### Mac System/Utility Apps (detailed)

| Tool | Automation | HTTP Out | Events | Tempo Path |
|------|-----------|----------|--------|------------|
| **Bunch** | AppleScript, Shortcuts, CLI, curl | **Yes** (curl in scripts) | Schedule/URL trigger | Direct curl POST |
| **Stream Deck** | Plugins | **Yes** (API Request plugin) | Button press | Plugin POST |
| **Audio Hijack** | Full JS API | Via runShellCommand | Session start/stop/record | Script → curl |
| **1Password** | Shortcuts, CLI (`op`) | Events API (poll) | Sign-in, item usage (business) | Poll Events API |
| **Tower** | Git hooks | Via hooks | Push/pull/fetch completion | Hook → curl |
| **iStat Menus** | AppleScript | No | CPU/memory/disk/network thresholds | Notification Center bridge |
| **Typinator** | AppleScript | No | On expansion (scripts) | Inline script |
| **TextExpander** | AppleScript | No | On expansion (scripts) | Inline script |
| **Transmit** | Full AppleScript | No | None (imperative) | Wrap in script |
| **ForkLift** | AppleScript | No | None | Wrap in script |
| **Bartender** | AppleScript | No | None | — |
| **Proxyman** | CLI, MCP | MCP | None (debug tool) | — |
| **SoundSource** | Shortcuts (17 actions) | No | None | — |
| **CleanMyMac** | None | No | None | — |
| **Strongbox** | None | No | None | — |
| **Screens/Jump Desktop** | URL scheme only | No | None | — |
| **Pastebot** | Shell filters | No | None | — |

---

## Monitoring / Observability

| Tool | Native Webhook | Notes |
|------|---------------|-------|
| **Grafana** | Yes | Alert contact point |
| **Prometheus Alertmanager** | Yes | Standard alerting schema |
| **Zabbix** | Yes | JavaScript payload transformation |
| **Netdata** | Yes | Cloud + Agent |
| **ChangeDetection.io** | Yes | Jinja2 + Apprise |
| **Gatus** | Yes | Config-driven |
| **Checkmk** | Yes | Custom HTTP notification |
| **LibreNMS** | Yes | API/cURL transport |
| **Uptime Robot** | Yes | Alert contacts |
| **Speedtest Tracker** | Yes | Via Apprise/Laravel |
| **Statping-ng** | Yes | Unmaintained since ~2022 |
| **Monit** | No | exec workaround |
| **Smokeping** | No | Script workaround |

---

## CI/CD & Dev Tools

| Tool | Native Webhook | Notes |
|------|---------------|-------|
| **GitLab** | Yes | 15+ event types, rich JSON |
| **Gitea/Forgejo** | Yes | GitHub-compatible, 20+ events |
| **Harbor** | Yes | Registry events |
| **SonarQube** | Yes | Quality gate events |
| **Sentry** | Yes | Issue/error/alert events |
| **AWX/Tower** | Yes | Job lifecycle, Jinja2 templates |
| **Semaphore** | Yes | Ansible task events |
| **Jenkins** | Yes (plugin) | Notification Plugin |
| **Drone CI** | Yes (plugin) | Pipeline events |
| **Woodpecker CI** | Yes (plugin) | Pipeline events |
| **Uptime Robot** | Yes | Monitor up/down |

---

## NAS / Storage

| Tool | Native Webhook | Notes |
|------|---------------|-------|
| **MinIO** | Yes | S3-compatible event notifications |
| **Duplicati** | Yes | `--send-http-json-urls` |
| **BorgBackup/Borgmatic** | Partial | Shell hooks + 12 monitoring integrations |
| **Syncthing** | No | Rich Event API but poll-only |
| **TrueNAS** | No | Slack/PagerDuty only, generic on roadmap |
| **Unraid** | No | Discord agent workaround |
| **OpenMediaVault** | No | sink.d shell scripts |
| **Seafile** | No | Redis pub/sub |
| **Rclone** | No | Wrapper scripts |
| **rsnapshot** | No | pre/post hooks |

---

## DNS / VPN / Network

| Tool | Native Webhook | Notes |
|------|---------------|-------|
| **Cloudflare Notifications** | Yes | Dozens of alert types |
| **Cloudflare Tunnel** | Yes | Health status events |
| **AWS SNS/CloudWatch** | Yes | HTTP/S subscriptions |
| **ZeroTier** | Yes | Paid plans, network events |
| **Tailscale** | Yes | All plans, node/policy events |
| **Linode/Akamai** | Yes (beta) | ACLP custom webhooks |
| **WireGuard Portal** | Yes | Connect/disconnect/CRUD |
| **DigitalOcean** | No | Slack/email only |
| **Hetzner Cloud** | No | No alerting system |
| **Unbound** | No | Log-only |
| **CoreDNS** | No | dnstap only |
| **Nebula** | No | Log-only |

---

## Office / Productivity

| Tool | Webhooks | Events |
|------|----------|--------|
| **Invoice Ninja** | Yes | 59+ events, full CRUD |
| **Outline** | Yes | 50+ events |
| **BookStack** | Yes | 40+ events |
| **Planka** | Yes | 40+ events |
| **Vikunja** | Yes | 18 events |
| **Paperless-ngx** | Yes | 4 triggers + rich filters |
| **Docuseal** | Yes | 11 events |
| **Firefly III** | Yes | 8 triggers |
| **Miniflux** | Yes | 1 event (new_entries) |
| **Mealie** | Partial | Scheduled + Apprise |
| **Wallabag** | Unclear | Possibly via rules |
| **Grocy** | No | Label printer only |
| **Monica CRM** | No | Email/Telegram reminders |
| **Actual Budget** | No | Local-first |
| **Calibre-Web** | No | Feature request |
| **Immich** | No | Feature request |
| **Linkding** | No | Feature request |
| **Standard Notes** | No | E2E encrypted |
| **Trilium Notes** | No | Internal scripting only |
| **Wiki.js** | No (v3 planned) | Storage events internal |
| **Stirling-PDF** | No | Stateless |

---

## Media / Content

| Tool | Webhooks | Notes |
|------|----------|-------|
| **Plex** | Yes | Plex Pass required |
| **Tautulli** | Yes | Richest Plex notifications |
| **Jellyfin** | Yes (plugin) | Official webhook plugin |
| **Overseerr/Jellyseerr** | Yes | 12 event types |
| **Sonarr/Radarr/Lidarr/Readarr** | Yes | Full lifecycle, Servarr schema |
| **Prowlarr** | Yes | Grab, health, update |
| **Tdarr** | Yes | Transcode lifecycle |
| **Unmanic** | Yes (plugin) | Worker lifecycle |
| **Audiobookshelf** | Apprise | 3 events |
| **SABnzbd** | Script + Apprise | 12 event types |
| **Transmission** | Script hooks | 2 events |
| **Deluge** | Script hooks (plugin) | 2 events |
| **Calibre-Web** | No | — |

---

## Security / Auth

| Tool | Webhooks | Notes |
|------|----------|-------|
| **CrowdSec** | Yes | HTTP notification plugin |
| **Authentik** | Yes | All event types |
| **Fail2ban** | Via action.d | curl in custom action |
| **Keycloak** | No (SPI needed) | Community extension available |
| **Authelia** | No | Feature request open |
| **Vaultwarden** | Yes | Event metadata only |

---

*Last updated: 2026-05-23. Mac productivity and system tools sections pending completion (2 agents still running).*
