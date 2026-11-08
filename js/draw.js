// Constrained Secret Santa draw. Enumerates every valid assignment and picks one uniformly.

/** Unbiased random integer in [0, n) from crypto.getRandomValues. */
export function secureRandomInt(n) {
  if (!Number.isInteger(n) || n <= 0) throw new Error('n must be a positive integer');
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

/** true if giver may not give to recipient: themselves or their partner (both directions). */
export function isForbidden(people, giverId, recipientId) {
  if (giverId === recipientId) return true;
  const g = people.find((p) => p.id === giverId);
  const r = people.find((p) => p.id === recipientId);
  return (g && g.partner === recipientId) || (r && r.partner === giverId);
}

function permutations(n) {
  const out = [];
  const a = [...Array(n).keys()];
  const used = new Array(n).fill(false);
  const cur = [];
  (function rec() {
    if (cur.length === n) { out.push(cur.slice()); return; }
    for (const x of a) {
      if (used[x]) continue;
      used[x] = true; cur.push(x); rec(); cur.pop(); used[x] = false;
    }
  })();
  return out;
}

/** Every valid assignment, as arrays where perm[i] is the index of person i's recipient. */
export function validAssignments(people) {
  return permutations(people.length).filter((perm) =>
    perm.every((r, g) => !isForbidden(people, people[g].id, people[r].id)));
}

/** Checks a { giverId: recipientId } mapping: complete, one-to-one, no forbidden pairs. */
export function isValidMapping(people, mapping) {
  const ids = people.map((p) => p.id);
  const givers = Object.keys(mapping);
  const recipients = Object.values(mapping);
  if (givers.length !== ids.length || !ids.every((id) => givers.includes(id))) return false;
  if (new Set(recipients).size !== ids.length || !recipients.every((id) => ids.includes(id))) return false;
  return givers.every((g) => !isForbidden(people, g, mapping[g]));
}

/** Uniform draw over all valid assignments. Returns { giverId: recipientId }. */
export function draw(people, randomInt = secureRandomInt) {
  const all = validAssignments(people);
  if (!all.length) throw new Error('No valid assignment exists for these constraints.');
  const perm = all[randomInt(all.length)];
  const mapping = {};
  perm.forEach((r, g) => { mapping[people[g].id] = people[r].id; });
  return mapping;
}
