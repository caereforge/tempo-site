/**
 * Tempo download tracker Worker.
 *
 * Sits in front of downloads.tempoapp.app, serves files from R2,
 * and writes aggregate request events to Cloudflare Analytics Engine.
 *
 * Events captured (server-side aggregate only):
 *   - event_type: "download" | "update_check" | "checksum" | "head_check" | "other"
 *   - path: the requested URL path
 *   - version: extracted from filename or Sparkle UA when present
 *   - country: CF-IPCountry header (ISO-3166-1 alpha-2)
 *   - ua_bucket: "sparkle" | "browser" | "homebrew_curl" | "other"
 *
 * No IP retention, no cookies, no tracking pixels, no fingerprinting,
 * no correlation with any identity. See /privacy on tempoapp.app.
 */

interface Env {
  TEMPO_BUCKET: R2Bucket;
  TEMPO_ANALYTICS: AnalyticsEngineDataset;
}

type EventType = "download" | "update_check" | "checksum" | "head_check" | "other";
type UABucket = "sparkle" | "browser" | "homebrew_curl" | "other";

const DMG_VERSION_RE = /Tempo-([0-9]+\.[0-9]+\.[0-9]+|latest)\.dmg(\.sha256)?$/;
const SPARKLE_VERSION_RE = /Tempo\/([0-9]+\.[0-9]+\.[0-9]+)/;

function classifyUA(ua: string): UABucket {
  if (/Sparkle/i.test(ua)) return "sparkle";
  if (/Homebrew|curl|wget/i.test(ua)) return "homebrew_curl";
  if (/Safari|Chrome|Firefox|Edg|Brave|Vivaldi|Arc/i.test(ua)) return "browser";
  return "other";
}

function classifyRequest(
  path: string,
  ua: string,
): { eventType: EventType; version: string; uaBucket: UABucket } {
  const uaBucket = classifyUA(ua);

  if (path === "appcast.xml" || path.endsWith("/appcast.xml")) {
    const m = ua.match(SPARKLE_VERSION_RE);
    return {
      eventType: "update_check",
      version: m ? m[1] : "",
      uaBucket,
    };
  }

  const dmgMatch = path.match(DMG_VERSION_RE);
  if (dmgMatch) {
    return {
      eventType: dmgMatch[2] === ".sha256" ? "checksum" : "download",
      version: dmgMatch[1],
      uaBucket,
    };
  }

  return { eventType: "other", version: "", uaBucket };
}

function cacheControlFor(path: string, eventType: EventType): string {
  if (eventType === "update_check") {
    return "public, max-age=300";
  }
  if (eventType === "download") {
    if (path.includes("latest")) {
      return "public, max-age=600";
    }
    return "public, max-age=86400, immutable";
  }
  if (eventType === "checksum") {
    return "public, max-age=86400";
  }
  return "public, max-age=300";
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, "");
    const method = request.method.toUpperCase();

    if (method !== "GET" && method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (path === "") {
      return Response.redirect("https://tempoapp.app/downloads", 302);
    }

    const ua = request.headers.get("user-agent") ?? "";
    const country = request.headers.get("cf-ipcountry") ?? "XX";
    const { eventType, version, uaBucket } = classifyRequest(path, ua);
    // HEAD requests transfer no bytes — count them under a distinct
    // event_type so they don't inflate download/update_check totals.
    const analyticsEventType: EventType =
      method === "HEAD" ? "head_check" : eventType;

    // Skip analytics for "other" — on this host every legitimate request is
    // download / update_check / checksum / head_check. Everything else is
    // 404 noise (vuln/secret scanners hitting .env, .git/*, wp-json/*, etc.)
    // and only inflates the dataset.
    if (analyticsEventType !== "other") {
      ctx.waitUntil(
        Promise.resolve().then(() => {
          try {
            env.TEMPO_ANALYTICS.writeDataPoint({
              blobs: [analyticsEventType, path, country, version, uaBucket],
              doubles: [1],
              indexes: [analyticsEventType],
            });
          } catch (_err) {
            // Never fail the request because of analytics.
          }
        }),
      );
    }

    const object =
      method === "HEAD"
        ? await env.TEMPO_BUCKET.head(path)
        : await env.TEMPO_BUCKET.get(path);

    if (!object) {
      return new Response("Not Found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", cacheControlFor(path, eventType));

    if (method === "HEAD") {
      return new Response(null, { headers });
    }
    return new Response((object as R2ObjectBody).body, { headers });
  },
};
