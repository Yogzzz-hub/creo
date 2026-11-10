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

  // Cache request body in memory so retries on hibernating instances can safely replay it
  let requestBody: ArrayBuffer | undefined = undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      const buffer = await request.arrayBuffer();
      if (buffer.byteLength > 0) requestBody = buffer;
    } catch {
      // Body already consumed or unavailable
    }
  }

  const createUpstream = (): Request => {
    const upstream = new Request(destination, {
      method: request.method,
      headers: request.headers,
      body: requestBody,
      redirect: "manual",
    });
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
    return upstream;
  };

  const load = async (): Promise<Response> => {
    let response: Response | undefined;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const upstream = createUpstream();
      response = await fetch(upstream);
      if (response.status === 101) return response;

      const isHibernating =
        response.status === 429 &&
        response.headers.get("x-render-routing") === "hibernate-rate-limited";
      const isGatewayWakeup =
        response.status === 502 || response.status === 503 || response.status === 504;

      if ((isHibernating || isGatewayWakeup) && attempt < maxAttempts) {
        // Render free tier instance is spinning up from cold sleep.
        // Wait briefly before retrying so the container has time to bind to its port.
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      break;
    }

    if (!response) {
      throw new Error("No upstream response");
    }

    if (
      response.status === 429 &&
      response.headers.get("x-render-routing") === "hibernate-rate-limited"
    ) {
      return Response.json(
        {
          error: {
            code: "SERVER_WAKING_UP",
            message: "The backend server is waking up from idle mode. Please wait a few moments and try again.",
          },
        },
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            "Retry-After": "5",
          },
        },
      );
    }
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
