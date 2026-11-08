// Wires the scene to the two publication states: "register" (phase 1) and "reveal" (phase 2).
// The state comes from data/published.json, so switching phases only means replacing that file.

import { PEOPLE, YEAR, ORGANIZER, KDF, MIN_PASSWORD_LENGTH } from './config.js';
import { createRegistration, openAssignment } from './crypto.js';
import { Scene } from './scene.js';

const $ = (sel) => document.querySelector(sel);
const room = $('#room');
const scene = new Scene(room);

// ---- fit the 390 x 844 scene to the screen (not while the keyboard is open)
function fit() {
  const a = document.activeElement;
  if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
  const s = Math.min(window.innerWidth / 390, window.innerHeight / 844);
  room.style.setProperty('--s', String(Math.max(0.3, s)));
}
fit();
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 250));
document.addEventListener('focusout', () => setTimeout(fit, 300));

// ---- name pickers
document.querySelectorAll('.who-select').forEach((sel) => {
  PEOPLE.forEach((p) => sel.add(new Option(p.name, p.id)));
  sel.addEventListener('change', () => scene.highlight(PEOPLE.findIndex((p) => p.id === sel.value)));
});
document.querySelectorAll('.organizer').forEach((el) => { el.textContent = ORGANIZER; });

function shake(panel) {
  panel.classList.remove('shake');
  void panel.offsetWidth;
  panel.classList.add('shake');
}

function busy(btn, on, label) {
  btn.disabled = on;
  if (on) { btn.dataset.label = btn.innerHTML; btn.textContent = label; } else if (btn.dataset.label) { btn.innerHTML = btn.dataset.label; }
}

// ---- phase 1: registration
function startRegistration() {
  const form = $('#register-form'), done = $('#register-done'), err = $('#reg-err');
  form.hidden = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#reg-who').value, pw = $('#reg-pw').value, pw2 = $('#reg-pw2').value;
    const fail = (msg) => { err.textContent = msg; shake(form); };
    if (!id) return fail('Bitte wähle zuerst deinen Namen.');
    if (pw.length < MIN_PASSWORD_LENGTH) return fail(`Dein Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`);
    if (pw !== pw2) return fail('Die beiden Passwörter stimmen nicht überein.');
    err.textContent = '';
    const btn = $('#reg-btn');
    busy(btn, true, 'Wird erstellt …');
    try {
      const person = PEOPLE.find((p) => p.id === id);
      const { message } = await createRegistration({ id, name: person.name, password: pw, year: YEAR, organizer: ORGANIZER, iterations: KDF.iterations });
      $('#reg-message').value = message;
      $('#reg-pw').value = ''; $('#reg-pw2').value = '';
      form.hidden = true; done.hidden = false;
      scene.highlight(-1);
      scene.celebrate(PEOPLE.indexOf(person));
    } catch (ex) {
      console.error(ex);
      fail('Das hat leider nicht geklappt. Bitte versuch es nochmal.');
    } finally {
      busy(btn, false);
    }
  });

  $('#copy-btn').addEventListener('click', async () => {
    const ta = $('#reg-message'), btn = $('#copy-btn');
    let ok = false;
    try { await navigator.clipboard.writeText(ta.value); ok = true; } catch { /* fall back below */ }
    if (!ok) { ta.focus(); ta.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } }
    btn.textContent = ok ? 'Kopiert! Jetzt in WhatsApp einfügen' : 'Bitte Text markieren und kopieren';
    setTimeout(() => { btn.textContent = 'Nachricht kopieren'; }, 3500);
  });

  $('#restart-btn').addEventListener('click', () => {
    $('#reg-message').value = '';
    done.hidden = true; form.hidden = false;
    $('#reg-who').value = ''; scene.highlight(-1);
  });
}

// ---- phase 2: reveal
function startReveal(data) {
  const form = $('#reveal-form'), err = $('#reveal-err'), result = $('#result');
  form.hidden = false;
  let last = null;

  async function play(giver, rec) {
    result.hidden = true;
    form.classList.add('away');
    await scene.playReveal(giver, rec);
    $('#result-name').textContent = `${PEOPLE[rec].name}!`;
    result.hidden = false;
    $('#back-btn').focus({ preventScroll: true });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#who').value, pw = $('#pw').value;
    const fail = (msg) => { err.textContent = msg; shake(form); };
    if (!id) return fail('Bitte wähle zuerst deinen Namen.');
    if (!pw) return fail('Bitte gib dein Passwort ein.');
    const entry = data.entries && data.entries[id];
    if (!entry) return fail(`Für dich ist noch nichts hinterlegt. Frag ${ORGANIZER}.`);
    err.textContent = '';
    const btn = $('#reveal-btn');
    busy(btn, true, 'Einen Moment …');
    let opened = null;
    try {
      opened = await openAssignment(entry, pw, data.year, id);
    } catch {
      opened = null;
    } finally {
      busy(btn, false);
    }
    const rec = opened ? PEOPLE.findIndex((p) => p.id === opened.to) : -1;
    if (rec < 0) return fail('Das hat nicht geklappt. Prüfe dein Passwort und versuch es nochmal.');
    $('#pw').value = '';
    last = [PEOPLE.findIndex((p) => p.id === id), rec];
    play(...last);
  });

  $('#replay-btn').addEventListener('click', () => last && play(...last));
  $('#back-btn').addEventListener('click', () => {
    result.hidden = true;
    last = null;
    scene.reset();
    form.classList.remove('away');
    $('#who').value = ''; scene.highlight(-1);
  });
}

// ---- load the current publication state
async function boot() {
  const demo = new URLSearchParams(location.search).has('demo') || location.hash === '#demo';
  const file = demo ? 'data/demo.json' : 'data/published.json';
  try {
    const res = await fetch(`${file}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    $('#loading').hidden = true;
    $('#demo-banner').hidden = !demo;
    if (data.phase === 'reveal') startReveal(data);
    else startRegistration();
  } catch (ex) {
    console.error(ex);
    $('#loading').textContent = 'Konnte nicht laden. Bitte Seite neu laden.';
  }
}
boot();
