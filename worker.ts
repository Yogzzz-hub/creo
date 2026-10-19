type Environment = Pick<Env, "ASSETS" | "API_ORIGIN" | "PUBLISHING_DISPATCH_SECRET"> & {
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  RAZORPAY_WEBHOOK_SECRET?: string;
};
type WorkerContext = { waitUntil(work: Promise<unknown>): void };
type EdgeCache = { match(request: Request): Promise<Response | undefined>; put(request: Request, response: Response): Promise<void> };

// This allowlist contains only anonymous, read-only data. Personalized pricing,
// authentication, media, and every write always go directly to the API.
const PUBLIC_PATHS = new Set(["/api/v1/plans", "/api/v1/public/ledger"]);
const FRESH_SECONDS = 60;
const RETAIN_SECONDS = 300;

function edgeCache(): EdgeCache | undefined {
  return typeof caches === "undefined" ? undefined : caches.default;
}

function publicResponse(response: Response, state: string): Response {
  const headers = new Headers(response.headers);
  headers.delete("X-Creo-Cached-At");
  headers.delete("Set-Cookie");
  // Freshness is managed at the edge; browsers revalidate through React Query.
  headers.set("Cache-Control", "no-store");
  headers.set("X-Creo-Cache", state);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function proxyApi(request: Request, env: Environment, context: WorkerContext): Promise<Response> {
  const url = new URL(request.url);
  const origin = new URL(env.API_ORIGIN || "https://creo-api-singapore.onrender.com").origin;
  const destination = new URL(url.pathname + url.search, origin);
  const isPublic = request.method === "GET" && !url.search && PUBLIC_PATHS.has(url.pathname);
  const cache = isPublic ? edgeCache() : undefined;
  // Keep the configured API in the key: switching environments cannot reuse data.
  const cacheKey = new Request(`${url.origin}/__creo_cache/v1${url.pathname}?origin=${encodeURIComponent(origin)}`);
  let cached: Response | undefined;
  if (cache) {
    try { cached = await cache.match(cacheKey); } catch { /* Cache is optional. */ }
  }

  const load = async (): Promise<Response> => {
    const upstream = new Request(destination, request);
    upstream.headers.set("Host", destination.host);
    if (isPublic) {
      upstream.headers.delete("Authorization");
      upstream.headers.delete("Cookie");
    }
    // Prevent client spoofing of internal gateway credentials
    upstream.headers.delete("X-Razorpay-Key-Id");
    upstream.headers.delete("X-Razorpay-Key-Secret");
    upstream.headers.delete("X-Razorpay-Webhook-Secret");
    if (env.RAZORPAY_KEY_ID) upstream.headers.set("X-Razorpay-Key-Id", env.RAZORPAY_KEY_ID);
    if (env.RAZORPAY_KEY_SECRET) upstream.headers.set("X-Razorpay-Key-Secret", env.RAZORPAY_KEY_SECRET);
    if (env.RAZORPAY_WEBHOOK_SECRET) upstream.headers.set("X-Razorpay-Webhook-Secret", env.RAZORPAY_WEBHOOK_SECRET);
    const response = await fetch(upstream, { redirect: "manual" });
    if (response.status === 101) return response;
    if (isPublic && cache && response.status === 200
      && response.headers.get("Content-Type")?.includes("application/json")
      && !response.headers.has("Set-Cookie")) {
      const headers = new Headers(response.headers);
      headers.delete("Vary");
      headers.set("Cache-Control", `public, max-age=${RETAIN_SECONDS}`);
      headers.set("X-Creo-Cached-At", String(Date.now()));
      const stored = new Response(response.body, { status: response.status, headers });
      context.waitUntil(cache.put(cacheKey, stored.clone()).catch(() => {}));
      return publicResponse(stored, "MISS");
    }
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };

  if (cached) {
    const age = (Date.now() - Number(cached.headers.get("X-Creo-Cached-At") || 0)) / 1000;
    if (age < RETAIN_SECONDS) {
      if (age >= FRESH_SECONDS) {
        // Cloudflare's Cache API does not implement stale-while-revalidate.
        context.waitUntil(load().then(response => response.body?.cancel()).catch(() => {}));
      }
      return publicResponse(cached, age < FRESH_SECONDS ? "HIT" : "STALE");
    }
  }
  try {
    return await load();
  } catch {
    return Response.json({ error: { code: "API_UNAVAILABLE", message: "The service is temporarily unavailable. Please try again." } }, {
      status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "3" },
    });
  }
}

export default {
  async scheduled(_controller: ScheduledController, env: Environment): Promise<void> {
    if (!env.PUBLISHING_DISPATCH_SECRET) throw new Error("Publishing dispatcher secret is missing");
    const origin = new URL(env.API_ORIGIN).origin;
    const response = await fetch(`${origin}/api/v1/publishing/dispatch`, {
      method: "POST",
      headers: { "X-Publishing-Dispatch-Key": env.PUBLISHING_DISPATCH_SECRET },
      redirect: "error",
      signal: AbortSignal.timeout(120_000),
    });
    await response.body?.cancel();
    if (!response.ok) throw new Error(`Publishing dispatcher returned HTTP ${response.status}`);
    console.log(JSON.stringify({ event: "publishing_dispatch_completed", status: response.status }));
  },
  async fetch(request: Request, env: Environment, context: WorkerContext): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/")) return proxyApi(request, env, context);
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get("content-type") || "";
    // An old hashed chunk must not receive the SPA HTML fallback after a deploy.
    if (path.startsWith("/assets/") && type.includes("text/html")) {
      return new Response("Asset unavailable. Reload to get the current version.", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
    const headers = new Headers(response.headers);
    if (type.includes("text/html")) headers.set("Cache-Control", "no-store");
    else if (path.startsWith("/assets/") && response.ok) headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
