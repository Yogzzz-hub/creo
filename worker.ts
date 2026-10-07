type Assets = { fetch(request: Request): Promise<Response> };

export default {
  async fetch(request: Request, env: { ASSETS: Assets }): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    const path = new URL(request.url).pathname;
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
