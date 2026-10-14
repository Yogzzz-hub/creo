import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterEach, beforeEach, test } from "node:test";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const ts = require("typescript");

// Load the real source modules, with the Vite-only bits stubbed.
function load(path, replacements = []) {
  let source = readFileSync(new URL(path, import.meta.url), "utf8");
  for (const [from, to] of replacements) source = source.replaceAll(from, to);
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}
const dataUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
globalThis.window = { location: { hostname: "creo.example.dev" } };

const tokenModule = await import(dataUrl(load("../frontend/src/lib/auth-token.ts")));
const httpModule = await import(
  dataUrl(
    load("../frontend/src/lib/http.ts", [
      ['from "./auth-token"', `from "${dataUrl(load("../frontend/src/lib/auth-token.ts"))}"`],
      ["import.meta.env.VITE_API_URL", "undefined"],
    ]),
  )
);
// http.ts imported its own copy of the token store; use that copy's storage-backed API.
const { getAuthToken, setAuthToken, getRefreshToken, setRefreshToken } = tokenModule;
const { request, HttpError } = httpModule;

const jwt = (expiresInSeconds) => {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresInSeconds })).toString("base64url");
  return `h.${payload}.s`;
};

const originalFetch = globalThis.fetch;
let calls;
beforeEach(() => {
  storage.clear();
  calls = [];
  // The two module copies share localStorage, so drop their in-memory caches.
  setAuthToken(null);
  setRefreshToken(null);
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function server(handler) {
  globalThis.fetch = async (url, init) => {
    const path = new URL(url, "https://creo.example.dev").pathname;
    const auth = new Headers(init?.headers).get("Authorization");
    calls.push({ path, auth });
    return handler(path, auth, init);
  };
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("an expired access token is renewed before the request, not after a wasted 401", async () => {
  const fresh = jwt(900);
  localStorage.setItem("creo_access_token", jwt(-60));
  localStorage.setItem("creo_refresh_token", "refresh-1");
  server((path, auth) => (path === "/api/v1/auth/refresh" ? json({ access_token: fresh }) : json({ ok: auth === `Bearer ${fresh}` })));

  assert.deepEqual(await request("/api/v1/portal/dashboard"), { ok: true });
  assert.deepEqual(calls.map((call) => call.path), ["/api/v1/auth/refresh", "/api/v1/portal/dashboard"]);
});

test("simultaneous requests share one renewal", async () => {
  const fresh = jwt(900);
  localStorage.setItem("creo_access_token", jwt(-60));
  localStorage.setItem("creo_refresh_token", "refresh-1");
  server((path) => (path === "/api/v1/auth/refresh" ? json({ access_token: fresh }) : json({ path })));

  await Promise.all([request("/api/v1/a"), request("/api/v1/b"), request("/api/v1/c")]);
  assert.equal(calls.filter((call) => call.path === "/api/v1/auth/refresh").length, 1);
});

test("a 401 on a still-valid-looking token renews once and replays the request", async () => {
  const fresh = jwt(1800);
  localStorage.setItem("creo_access_token", jwt(900));
  localStorage.setItem("creo_refresh_token", "refresh-1");
  server((path, auth) => {
    if (path === "/api/v1/auth/refresh") return json({ access_token: fresh });
    return auth === `Bearer ${fresh}` ? json({ ok: true }) : json({ error: { code: "TOKEN_EXPIRED", message: "expired" } }, 401);
  });

  assert.deepEqual(await request("/api/v1/portal/dashboard"), { ok: true });
  assert.deepEqual(calls.map((call) => call.path), ["/api/v1/portal/dashboard", "/api/v1/auth/refresh", "/api/v1/portal/dashboard"]);
});

test("a rejected refresh token ends the session", async () => {
  localStorage.setItem("creo_access_token", jwt(-60));
  localStorage.setItem("creo_refresh_token", "revoked");
  server((path) => (path === "/api/v1/auth/refresh" ? json({ error: { code: "SESSION_REVOKED", message: "ended" } }, 401) : json({ error: { code: "TOKEN_EXPIRED", message: "expired" } }, 401)));

  await assert.rejects(request("/api/v1/portal/dashboard"), (error) => error instanceof HttpError && error.status === 401);
  assert.equal(localStorage.getItem("creo_refresh_token"), null);
  assert.equal(localStorage.getItem("creo_access_token"), null);
});

test("a network failure while renewing keeps the session for the next attempt", async () => {
  localStorage.setItem("creo_access_token", jwt(-60));
  localStorage.setItem("creo_refresh_token", "refresh-1");
  server((path) => {
    if (path === "/api/v1/auth/refresh") throw new TypeError("network down");
    return json({ error: { code: "TOKEN_EXPIRED", message: "expired" } }, 401);
  });

  await assert.rejects(request("/api/v1/portal/dashboard"));
  assert.equal(localStorage.getItem("creo_refresh_token"), "refresh-1");
});

test("a suspended account is signed out without trying to renew", async () => {
  localStorage.setItem("creo_access_token", jwt(900));
  localStorage.setItem("creo_refresh_token", "refresh-1");
  server(() => json({ error: { code: "ACCOUNT_SUSPENDED", message: "suspended" } }, 401));

  await assert.rejects(request("/api/v1/portal/dashboard"));
  assert.deepEqual(calls.map((call) => call.path), ["/api/v1/portal/dashboard"]);
  assert.equal(localStorage.getItem("creo_refresh_token"), null);
});

test("a wrong password is reported as is, never treated as an expired session", async () => {
  localStorage.setItem("creo_refresh_token", "refresh-1");
  server(() => json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." } }, 401));

  await assert.rejects(request("/api/v1/auth/login", { method: "POST", body: "{}" }), /Invalid email or password/);
  assert.deepEqual(calls.map((call) => call.path), ["/api/v1/auth/login"]);
});
