'use strict';
// Offline release check. Never fetches, publishes or writes to the Site checkout.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { build } = require('./build-site-modules.cjs');
const root = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'release-provenance.json'), 'utf8'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const core = ['engine.js', 'measurement-data.js', 'adapter.js', 'legal-index.cjs', 'pp719-index.json', 'table-context.json'];
const generatedNames = ['engine.mjs', 'measurement-data.mjs', 'adapter.mjs', 'legal-index.mjs', 'pp719-index.mjs', 'table-context.mjs'];
function checkFiles(directory, expected) {
  for (const [name, hash] of Object.entries(expected)) {
    assert(!path.isAbsolute(name) && !name.split(/[\\/]/).includes('..'), 'Unsafe manifest path');
    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.equal(digest(fs.readFileSync(path.join(directory, name))), hash, 'SHA-256 mismatch: ' + name);
  }
}
function verify(m, generated, site) {
  assert.equal(m.formatVersion, 1);
  assert.equal(m.scope, 'shared-deterministic-core');
  assert.match(m.source.commit, /^[a-f0-9]{40}$/);
  assert.match(m.source.tree, /^[a-f0-9]{40}$/);
  for (const n of [...core, 'build-site-modules.cjs', 'server.mjs', 'package.json', 'test.cjs', 'regression.cjs', 'index-tests.cjs', 'context-tests.cjs', 'server-smoke.mjs', 'render.yaml']) assert(m.sourceSha256[n], 'Missing source: ' + n);
  assert.deepEqual(Object.keys(m.generatedSha256).sort(), [...generatedNames].sort());
  checkFiles(root, m.sourceSha256);
  checkFiles(generated, m.generatedSha256);
  if (site) checkFiles(site, m.generatedSha256);
  const health = require('./adapter.js').health();
  assert.deepEqual(m.versions, { engine: health.engineVersion, service: health.serviceVersion, release: health.releaseVersion, index: health.indexVersion });
  assert.equal(m.verification.fullLegalCoverageVerified, false);
  assert.equal(m.verification.normativeCurrency, 'not_verified');
}
function main() {
  const args = process.argv.slice(2);
  let site = null, selfTest = false;
  while (args.length) {
    const arg = args.shift();
    if (arg === '--self-test') selfTest = true;
    else if (arg === '--site' && args.length) site = path.resolve(args.shift());
    else throw Error('Usage: node verify-release-provenance.cjs [--site DIRECTORY] [--self-test]');
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'navigator719-provenance-'));
  try {
    build(temporary);
    verify(manifest, temporary, site);
    if (selfTest) {
      const changed = structuredClone(manifest);
      changed.sourceSha256['engine.js'] = '0'.repeat(64);
      assert.throws(() => verify(changed, temporary), /SHA-256 mismatch: engine.js/);
      const omitted = structuredClone(manifest);
      delete omitted.sourceSha256['legal-index.cjs'];
      assert.throws(() => verify(omitted, temporary), /Missing source/);
      const staleVersion = structuredClone(manifest);
      staleVersion.versions.engine = 'stale';
      assert.throws(() => verify(staleVersion, temporary), /strictly deep-equal/);
      fs.appendFileSync(path.join(temporary, 'adapter.mjs'), '\n// tampered\n');
      assert.throws(() => verify(manifest, temporary), /SHA-256 mismatch: adapter.mjs/);
    }
    console.log(JSON.stringify({ ok: true, sourceCommit: manifest.source.commit, coveredSources: Object.keys(manifest.sourceSha256).length, generatedModules: generatedNames.length, siteBytesCompared: Boolean(site), negativeChecks: selfTest ? 4 : 0, liveDeploymentChecked: false, legalCurrencyVerified: false }));
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
