import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const ts = require("typescript");
const source = readFileSync(new URL("../frontend/src/lib/instagram-callback.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
});
const { parseInstagramCallback } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("Meta's numeric error callback is recognised even without OAuth state", () => {
  const result = parseInstagramCallback("?error_code=100&error_message=Invalid+Scopes%3A+instagram_basic%2C+pages_show_list");
  assert.equal(result.hasResponse, true);
  assert.equal(result.state, null);
  assert.match(result.error, /app permissions/);
});

test("canceled consent and alternate error formats never become a successful callback", () => {
  for (const search of ["?error=access_denied", "?error_reason=user_denied", "?error_description=user_cancelled"]) {
    const result = parseInstagramCallback(search);
    assert.equal(result.hasResponse, true);
    assert.match(result.error, /canceled/);
  }
  assert.ok(parseInstagramCallback("?error_code=190").error);
});

test("provider failures take precedence over a code in the same URL", () => {
  assert.ok(parseInstagramCallback("?code=must-not-exchange&state=s&error_message=Invalid+Scopes").error);
});

test("successful authorization keeps its code and state for browser-flow verification", () => {
  assert.deepEqual(parseInstagramCallback("?code=one-time-code&state=browser-state"), {
    hasResponse: true, code: "one-time-code", state: "browser-state", error: null,
  });
});

test("an ordinary visit does not pretend to be an OAuth callback", () => {
  assert.equal(parseInstagramCallback("").hasResponse, false);
  assert.equal(parseInstagramCallback("?tab=integrations").hasResponse, false);
});
