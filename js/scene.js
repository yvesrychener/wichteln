// The living-room scene: builds the six characters and the travelling present once,
// then updates them from a small state object. Choreography runs on timers.

import { PEOPLE, SEATS, MEET, TREE_GIFT, STEPS, WALK_SECONDS, HANDOVER_SECONDS } from './config.js';

const NS = 'http://www.w3.org/2000/svg';
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const ACCESSORIES = {
  bobble: '<path d="M-18 -68 Q-19 -92 0 -92 Q19 -92 18 -68 Z" fill="#2c6347"/><rect x="-19.5" y="-73" width="39" height="7" rx="3.5" fill="#f6e3c4"/><circle cx="0" cy="-94" r="5.5" fill="#f6e3c4"/>',
  santa: '<path d="M-17 -72 Q-10 -96 12 -92 Q22 -90 26 -78 L18 -72 Z" fill="#c7372f"/><rect x="-19.5" y="-76" width="39" height="7" rx="3.5" fill="#fbf3e3"/><circle cx="26" cy="-77" r="4.5" fill="#fbf3e3"/>',
  antlers: '<path d="M-8 -77 L-12 -92 M-11 -87 L-18 -91 M-10 -82 L-15 -82 M8 -77 L12 -92 M11 -87 L18 -91 M10 -82 L15 -82" fill="none" stroke="#8a5a35" stroke-width="2.6" stroke-linecap="round"/>',
  '': ''
};

