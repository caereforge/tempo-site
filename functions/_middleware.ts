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
