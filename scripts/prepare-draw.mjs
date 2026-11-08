#!/usr/bin/env node
// Organizer-only tool. Runs locally, never in the browser, never on GitHub.
//
//   node scripts/prepare-draw.mjs check  <registrations.txt>         validate the pasted WhatsApp messages
//   node scripts/prepare-draw.mjs draw   <registrations.txt> [--show] draw + encrypt -> data/published.json (reveal phase)
//   node scripts/prepare-draw.mjs lookup <registrations.txt> <name>  someone forgot their password: show their recipient
//   node scripts/prepare-draw.mjs register                            switch data/published.json back to registration phase
//   node scripts/prepare-draw.mjs demo                                write data/demo.json (everyone's password: "test")
//
// Keep <registrations.txt> OUTSIDE the repository: it contains everyone's secret keys.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PEOPLE, YEAR, KDF } from '../js/config.js';
import { parseRegistrations, fromB64, toB64, encryptText, decryptText, aadFor, randomBytes, deriveKeyBytes } from '../js/crypto.js';
import { draw, isValidMapping } from '../js/draw.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLISHED = path.join(root, 'data', 'published.json');
const DEMO = path.join(root, 'data', 'demo.json');
const nameOf = (id) => (PEOPLE.find((p) => p.id === id) || {}).name || id;

function die(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

/** Parse and validate pasted messages. Returns { id: { salt, key, iterations } } for all participants. */
export function validateRegistrations(text, people = PEOPLE, kdf = KDF) {
  let found;
  try { found = parseRegistrations(text); } catch { throw new Error('A registration message is damaged (could not decode). Ask that person to copy it again.'); }
  const byId = {};
  for (const r of found) {
    if (r.v !== 1) throw new Error(`Unknown message version ${r.v}.`);
    if (!people.some((p) => p.id === r.id)) throw new Error(`Unknown participant id "${r.id}".`);
    const salt = fromB64(r.s), key = fromB64(r.k);
    if (salt.length !== 16) throw new Error(`${nameOf(r.id)}: salt has the wrong length.`);
    if (key.length !== 32) throw new Error(`${nameOf(r.id)}: key has the wrong length.`);
    if (r.i !== kdf.iterations) throw new Error(`${nameOf(r.id)}: unexpected KDF iterations ${r.i} (expected ${kdf.iterations}).`);
    if (byId[r.id]) {
      if (byId[r.id].k === r.k) continue; // same message pasted twice
      throw new Error(`Two different registrations for ${nameOf(r.id)}. Delete the old one and keep only the newest.`);
    }
    byId[r.id] = r;
  }
  const missing = people.filter((p) => !byId[p.id]).map((p) => p.name);
  if (missing.length) throw new Error(`Missing registrations: ${missing.join(', ')}.`);
  const out = {};
  for (const [id, r] of Object.entries(byId)) out[id] = { salt: r.s, key: fromB64(r.k), iterations: r.i };
  return out;
}

/** Encrypt each giver's recipient with that giver's own key. Only ciphertext is returned. */
export async function buildPublished(mapping, regs, year = YEAR) {
  const entries = {};
  for (const [giver, recipient] of Object.entries(mapping)) {
    const r = regs[giver];
    const { iv, ct } = await encryptText(r.key, JSON.stringify({ to: recipient }), aadFor(year, giver));
    entries[giver] = { s: r.salt, i: r.iterations, iv, ct };
  }
  return { phase: 'reveal', year, entries };
}

async function selfCheck(published, regs, people = PEOPLE) {
  const back = {};
  for (const [id, e] of Object.entries(published.entries)) {
    back[id] = JSON.parse(await decryptText(regs[id].key, e.iv, e.ct, aadFor(published.year, id))).to;
  }
  if (!isValidMapping(people, back)) throw new Error('Self-check failed: decrypted assignment is not valid.');
  return back;
}

async function main() {
  const [cmd, file, extra] = process.argv.slice(2);
  const show = process.argv.includes('--show');

  if (cmd === 'register') {
    await writeFile(PUBLISHED, JSON.stringify({ phase: 'register', year: YEAR }, null, 2) + '\n');
    console.log('✓ data/published.json is now in REGISTRATION mode.');
    return;
  }

  if (cmd === 'demo') {
    const regs = {};
    for (const p of PEOPLE) {
      const salt = randomBytes(16);
      regs[p.id] = { salt: toB64(salt), key: await deriveKeyBytes('test', salt, KDF.iterations), iterations: KDF.iterations };
    }
    const published = await buildPublished(draw(PEOPLE), regs);
    await selfCheck(published, regs);
    await writeFile(DEMO, JSON.stringify(published, null, 2) + '\n');
    console.log('✓ data/demo.json written (test draw, password "test" for everyone). Open index.html?demo');
    return;
  }

  if (!['check', 'draw', 'lookup'].includes(cmd) || !file) {
    console.log(await readFile(fileURLToPath(import.meta.url), 'utf8').then((s) => s.split('\n').slice(1, 10).join('\n')));
    process.exit(cmd ? 1 : 0);
  }

  if (path.resolve(file).startsWith(root + path.sep)) {
    console.warn('⚠ The registrations file is inside the repository folder. Move it outside so it can never be committed.');
  }

  let regs;
  try { regs = validateRegistrations(await readFile(file, 'utf8')); } catch (e) { die(e.message); }

  if (cmd === 'check') {
    console.log(`✓ All ${PEOPLE.length} registrations are complete and valid: ${PEOPLE.map((p) => p.name).join(', ')}.`);
    return;
  }

  if (cmd === 'lookup') {
    const p = PEOPLE.find((x) => x.name.toLowerCase() === String(extra || '').toLowerCase() || x.id === extra);
    if (!p) die('Usage: lookup <registrations.txt> <name>');
    const published = JSON.parse(await readFile(PUBLISHED, 'utf8'));
    if (published.phase !== 'reveal') die('data/published.json is not in reveal mode yet.');
    const e = published.entries[p.id];
    const to = JSON.parse(await decryptText(regs[p.id].key, e.iv, e.ct, aadFor(published.year, p.id))).to;
    console.log(`${p.name} beschenkt ${nameOf(to)}.`);
    return;
  }

  // draw
  const mapping = draw(PEOPLE);
  const published = await buildPublished(mapping, regs);
  await selfCheck(published, regs);
  await writeFile(PUBLISHED, JSON.stringify(published, null, 2) + '\n');
  console.log('✓ Draw done and encrypted for all participants. data/published.json is now in REVEAL mode.');
  console.log('  Every couple rule was checked, and every entry was test-decrypted.');
  if (show) {
    console.log('\n  Assignments (you asked to see them):');
    for (const [g, r] of Object.entries(mapping)) console.log(`   ${nameOf(g)} → ${nameOf(r)}`);
  } else {
    console.log('  The assignments were not printed. (Add --show to see them.)');
  }
  console.log('\n⚠ Note: whoever holds the registrations file can decrypt every assignment.');
  console.log('  Keep it outside the repo, never commit it, and delete it after Christmas.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => die(e.stack || e.message));
}
