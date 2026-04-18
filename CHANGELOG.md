# Changelog

Public, dated trail of changes to the Tempo landing page and project milestones
worth recording. Mirrors the Devlog section on [tempoapp.app](https://tempoapp.app/#devlog).

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/).
Dates are ISO 8601 (YYYY-MM-DD).

## [2026-04-18] — Accessibility pass (WCAG AA) + hero hierarchy

**Accessibility (WCAG AA):**

- Contrast fix: promoted informative text from `--text3` to `--text2`
  across navigation badge, hero subtitle, section titles, form note,
  footer, roadmap disclaimer, and devlog dates. All informative text
  now meets WCAG AA (≥4.5:1). Decorative uses of `--text3` kept
  (code comments, FAQ arrow icons, "Later" roadmap badge).
- Form label: replaced `display: none` hiding with the `.sr-only`
  pattern so screen readers announce the email field.
- Video demo: added native `controls`, `aria-label`, and a
  `prefers-reduced-motion: reduce` CSS block.
- FAQ: added `aria-expanded` attribute with JS sync, so screen
  readers announce open/closed state.
- Nav link touch targets raised from ~26px to ~44px (WCAG 2.5.5);
  `nav` padding reduced from `20px 40px` to `16px 40px` to
  compensate for the extra link height.
- Form inputs now expose a visible `:focus-visible` ring for
  keyboard users.

**Hero hierarchy:**

- Reduced `.hero-wordmark` from `clamp(52px, 10vw, 88px)` to
  `clamp(44px, 8vw, 72px)` so it stops competing with the h1.
- Promoted `.hero-wordmark-sub` ("the homelab event hub for macOS")
  from a 13px uppercase mini-caption to a proper positioning line
  (`clamp(16px, 1.8vw, 19px)`, weight 600, normal case, tight
  letter-spacing).
- Added a secondary CTA "See how it works ↓" under the waitlist
  form, anchoring to a new `#demo` id on the demo section — gives
  visitors not ready to give their email a path into the product.
- Minor: bumped `.footer-left strong` from `--text2` to `--text` to
  restore hierarchy after the parent promotion.

Driven by a structured design-critique produced with the Anthropic
Design plugin (`design:design-critique`).

## [2026-04-17] — Public site live

- Landing page online at tempoapp.app.
- Repository `caereforge/tempo-site` made public.
- Cloudflare Pages deploy pipeline wired up (Wrangler from local; GitHub
  Actions workflow committed for future auto-deploy on push).
- Positioning rewritten for homelab / Home Assistant audience: hero copy,
  sources strip aligned to V1 scope (Apple Calendar/Reminders, Home Assistant,
  Uptime Kuma, Kopia, UniFi, GitHub Actions), pricing FAQ added (€49 one-time
  + 15-day trial), roadmap aligned to actual V1 IN/OUT scope.
- Devlog section added to surface the dated trail on the site itself.

## [2026-04-13] — Domain registered

- `tempoapp.app` secured via Cloudflare Registrar.
- Project name and identity locked in: **Tempo**, as in musical tempo —
  the rhythm of what's happening across your homelab.
