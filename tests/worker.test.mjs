import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterEach, test } from "node:test";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const ts = require("typescript");
const source = readFileSync(new URL("../worker.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
});
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const originalFetch = globalThis.fetch;
const originalCaches = globalThis.caches;
const originalNow = Date.now;
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.caches = originalCaches;
  Date.now = originalNow;
});

function fixture(origin = "https://api.example.com") {
  const entries = new Map();
  const pending = [];
  const cache = {
    async match(request) { return entries.get(request.url)?.clone(); },
    async put(request, response) {
      const body = await response.arrayBuffer();
      entries.set(request.url, new Response(body, { status: response.status, headers: response.headers }));
    },
  };
  globalThis.caches = { default: cache };
  const env = { API_ORIGIN: origin, ASSETS: { fetch: async () => new Response("SPA", { headers: { "Content-Type": "text/html" } }) } };
  const context = { waitUntil(promise) { pending.push(promise); } };
  return { env, context, entries, async settle() { await Promise.all(pending); pending.length = 0; } };
}

test("anonymous standard plans are cached without forwarding credentials", async () => {
  const f = fixture();
  let calls = 0;
  globalThis.fetch = async request => {
    calls++;
    assert.equal(request.url, "https://api.example.com/api/v1/plans");
    assert.equal(request.headers.get("Authorization"), null);
    assert.equal(request.headers.get("Cookie"), null);
    return Response.json([{ name: "starter" }]);
  };
  const request = () => new Request("https://site.example.com/api/v1/plans", { headers: { Authorization: "Bearer private-token", Cookie: "session=private" } });
  const first = await worker.fetch(request(), f.env, f.context);
  await f.settle();
  assert.equal(first.headers.get("X-Creo-Cache"), "MISS");
  const second = await worker.fetch(request(), f.env, f.context);
  assert.equal(second.headers.get("X-Creo-Cache"), "HIT");
  assert.equal(second.headers.get("X-Creo-Cached-At"), null);
  assert.equal(second.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await second.json(), [{ name: "starter" }]);
  assert.equal(calls, 1);
});

test("stale public data returns immediately while a refresh runs", async () => {
  const f = fixture();
  let now = 100_000;
  Date.now = () => now;
  globalThis.fetch = async () => Response.json({ version: 1 });
  await worker.fetch(new Request("https://site.example.com/api/v1/public/ledger"), f.env, f.context);
  await f.settle();
  now += 61_000;
  let release;
  globalThis.fetch = () => new Promise(resolve => { release = resolve; });
  const stale = await worker.fetch(new Request("https://site.example.com/api/v1/public/ledger"), f.env, f.context);
  assert.equal(stale.headers.get("X-Creo-Cache"), "STALE");
  assert.deepEqual(await stale.json(), { version: 1 });
  release(Response.json({ version: 2 }));
  await f.settle();
  const fresh = await worker.fetch(new Request("https://site.example.com/api/v1/public/ledger"), f.env, f.context);
  assert.deepEqual(await fresh.json(), { version: 2 });
});

test("private responses, personalized pricing, queries and writes never enter the cache", async () => {
  const f = fixture();
  for (const [path, method] of [["/api/v1/auth/me", "GET"], ["/api/v1/payments/plans", "GET"], ["/api/v1/plans?client_id=private", "GET"], ["/api/v1/plans", "POST"]]) {
    globalThis.fetch = async request => {
      assert.equal(request.headers.get("Authorization"), "Bearer private-token");
      if (method === "POST") assert.equal(await request.text(), "payload");
      return Response.json({ private: true });
    };
    const response = await worker.fetch(new Request(`https://site.example.com${path}`, {
      method, headers: { Authorization: "Bearer private-token" },
      ...(method === "POST" ? { body: "payload" } : {}),
    }), f.env, f.context);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    await f.settle();
  }
  assert.equal(f.entries.size, 0);
});

test("errors, HTML and cookie-setting responses are not cached", async () => {
  const f = fixture();
  for (const options of [{ status: 500 }, { headers: { "Content-Type": "text/html" } }, { headers: { "Content-Type": "application/json", "Set-Cookie": "session=private" } }]) {
    globalThis.fetch = async () => new Response("upstream", options);
    await worker.fetch(new Request("https://site.example.com/api/v1/plans"), f.env, f.context);
    await f.settle();
    assert.equal(f.entries.size, 0);
  }
});

test("cache keys isolate backend origins", async () => {
  const f = fixture();
  globalThis.fetch = async request => Response.json({ origin: new URL(request.url).origin });
  await worker.fetch(new Request("https://site.example.com/api/v1/plans"), f.env, f.context);
  await f.settle();
  const response = await worker.fetch(new Request("https://site.example.com/api/v1/plans"), { ...f.env, API_ORIGIN: "https://other-api.example.com" }, f.context);
  assert.equal(response.headers.get("X-Creo-Cache"), "MISS");
  assert.deepEqual(await response.json(), { origin: "https://other-api.example.com" });
  await f.settle();
});

test("network failures produce API errors instead of the SPA fallback", async () => {
  const f = fixture();
  globalThis.fetch = async () => { throw new Error("offline"); };
  const response = await worker.fetch(new Request("https://site.example.com/api/v1/auth/login", { method: "POST" }), f.env, f.context);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "API_UNAVAILABLE");
});

test("WebSocket upgrades pass through without reconstructing the response", async () => {
  const f = fixture();
  const upgrade = { status: 101 };
  globalThis.fetch = async () => upgrade;
  assert.equal(await worker.fetch(new Request("https://site.example.com/api/v1/chat/ws/user"), f.env, f.context), upgrade);
});

test("obsolete asset paths cannot receive SPA HTML", async () => {
  const f = fixture();
  const response = await worker.fetch(new Request("https://site.example.com/assets/old-chunk.js"), f.env, f.context);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
