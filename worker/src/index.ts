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
  // Exact, permanent download counters (Analytics Engine samples + expires).
  TEMPO_DOWNLOAD_COUNTS: KVNamespace;
  // Bearer token guarding the /_stats read endpoint. Set as a Wrangler secret.
  STATS_TOKEN?: string;
}

type EventType = "download" | "update_check" | "checksum" | "head_check" | "other";
type UABucket = "internal" | "sparkle" | "browser" | "homebrew_curl" | "other";

// Marker we deliberately set on our own dev/CI/manual requests so they can be
// excluded from the real download counters. Any request whose User-Agent
// contains this token is bucketed "internal": still written to Analytics
// Engine (so we can inspect our own activity if we want), but never counted in
// the KV badge numbers. Real users never send it. Set it with:
//   curl -A "Tempo-Internal/<who>" https://downloads.tempoapp.app/...
const INTERNAL_UA_RE = /Tempo-Internal\//i;

const DMG_VERSION_RE = /Tempo-([0-9]+\.[0-9]+\.[0-9]+|latest)\.dmg(\.sha256)?$/;
// Sparkle's User-Agent reports CFBundleVersion (the build number), NOT the
// marketing CFBundleShortVersionString. For 1.0.x the two coincided
// (build "1.0.3"), so a strict X.Y.Z pattern matched; from 1.1 the build
// number diverged (e.g. "26"), so that pattern logged a blank and the whole
// 1.1.x installed base became invisible in update_check stats. Capture the
// full token after "Tempo/" instead — marketing version ("1.1.1"), bare build
// number ("26"), or pre-release tag ("1.2.0b3") — so the base is always
// recorded. Build-number values get mapped back to a marketing version
// downstream (in analysis), not here.
const SPARKLE_VERSION_RE = /Tempo\/([0-9][0-9A-Za-z._-]*)/;

function classifyUA(ua: string): UABucket {
  // Checked first: our internal marker wins over every other pattern, so a
  // dev/CI request never lands in a real bucket.
  if (INTERNAL_UA_RE.test(ua)) return "internal";
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

/**
 * Increment a set of KV counters by one each. KV has no atomic increment, so
 * this is a read-modify-write: at Tempo scale (downloads seconds-to-minutes
 * apart) collisions are negligible, but under a synchronized spike a same-key
 * write within the same second may be lost, so treat these as "exact within a
 * handful" — fine for a downloads badge, not for billing. Upgrade path if
 * precision ever matters: a Durable Object counter. Fire-and-forget: never
 * fails the download.
 */
async function incrementCounters(
  kv: KVNamespace,
  keys: string[],
): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      const current = parseInt((await kv.get(key)) ?? "0", 10);
      await kv.put(key, String((Number.isFinite(current) ? current : 0) + 1));
    }),
  );
}

/** Constant-time string compare (length is allowed to leak for a random token). */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * GET /_stats — authenticated JSON dump of the KV counters. Requires
 * `Authorization: Bearer <STATS_TOKEN>`. Never cached, never logged.
 */
async function handleStats(request: Request, env: Env): Promise<Response> {
  const provided = (request.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!env.STATS_TOKEN || !constantTimeEqual(provided, env.STATS_TOKEN)) {
    return new Response("Unauthorized\n", { status: 401 });
  }

  const kv = env.TEMPO_DOWNLOAD_COUNTS;
  const totals: Record<string, number> = {};
  const byDay: Record<string, number> = {};

  const totalKeys = await kv.list({ prefix: "total:" });
  for (const k of totalKeys.keys) {
    totals[k.name.slice("total:".length)] = Number(await kv.get(k.name)) || 0;
  }

  const dayKeys = await kv.list({ prefix: "day:" });
  for (const k of dayKeys.keys) {
    byDay[k.name.slice("day:".length)] = Number(await kv.get(k.name)) || 0;
  }

  const body = JSON.stringify(
    { totals, byDay, generatedAt: new Date().toISOString() },
    null,
    2,
  );
  return new Response(body + "\n", {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
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

    // Authenticated counter read endpoint. Handled before classification so it
    // is never logged to Analytics Engine and never served from R2.
    if (path === "_stats") {
      if (method !== "GET") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      return handleStats(request, env);
    }

    const ua = request.headers.get("user-agent") ?? "";
    const country = request.headers.get("cf-ipcountry") ?? "XX";
    const { eventType, version, uaBucket } = classifyRequest(path, ua);
    // Raw User-Agent — captured ONLY for our own updaters (Sparkle / Homebrew),
    // never for browsers. Those UAs are our app/tooling self-reporting, not a
    // user fingerprint, so this keeps the "no browser fingerprinting" privacy
    // stance intact while making version blanks diagnosable: if the version
    // extraction ever comes back empty again, the raw updater UA is right here
    // to show why. Truncated to stay well inside the Analytics Engine blob
    // budget.
    const updaterUA =
      uaBucket === "sparkle" || uaBucket === "homebrew_curl"
        ? ua.slice(0, 256)
        : "";
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
              blobs: [
                analyticsEventType,
                path,
                country,
                version,
                uaBucket,
                updaterUA,
              ],
              doubles: [1],
              indexes: [analyticsEventType],
            });
          } catch (_err) {
            // Never fail the request because of analytics.
          }
        }),
      );
    }

    // Exact KV counters — only actual byte-transferring downloads (a GET of a
    // .dmg). HEAD checks became "head_check" above, and high-volume
    // update_check / head_check events are deliberately excluded to keep KV
    // writes inside the free tier. Our own "internal" requests are excluded too
    // so the badge reflects real users only (they still land in Analytics
    // Engine, tagged ua_bucket=internal, if we ever want to inspect them).
    // These are the numbers a downloads badge or the /_stats endpoint reports.
    if (analyticsEventType === "download" && uaBucket !== "internal") {
      const day = new Date().toISOString().slice(0, 10);
      ctx.waitUntil(
        incrementCounters(env.TEMPO_DOWNLOAD_COUNTS, [
          "total:download",
          `total:download:${uaBucket}`,
          `day:${day}:download`,
        ]).catch(() => {
          // Never fail the request because of counting.
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
