import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PEOPLE } from '../js/config.js';
import { draw, validAssignments, isValidMapping, isForbidden, secureRandomInt } from '../js/draw.js';

test('couples are configured symmetrically', () => {
  for (const p of PEOPLE) {
    const partner = PEOPLE.find((q) => q.id === p.partner);
    assert.ok(partner, `${p.name} has a partner`);
    assert.equal(partner.partner, p.id, `${p.name} <-> ${partner.name}`);
  }
});

test('nobody gives to themselves or their partner, in either direction', () => {
  for (const p of PEOPLE) {
    assert.ok(isForbidden(PEOPLE, p.id, p.id));
    assert.ok(isForbidden(PEOPLE, p.id, p.partner));
    assert.ok(isForbidden(PEOPLE, p.partner, p.id));
  }
});

test('every enumerated assignment is a valid bijection', () => {
  const all = validAssignments(PEOPLE);
  assert.ok(all.length > 0);
  for (const perm of all) {
    assert.equal(new Set(perm).size, PEOPLE.length);
    perm.forEach((r, g) => assert.ok(!isForbidden(PEOPLE, PEOPLE[g].id, PEOPLE[r].id)));
  }
  // Brute-force cross-check of the count: permutations of 6 avoiding self + partner.
  assert.equal(all.length, 80);
});

test('5000 random draws are all valid', () => {
  for (let k = 0; k < 5000; k++) {
    const m = draw(PEOPLE);
    assert.ok(isValidMapping(PEOPLE, m), JSON.stringify(m));
  }
});

test('isValidMapping rejects broken mappings', () => {
  const ok = draw(PEOPLE);
  const ids = PEOPLE.map((p) => p.id);
  assert.ok(isValidMapping(PEOPLE, ok));
  assert.ok(!isValidMapping(PEOPLE, { ...ok, [ids[0]]: ids[0] }));             // self
  assert.ok(!isValidMapping(PEOPLE, { ...ok, [ids[0]]: PEOPLE[0].partner }));   // partner
  const dup = { ...ok }; dup[ids[1]] = dup[ids[0]];
  assert.ok(!isValidMapping(PEOPLE, dup));                                      // two givers, one recipient
  const short = { ...ok }; delete short[ids[5]];
  assert.ok(!isValidMapping(PEOPLE, short));                                    // incomplete
});

test('secureRandomInt stays in range', () => {
  for (let k = 0; k < 10000; k++) {
    const x = secureRandomInt(80);
    assert.ok(x >= 0 && x < 80 && Number.isInteger(x));
  }
});

test('draws are roughly uniform over all valid assignments (chi-square)', () => {
  const all = validAssignments(PEOPLE);
  const key = (m) => PEOPLE.map((p) => m[p.id]).join(',');
  const index = new Map(all.map((perm, i) => [perm.map((r) => PEOPLE[r].id).join(','), i]));
  const N = 80000, counts = new Array(all.length).fill(0);
  for (let k = 0; k < N; k++) counts[index.get(key(draw(PEOPLE)))]++;
  const exp = N / all.length;
  const chi2 = counts.reduce((s, c) => s + (c - exp) ** 2 / exp, 0);
  // 79 degrees of freedom: p = 0.0001 critical value is about 133.
  assert.ok(chi2 < 133, `chi2 = ${chi2.toFixed(1)}`);
  assert.ok(counts.every((c) => c > 0));
});
