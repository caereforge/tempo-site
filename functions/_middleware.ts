/**
 * Tempo site analytics — Pages Functions middleware.
 *
 * Captures aggregate page-view counts for tempoapp.app, mirroring the
 * server-side discipline of the downloads tracker Worker. No cookies,
 * no IP retention, no fingerprinting, no client-side beacon. Asset
 * requests (CSS, JS, fonts, images, etc.) are skipped to keep volume
 * tight and the dataset readable.
 *
 * Events captured (server-side aggregate only):
 *   - event_type: "page_view" | "feed" | "other"
 *   - path: the requested URL path
 *   - section: top-level section bucket (root / blog / docs / ...)
 *   - country: CF-IPCountry header (ISO-3166-1 alpha-2)
 *   - referer_bucket: where the visitor arrived from
 *   - ua_bucket: "browser" | "bot" | "feed_reader" | "other"
 *   - status_code: HTTP response status
 *   - asn / as_org: the visitor's Autonomous System (network operator). Used
 *     to separate real human visits (residential / mobile / business ASNs)
 *     from bots that fake a browser User-Agent but run on datacenter networks
 *     (AWS, Hetzner, OVH...). Stored raw and classified downstream in the
 *     query. An ASN aggregates thousands-to-millions of hosts, so it is not an
 *     identifier and cannot fingerprint a visitor — consistent with the
 *     no-fingerprinting stance.
 *
 * Bound to Analytics Engine dataset `tempo_visits` via the
 * `TEMPO_ANALYTICS` variable, configured in the Pages dashboard under
 * Settings → Functions → Bindings.
 *
 * See /privacy on tempoapp.app for the user-facing disclosure.
 */

interface Env {
  TEMPO_ANALYTICS: AnalyticsEngineDataset;
}

type EventType = "page_view" | "feed" | "other";
type RefererBucket =
  | "reddit"
  | "hn"
  | "github"
  | "search"
  | "social"
  | "direct"
  | "other";
type UABucket = "browser" | "bot" | "feed_reader" | "other";

const ASSET_RE =
  /\.(css|js|mjs|map|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot|webmanifest)$/i;

// Vulnerability scanner / probe patterns. Matching paths get a normal HTTP
// response but are NOT logged to Analytics Engine — keeps the visitor
// dataset focused on real navigation instead of internet background noise.
// Pattern set is conservative: only well-known scanner targets, never
// regular site paths.
const PROBE_RE =
  /^\/(?:\.env(?:\.|$|\/)|\.git[/.]|wp-(?:admin|login|content|includes|config)|xmlrpc\.php|wp-comments-post|wlwmanifest|phpmyadmin|administrator|configuration\.php|appsettings|secrets?\.json|credentials|\.DS_Store|backup\.(?:zip|tar|tar\.gz|sql)|\.aws\/|\.ssh\/|web\.config|actuator\/|api\/v\d+\/admin|console\/?$|admin\.php|jenkins\/|drupal|joomla)/i;

const FEED_PATHS = new Set([
  "/rss.xml",
  "/atom.xml",
  "/feed.xml",
  "/sitemap.xml",
  "/sitemap-index.xml",
]);

const KNOWN_SECTIONS = new Set([
  "blog",
  "docs",
  "gallery",
  "downloads",
  "scores",
  "roadmap",
  "privacy",
  "license",
  "changelog",
]);

function classifyPath(pathname: string): {
  shouldLog: boolean;
  eventType: EventType;
  section: string;
} {
  if (ASSET_RE.test(pathname)) {
    return { shouldLog: false, eventType: "other", section: "asset" };
  }
  if (PROBE_RE.test(pathname)) {
    return { shouldLog: false, eventType: "other", section: "probe" };
  }
  if (FEED_PATHS.has(pathname)) {
    return { shouldLog: true, eventType: "feed", section: "feed" };
  }

  const trimmed = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (trimmed === "") {
    return { shouldLog: true, eventType: "page_view", section: "root" };
  }

  const firstSegment = trimmed.split("/")[0];
  if (KNOWN_SECTIONS.has(firstSegment)) {
    return { shouldLog: true, eventType: "page_view", section: firstSegment };
  }

  return { shouldLog: true, eventType: "page_view", section: "other" };
}

function classifyReferer(referer: string, host: string): RefererBucket {
  if (!referer) return "direct";
  try {
    const url = new URL(referer);
    if (url.hostname === host) return "direct";

    const h = url.hostname.toLowerCase();
    if (/(^|\.)reddit\.com$/.test(h)) return "reddit";
    if (/(^|\.)news\.ycombinator\.com$/.test(h)) return "hn";
    if (/(^|\.)github\.com$/.test(h)) return "github";
    if (
      /(^|\.)(google|duckduckgo|bing|kagi|yahoo|brave|ecosia|qwant|startpage)\./.test(
        h,
      )
    ) {
      return "search";
    }
    if (
      /(^|\.)(twitter\.com|x\.com|threads\.net|linkedin\.com|facebook\.com|t\.co|youtube\.com|youtu\.be)$/.test(
        h,
      ) ||
      /(^|\.)(mastodon|bsky|hachyderm|piefed|lemmy)\./.test(h)
    ) {
      return "social";
    }
    return "other";
  } catch {
    return "other";
  }
}

function classifyUA(ua: string): UABucket {
  if (!ua) return "other";
  if (
    /(bot|spider|crawler|HeadlessChrome|crawl|preview|fetcher|index|monitor|check|scan|probe|httpx|wget|curl|Go-http-client|Python-urllib|Java\/)/i.test(
      ua,
    )
  ) {
    return "bot";
  }
  if (
    /(Feedly|NetNewsWire|Reeder|Inoreader|FreshRSS|Newsboat|Tiny Tiny RSS|Liferea|rss)/i.test(
      ua,
    )
  ) {
    return "feed_reader";
  }
  if (/(Safari|Chrome|Firefox|Edg|Brave|Vivaldi|Arc|Opera|Mobile|Gecko)/i.test(ua)) {
    return "browser";
  }
  return "other";
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;

  // Always serve the static response first. Logging never delays or
  // affects what the user sees.
  const response = await next();

  try {
    const url = new URL(request.url);
    const { shouldLog, eventType, section } = classifyPath(url.pathname);
    if (!shouldLog) return response;

    const ua = request.headers.get("user-agent") ?? "";
    const referer = request.headers.get("referer") ?? "";
    const country = request.headers.get("cf-ipcountry") ?? "XX";

    const refererBucket = classifyReferer(referer, url.hostname);
    const uaBucket = classifyUA(ua);
    const status = String(response.status);
    // Network operator of the visit. This is the discriminator that catches
    // bots faking a browser User-Agent: real humans arrive on residential /
    // mobile / business ASNs, datacenter ASNs are almost always automation.
    // Stored raw (number + org name); the datacenter-vs-human split is done in
    // the query, never baked into a stale allowlist here.
    const asn = String(request.cf?.asn ?? "");
    const asOrg = String(request.cf?.asOrganization ?? "").slice(0, 128);

    context.waitUntil(
      Promise.resolve().then(() => {
        try {
          env.TEMPO_ANALYTICS.writeDataPoint({
            blobs: [
              eventType,
              url.pathname,
              section,
              country,
              refererBucket,
              uaBucket,
              status,
              asn,
              asOrg,
            ],
            doubles: [1],
            indexes: [eventType],
          });
        } catch {
          // Never let analytics break anything.
        }
      }),
    );
  } catch {
    // Wrapping the whole logging block so the response is never affected.
  }

  return response;
};