function headMarkup(p) {
  if (p.photo) {
    const [x, y, w, h] = p.img;
    return `<image href="${esc(p.photo)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  }
  // Fallback cartoon face if no portrait is configured.
  return `<circle cx="0" cy="-62" r="17" fill="#f1c8a4"/>
    <path d="M-17 -62 Q-18 -81 0 -81 Q18 -81 17 -62 Q15 -71 6 -73 Q-4 -70 -10 -72 Q-15 -70 -17 -62 Z" fill="#5a3a22"/>
    <g class="eyes"><circle cx="-6" cy="-61" r="2.6" fill="#2b1d17"/><circle cx="6" cy="-61" r="2.6" fill="#2b1d17"/></g>
    <path d="M-5.5 -54 Q0 -49 5.5 -54" fill="none" stroke="#2b1d17" stroke-width="1.6" stroke-linecap="round"/>`;
}

function characterMarkup(p, i) {
  const arm = (d, hand) => `<path d="${d}" fill="none" stroke="${p.sw}" stroke-width="7" stroke-linecap="round"/><circle cx="${hand[0]}" cy="${hand[1]}" r="4" fill="${p.band}"/>`;
  return `
<svg width="80" height="136" viewBox="-40 -122 80 136">
  <ellipse class="selglow" data-part="sel" cx="0" cy="4" rx="30" ry="10" fill="#ffd47a" display="none"/>
  <g class="jump">
    <g data-part="sit">
      <path d="M-7 -8 Q-15 -4 -14 4" fill="none" stroke="#2b2230" stroke-width="6" stroke-linecap="round"/>
      <path d="M7 -8 Q15 -4 14 4" fill="none" stroke="#2b2230" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="-16" cy="5" rx="5.5" ry="3.2" fill="#1a1214"/><ellipse cx="16" cy="5" rx="5.5" ry="3.2" fill="#1a1214"/>
    </g>
    <g data-part="stand" display="none">
      <g class="leg-l"><path d="M-6 -28 L-7 -3" fill="none" stroke="#2b2230" stroke-width="6" stroke-linecap="round"/><ellipse cx="-9" cy="0" rx="5.5" ry="3.2" fill="#1a1214"/></g>
      <g class="leg-r"><path d="M6 -28 L7 -3" fill="none" stroke="#2b2230" stroke-width="6" stroke-linecap="round"/><ellipse cx="9" cy="0" rx="5.5" ry="3.2" fill="#1a1214"/></g>
    </g>
    <g class="posture" data-part="posture" style="transform: translateY(-8px)">
      <g class="bob" style="animation-delay: ${(-i * 0.55).toFixed(2)}s">
        <path d="M-15 -46 Q-19 -46 -20 -40 L-19 -2 Q-19 2 -15 2 L15 2 Q19 2 19 -2 L20 -40 Q19 -46 15 -46 Z" fill="${p.sw}" stroke="#000" stroke-opacity=".18" stroke-width="1"/>
        <rect x="-19.5" y="-25" width="39" height="10" fill="${p.band}"/>
        <rect x="-19.5" y="-25" width="39" height="10" fill="url(#${p.pat})" opacity=".9"/>
        <rect x="-19.5" y="-5" width="39" height="5" fill="${p.band}" opacity=".85"/>
        <g data-part="rest">
          <g class="arm-l" style="animation-delay: ${(-i * 0.37).toFixed(2)}s">${arm('M-16 -40 Q-23 -26 -19 -12', [-19, -11])}</g>
          <g class="arm-r" style="animation-delay: ${(-i * 0.37).toFixed(2)}s">${arm('M16 -40 Q23 -26 19 -12', [19, -11])}</g>
        </g>
        <g data-part="hold" display="none">${arm('M-16 -40 Q-17 -28 -10 -25', [-10, -25])}${arm('M16 -40 Q17 -28 10 -25', [10, -25])}</g>
        <g data-part="cheer" display="none">${arm('M-16 -40 Q-32 -44 -36 -60', [-36, -61])}${arm('M16 -40 Q32 -44 36 -60', [36, -61])}</g>
        <ellipse cx="0" cy="-46" rx="9" ry="3.2" fill="${p.band}"/>
        <g class="head" style="animation-delay: ${(-i * 0.81).toFixed(2)}s">
          <g transform="translate(0 -46) scale(1.7) translate(0 46)">
            ${headMarkup(p)}
            <g transform="translate(0 ${p.photo ? -13 : 0})">${ACCESSORIES[p.acc || ''] || ''}</g>
          </g>
        </g>
      </g>
    </g>
  </g>
  <g class="spark" data-part="spark" display="none">
    <path d="M-38 -96 l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 Z" fill="#ffd47a"/>
    <path d="M34 -120 l1.5 -4.5 l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5 Z" fill="#fff2cf" style="animation-delay: .1s"/>
    <path d="M28 -50 l1.5 -4.5 l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5 Z" fill="#ffd47a" style="animation-delay: .2s"/>
    <path d="M-32 -42 l1.5 -4.5 l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5 Z" fill="#fff2cf" style="animation-delay: .15s"/>
  </g>
</svg>
<div class="name">${esc(p.name)}</div>`;
}

const GIFT_SVG = `<svg width="26" height="30" viewBox="-13 -42 26 30" aria-hidden="true">
  <rect x="-11" y="-36" width="22" height="18" rx="2" fill="#e8b04a"/>
  <rect x="-2.5" y="-36" width="5" height="18" fill="#c7372f"/>
  <rect x="-11" y="-29.5" width="22" height="4.5" fill="#c7372f"/>
  <ellipse cx="-4.5" cy="-38" rx="5" ry="3" fill="#c7372f"/><ellipse cx="4.5" cy="-38" rx="5" ry="3" fill="#c7372f"/>
</svg>`;

// Resting spot of the travelling present (its box sits 24px below the element's top edge).
const GIFT_HOME = `translate(${TREE_GIFT[0] - 13}px, ${TREE_GIFT[1] - 24}px)`;

function restart(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // reflow so the animation plays again
  el.classList.add(cls);
}

export class Scene {
  constructor(room) {
    this.room = room;
    this.layer = room.querySelector('#people');
    this.dim = room.querySelector('#dim');
    this.glow = room.querySelector('#glow');
    this.timers = [];
    this.state = { phase: 0, giver: -1, rec: -1, sel: -1, instant: false, celebrate: -1 };

    this.chars = PEOPLE.map((p, i) => {
      const el = document.createElement('div');
      el.className = 'ch';
      el.innerHTML = characterMarkup(p, i);
      const part = (k) => el.querySelector(`[data-part="${k}"]`);
      this.layer.appendChild(el);
      return { el, chip: el.querySelector('.name'), parts: {
        sel: part('sel'), sit: part('sit'), stand: part('stand'), posture: part('posture'),
        rest: part('rest'), hold: part('hold'), cheer: part('cheer'), spark: part('spark')
      } };
    });

    this.gift = document.createElement('div');
    this.gift.className = 'giftfly';
    this.gift.innerHTML = `<div class="ghop"><div class="gin">${GIFT_SVG}</div></div>`;
    // Hidden with visibility (not display) so it always has a rendered position under the tree to start from.
    this.gift.style.visibility = 'hidden';
    this.gift.style.transform = GIFT_HOME;
    this.layer.appendChild(this.gift);
    this.giftShown = false;

    this.render();
  }

  set(patch) {
    Object.assign(this.state, patch);
    this.render();
  }

  clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  later(ms, fn) {
    this.timers.push(setTimeout(fn, ms));
  }

  /** Highlight a seat (index) while someone picks their name; -1 for none. */
  highlight(i) {
    this.set({ sel: i });
  }

  /** Registration done: that person stands up and cheers for a moment. */
  celebrate(i) {
    this.clearTimers();
    this.set({ celebrate: i });
    this.later(1600, () => this.set({ celebrate: -1 }));
  }

  /** Back to everyone sitting, without walking back. */
  reset() {
    this.clearTimers();
    this.set({ phase: 0, giver: -1, rec: -1, instant: true, celebrate: -1 });
    this.later(60, () => this.set({ instant: false }));
  }

  /** Run the gift-handover. Resolves when the message should be shown. */
  playReveal(giver, rec) {
    this.clearTimers();
    return new Promise((resolve) => {
      if (reduceMotion()) {
        this.set({ giver, rec, phase: 8, instant: true, celebrate: -1 });
        resolve();
        return;
      }
      this.set({ giver, rec, phase: 0, instant: true, celebrate: -1, sel: -1 });
      this.later(40, () => this.set({ instant: false, phase: 1 }));
      STEPS.forEach(([t, ph]) => this.later(40 + t, () => {
        this.set({ phase: ph });
        if (ph === 8) resolve();
      }));
    });
  }

  render() {
    const s = this.state, ph = s.phase, g = s.giver, r = s.rec;
    const on = (b) => (b ? 'inline' : 'none');
    let meet = null;
    if (g >= 0 && r >= 0) {
      const gLeft = SEATS[g][0] <= SEATS[r][0];
      meet = { g: [gLeft ? MEET.left : MEET.right, MEET.y], r: [gLeft ? MEET.right : MEET.left, MEET.y] };
    }
    const positions = [];

    this.chars.forEach((c, i) => {
      let [x, y] = SEATS[i];
      let stand = false, walk = false, arms = 'rest', spark = false, cheer = false, chipOn = false;
      if (i === g) {
        if (ph >= 2) stand = true;
        if (ph >= 3 && ph < 7) arms = 'hold';
        if (ph >= 4) [x, y] = meet.g;
        walk = ph === 4 || ph === 5;
      }
      if (i === r) {
        if (ph >= 5) { stand = true; chipOn = true; }
        if (ph === 5) { arms = 'cheer'; cheer = true; }
        if (ph >= 6) [x, y] = meet.r;
        walk = walk || ph === 6;
        if (ph >= 7) arms = 'hold';
        spark = ph === 7;
      }
      if (i === s.celebrate) { stand = true; arms = 'cheer'; cheer = true; chipOn = true; }
      if (ph === 0 && s.sel === i) chipOn = true;
      const faded = ph >= 1 && i !== g && i !== r;
      // Stacking follows where people stand, so nobody pops in front of someone nearer the viewer.
      const z = Math.round(y) * 2 + (i === g ? 1 : 0);
      positions[i] = [x, y];

      const el = c.el;
      el.style.transitionDuration = s.instant ? '0s' : `${WALK_SECONDS}s`;
      el.style.transform = `translate(${x - 40}px, ${y - 122}px)`;
      el.style.zIndex = String(z);
      el.classList.toggle('walking', walk);
      el.classList.toggle('faded', faded);
      if (cheer && !el.classList.contains('cheer')) restart(el, 'cheer');
      if (!cheer) el.classList.remove('cheer');
      c.chip.classList.toggle('on', chipOn);

      const P = c.parts;
      P.sel.setAttribute('display', on(ph === 0 && s.sel === i));
      P.sit.setAttribute('display', on(!stand));
      P.stand.setAttribute('display', on(stand));
      P.posture.style.transform = `translateY(${stand ? -28 : -8}px)`;
      P.rest.setAttribute('display', on(arms === 'rest'));
      P.hold.setAttribute('display', on(arms === 'hold'));
      P.cheer.setAttribute('display', on(arms === 'cheer'));
      P.spark.setAttribute('display', on(spark));
    });

    // The present is its own object: it rides with the giver, then hops over to the recipient.
    const giftOn = g >= 0 && r >= 0 && ph >= 3;
    if (giftOn) {
      const owner = ph >= 7 ? r : g;
      const [ox, oy] = positions[owner];
      this.gift.style.visibility = 'visible';
      if (!this.giftShown) restart(this.gift.querySelector('.gin'), 'pop');
      // Phase 3 is a quick hop from the tree into the giver's arms.
      this.gift.style.transitionDuration = s.instant ? '0s' : `${ph === 3 || ph >= 7 ? HANDOVER_SECONDS : WALK_SECONDS}s`;
      this.gift.style.transform = `translate(${ox - 13}px, ${oy - 70}px)`;
      if (ph === 7 && !this.gift.classList.contains('hop')) restart(this.gift, 'hop');
      if (ph !== 7) this.gift.classList.remove('hop');
    } else {
      // Wait under the tree for the next reveal.
      this.gift.style.visibility = 'hidden';
      this.gift.style.transitionDuration = '0s';
      this.gift.style.transform = GIFT_HOME;
      this.gift.classList.remove('hop');
    }
    this.giftShown = giftOn;

    this.room.classList.toggle('glowing', ph >= 1);
    this.dim.setAttribute('opacity', ph >= 1 ? '0.42' : '0');
    this.glow.setAttribute('opacity', ph >= 1 ? '1' : '0.5');
  }
}
