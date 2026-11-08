import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PEOPLE } from '../js/config.js';
import { createRegistration, parseRegistrations, openAssignment, deriveKeyBytes, fromB64, encryptText, decryptText, aadFor, toB64, randomBytes } from '../js/crypto.js';
import { draw, isValidMapping } from '../js/draw.js';
import { validateRegistrations, buildPublished } from '../scripts/prepare-draw.mjs';

const IT = 1000; // fast iterations for tests only
const KDF_TEST = { iterations: IT };

test('base64url round trip', () => {
  for (let n = 0; n < 40; n++) {
    const b = randomBytes(n);
    assert.deepEqual(fromB64(toB64(b)), b);
  }
});

test('registration message contains no password and parses back', async () => {
  const { payload, message } = await createRegistration({ id: 'p3', name: 'Alain', password: 'Geheim-123', year: 2026, organizer: 'Yves', iterations: IT });
  assert.ok(!message.includes('Geheim-123'));
  const [parsed] = parseRegistrations(`random chat text\n${message}\nmore text`);
  assert.deepEqual(parsed, payload);
  assert.equal(fromB64(parsed.k).length, 32);
  assert.equal(fromB64(parsed.s).length, 16);
  // Key in the message equals what the browser derives later from the same password + salt.
  assert.deepEqual(await deriveKeyBytes('Geheim-123', fromB64(parsed.s), IT), fromB64(parsed.k));
});

test('AES-GCM: right key opens, wrong key or wrong person fails', async () => {
  const key = randomBytes(32);
  const { iv, ct } = await encryptText(key, 'hallo', aadFor(2026, 'p1'));
  assert.equal(await decryptText(key, iv, ct, aadFor(2026, 'p1')), 'hallo');
  await assert.rejects(decryptText(randomBytes(32), iv, ct, aadFor(2026, 'p1')));
  await assert.rejects(decryptText(key, iv, ct, aadFor(2026, 'p2')));
});

test('full round trip: six registrations -> draw -> each person opens only their own', async () => {
  const passwords = Object.fromEntries(PEOPLE.map((p) => [p.id, `pw-${p.name}-✓`]));
  const messages = [];
  for (const p of PEOPLE) {
    messages.push((await createRegistration({ id: p.id, name: p.name, password: passwords[p.id], year: 2026, organizer: 'Yves', iterations: IT })).message);
  }
  const regs = validateRegistrations(messages.join('\n\n'), PEOPLE, KDF_TEST);
  const mapping = draw(PEOPLE);
  const published = await buildPublished(mapping, regs, 2026);
  const json = JSON.stringify(published);

  // Nothing secret in the published file: no keys, no plaintext recipient ids next to givers.
  for (const r of Object.values(regs)) assert.ok(!json.includes(toB64(r.key)));
  assert.ok(!/"to"/.test(json));

  const opened = {};
  for (const p of PEOPLE) {
    opened[p.id] = (await openAssignment(published.entries[p.id], passwords[p.id], 2026, p.id)).to;
    await assert.rejects(openAssignment(published.entries[p.id], 'wrong password', 2026, p.id));
  }
  assert.deepEqual(opened, mapping);
  assert.ok(isValidMapping(PEOPLE, opened));
  // Someone else's password does not open my entry.
  await assert.rejects(openAssignment(published.entries.p1, passwords.p3, 2026, 'p1'));
});

test('organizer validation catches missing and conflicting registrations', async () => {
  const msg = async (id, pw) => (await createRegistration({ id, name: id, password: pw, year: 2026, organizer: 'Yves', iterations: IT })).message;
  const five = await Promise.all(PEOPLE.slice(0, 5).map((p) => msg(p.id, 'abcdef')));
  assert.throws(() => validateRegistrations(five.join('\n'), PEOPLE, KDF_TEST), /Missing registrations: Kathrin/);
  const all = [...five, await msg('p6', 'abcdef')];
  assert.doesNotThrow(() => validateRegistrations([...all, all[0]].join('\n'), PEOPLE, KDF_TEST)); // same message twice is fine
  const again = await msg('p1', 'other-password');
  assert.throws(() => validateRegistrations([...all, again].join('\n'), PEOPLE, KDF_TEST), /Two different registrations for Yves/);
  assert.throws(() => validateRegistrations(all.join('\n'), PEOPLE, { iterations: 999 }), /unexpected KDF iterations/);
});
