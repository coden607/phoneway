#!/usr/bin/env node
/**
 * check-static.mjs — static integrity check for Phoneway (no build step).
 *
 * Verifies, with a plain node script:
 *   1. every file referenced from index.html exists (scripts, links, images)
 *   2. every file in the sw.js precache list exists (no dead cache entries)
 *   3. every relative ES-module import in js/ resolves to a real file
 *   4. the version string is coherent across version.js, versionCheck.js,
 *      errorTrap.js, sw.js, manifest.json, package.json, index.html refs
 *
 * Exits non-zero on any failure. Run in CI after `npm test`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;

function fail(msg) { failures++; console.error('  ✗ ' + msg); }
function ok(msg) { console.log('  ✓ ' + msg); }
function read(p) { return readFileSync(join(root, p), 'utf8'); }

const stripQ = (s) => s.replace(/[?#].*$/, '');

/* ── 1. index.html references ─────────────────────────────── */
console.log('index.html references');
const html = read('index.html');
const refs = new Set();
for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/<link[^>]+href="([^"]+)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/<img[^>]+src="([^"]+)"/g)) refs.add(m[1]);
let checked = 0;
for (const r of refs) {
  const p = stripQ(r);
  if (p.startsWith('http') || p.startsWith('/api/')) continue;
  const rel = p.startsWith('/') ? p.slice(1) : p;
  if (existsSync(join(root, rel))) checked++;
  else fail(`index.html references missing file: ${r}`);
}
ok(`${checked}/${refs.size} referenced files exist`);

/* ── 2. sw.js precache list ───────────────────────────────── */
console.log('sw.js precache list');
const sw = read('sw.js');
const assets = [...sw.matchAll(/BASE \+ '([^']+)'/g)].map((m) => m[1]);
checked = 0;
for (const a of assets) {
  const rel = stripQ(a).replace(/^\//, '');
  if (existsSync(join(root, rel)) || a === '') checked++;
  else fail(`sw.js precaches missing file: ${a}`);
}
ok(`${checked}/${assets.length} precache entries exist`);

/* ── 3. ES-module import graph ────────────────────────────── */
console.log('js/ import graph');
const { readdirSync } = await import('node:fs');
const jsFiles = readdirSync(join(root, 'js')).filter((f) => f.endsWith('.js'));
checked = 0;
let importCount = 0;
for (const f of jsFiles) {
  const src = read('js/' + f);
  for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) {
    importCount++;
    const target = normalize(join('js', m[1]));
    if (existsSync(join(root, target))) checked++;
    else fail(`js/${f} imports missing module: ${m[1]}`);
  }
}
ok(`${checked}/${importCount} relative imports resolve`);

/* ── 4. version coherence ─────────────────────────────────── */
console.log('version coherence');
const versionJs = read('js/version.js').match(/VERSION = '([^']+)'/);
const version = versionJs ? versionJs[1] : null;
if (!version) fail('js/version.js has no VERSION');
else {
  const spots = {
    'js/versionCheck.js': /PHONEWAY_VERSION = '([^']+)'/,
    'js/errorTrap.js':    /v:\s*'([^']+)'/,
    'sw.js':              /phoneway-v([^']+)'/,
    'manifest.json':      /"version":\s*"([^"]+)"/,
    'package.json':       /"version":\s*"([^"]+)"/
  };
  for (const [file, re] of Object.entries(spots)) {
    const m = read(file).match(re);
    if (!m) fail(`${file}: version string not found`);
    else if (m[1] !== version) fail(`${file}: version ${m[1]} != ${version}`);
    else ok(`${file} = ${version}`);
  }
  const htmlVs = [...html.matchAll(/v=([0-9]+\.[0-9]+\.[0-9]+)/g)].map((m) => m[1]);
  const bad = htmlVs.filter((v) => v !== version);
  if (bad.length) fail(`index.html has stale ?v= refs: ${[...new Set(bad)].join(', ')}`);
  else ok(`index.html ?v= refs all = ${version}`);
}

/* ── verdict ──────────────────────────────────────────────── */
if (failures) {
  console.error(`\nSTATIC CHECK FAILED — ${failures} problem(s)`);
  process.exit(1);
}
console.log('\nStatic integrity OK');
