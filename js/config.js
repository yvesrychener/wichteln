// Everything family-specific lives here: names, couples, looks, seats and timing.

export const YEAR = 2026;
export const ORGANIZER = 'Yves';

// partner: the person this participant may not give to (and not receive from).
// photo/img: portrait file and its box in the character's head coordinates [x, y, w, h].
// acc: little accessory drawn on top of the head ('bobble', 'santa', 'antlers' or '').
export const PEOPLE = [
  { id: 'p1', name: 'Yves',     partner: 'p2', photo: 'portraits/p1.webp', img: [-17, -90, 34, 46],     sw: '#b5352f', band: '#2c6347', pat: 'pz', acc: 'bobble' },
  { id: 'p2', name: 'Seongmin', partner: 'p1', photo: 'portraits/p2.webp', img: [-19.2, -92, 38.4, 48], sw: '#2f6f86', band: '#d99a2b', pat: 'pf', acc: '' },
  { id: 'p3', name: 'Alain',    partner: 'p4', photo: 'portraits/p3.webp', img: [-19.1, -91, 38.2, 47], sw: '#d6972b', band: '#7a2e2a', pat: 'ps', acc: '' },
  { id: 'p4', name: 'Jelena',   partner: 'p3', photo: 'portraits/p4.webp', img: [-20.7, -91, 41.4, 47], sw: '#3d7b52', band: '#b5352f', pat: 'pd', acc: 'antlers' },
  { id: 'p5', name: 'Jörg',     partner: 'p6', photo: 'portraits/p5.webp', img: [-16.4, -90, 32.7, 46], sw: '#2e3f6e', band: '#c9473a', pat: 'pt', acc: '' },
  { id: 'p6', name: 'Kathrin',  partner: 'p5', photo: 'portraits/p6.webp', img: [-20.4, -92, 40.8, 48], sw: '#8d3d6c', band: '#1f4f5e', pat: 'pf', acc: 'santa' }
];

// Seats around the tree (feet position in scene px, scene is 390 x 844). Couples sit side by side.
export const SEATS = [[44, 452], [94, 514], [160, 552], [230, 552], [296, 514], [346, 452]];

// Front meeting spots for the handover.
export const MEET = { y: 590, left: 140, right: 250 };

// Reveal choreography: [ms after start, phase]
// 2 giver stands, 3 present appears, 4 giver walks to the front, 5 recipient jumps up,
// 6 recipient walks to the front, 7 handover, 8 message
export const STEPS = [[450, 2], [950, 3], [1400, 4], [2600, 5], [3200, 6], [5000, 7], [5700, 8]];
export const WALK_SECONDS = 1.7;
export const HANDOVER_SECONDS = 0.6;

// Password-based key derivation. Changing these after registration breaks existing registrations.
export const KDF = { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000 };
export const MIN_PASSWORD_LENGTH = 6;
