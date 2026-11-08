// PBKDF2 / AES-GCM helpers. Pure Web Crypto, so the same file runs in the browser and in Node (>= 19).

const enc = new TextEncoder();
const dec = new TextDecoder();
const subtle = globalThis.crypto.subtle;

export const MESSAGE_TAG = 'WICHTEL1';

export function toB64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64(str) {
  const norm = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm + '==='.slice((norm.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomBytes(n) {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

/** Derive 32 key bytes from a password. These bytes are a secret, not a harmless hash. */
export async function deriveKeyBytes(password, salt, iterations) {
  const base = await subtle.importKey('raw', enc.encode(String(password).normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, 256);
  return new Uint8Array(bits);
}

function aesKey(keyBytes, usage) {
  return subtle.importKey('raw', keyBytes, 'AES-GCM', false, [usage]);
}

export function aadFor(year, id) {
  return enc.encode(`wichteln-${year}:${id}`);
}

export async function encryptText(keyBytes, text, aad) {
  const iv = randomBytes(12);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, await aesKey(keyBytes, 'encrypt'), enc.encode(text));
  return { iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
}

/** Throws if the key (password) is wrong or the data was tampered with. */
export async function decryptText(keyBytes, ivB64, ctB64, aad) {
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(ivB64), additionalData: aad }, await aesKey(keyBytes, 'decrypt'), fromB64(ctB64));
  return dec.decode(pt);
}

/** Registration: random salt, derived key, and the text to paste into WhatsApp. */
export async function createRegistration({ id, name, password, year, organizer, iterations }) {
  const salt = randomBytes(16);
  const key = await deriveKeyBytes(password, salt, iterations);
  const payload = { v: 1, id, s: toB64(salt), i: iterations, k: toB64(key) };
  const token = toB64(enc.encode(JSON.stringify(payload)));
  const message = `Wichteln ${year} – Anmeldung von ${name}\nBitte nur privat an ${organizer} schicken, nicht in die Gruppe.\n${MESSAGE_TAG}:${token}`;
  return { payload, message };
}

/** Finds every registration token in a block of pasted text. */
export function parseRegistrations(text) {
  const re = new RegExp(`${MESSAGE_TAG}:([A-Za-z0-9_-]+)`, 'g');
  const out = [];
  for (const m of String(text).matchAll(re)) {
    out.push(JSON.parse(dec.decode(fromB64(m[1]))));
  }
  return out;
}

/** Reveal: derive the key from the typed password and open this person's own entry. */
export async function openAssignment(entry, password, year, id) {
  const key = await deriveKeyBytes(password, fromB64(entry.s), entry.i);
  const text = await decryptText(key, entry.iv, entry.ct, aadFor(year, id));
  return JSON.parse(text);
}
