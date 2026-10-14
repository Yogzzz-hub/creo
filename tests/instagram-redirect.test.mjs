import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const ts = require('typescript');
const source = readFileSync(new URL('../frontend/src/lib/instagram-oauth.ts', import.meta.url), 'utf8');
function setup() {
  let resolveRequest;
  const requested = new Promise(resolve => { resolveRequest = resolve; });
  const storage = new Map(), redirects = [];
  const context = { exports: {}, require: () => ({ request: () => requested }), sessionStorage: { setItem: (key, value) => storage.set(key, value) }, window: { location: { assign: url => redirects.push(url) } } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { start: context.exports.startMetaConnect, resolveRequest, storage, redirects };
}
const flow = { url: 'https://www.facebook.com/dialog/oauth', state: 'state', verifier: 'verifier' };
test('OAuth request and save overlap; redirect waits for saved answers', async () => {
  const s = setup();
  let finishSave, saving = false;
  const work = s.start('client', '/onboarding?section=h', () => { saving = true; return new Promise(resolve => { finishSave = resolve; }); });
  await Promise.resolve();
  assert.equal(saving, true);
  s.resolveRequest(flow);
  await Promise.resolve();
  assert.equal(s.redirects.length, 0);
  finishSave();
  await work;
  assert.equal(s.redirects[0], flow.url);
  assert.equal(JSON.parse(s.storage.get('creo-instagram-oauth')).userId, 'client');
});
test('failed questionnaire save never redirects or stores an OAuth flow', async () => {
  const s = setup();
  s.resolveRequest(flow);
  await assert.rejects(s.start('client', '/onboarding', async () => { throw new Error('save failed'); }), /save failed/);
  assert.equal(s.redirects.length, 0);
  assert.equal(s.storage.size, 0);
});
