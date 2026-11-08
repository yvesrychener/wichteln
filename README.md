# Wichtel-Stube 🎄

Secret Santa for six people as a single static website (GitHub Pages). No backend, no accounts, no tracking.
The same URL serves two phases:

1. **Registration**: everyone picks their name, chooses a password and copies the generated message to the organizer on WhatsApp (privately).
2. **Reveal**: everyone enters their password and watches their character carry a present to the person they're buying for.

The phase is decided by `data/published.json`. Nothing else changes between phases.

## How the privacy works

- During registration the browser derives a 256-bit key from the password (PBKDF2-SHA-256, 600,000 iterations, random salt).
  The WhatsApp message carries the person's id, salt and **that key**. The password itself never leaves the phone.
- The organizer runs the draw locally and encrypts each person's recipient with **their own key** (AES-GCM, random 96-bit IV,
  bound to the person's id).
- The website only contains salts, IVs and ciphertexts. Reading the page source reveals nothing; a wrong password just fails to decrypt.
- Accepted limitation: the organizer receives everyone's keys, so whoever holds the registrations file *could* decrypt every result.
  This protects against curious family members, not against the organizer. The key in the message is a secret: don't post it in the group.
- GitHub Pages is public. Anyone with the link can open the page and the six portrait photos in `portraits/`.

## Run locally

```bash
npm test                      # draw + crypto tests (Node 20+)
npm run serve                 # http://localhost:8000          (registration or reveal, per data/published.json)
                              # http://localhost:8000/#demo    (test reveal, password "test" for everyone)
```

## Organizer workflow

1. Put the site in registration mode (already the default):
   `node scripts/prepare-draw.mjs register` → commit + push `data/published.json`.
2. Share the link in the family group. Everyone sends you their message **privately**.
3. Paste all six messages into one text file **outside this folder**, e.g. `~/wichteln/registrations.txt`
   (any extra chat text around them is fine).
4. Check: `node scripts/prepare-draw.mjs check ~/wichteln/registrations.txt`
5. Draw: `node scripts/prepare-draw.mjs draw ~/wichteln/registrations.txt`
   - picks uniformly among all 80 valid assignments (nobody gives to themselves or their partner, in either direction),
   - encrypts each result, test-decrypts all of them, writes `data/published.json` in reveal mode,
   - does **not** print who gets whom (add `--show` if you want to see it).
6. Commit + push `data/published.json`. Same URL, now in reveal mode.
7. Someone forgot their password? `node scripts/prepare-draw.mjs lookup ~/wichteln/registrations.txt Alain`
8. After Christmas, delete the registrations file.

Never commit the registrations file, raw messages or a printed list of assignments. `.gitignore` blocks `private/` and `*registrations*` as a safety net.

## GitHub Pages

1. Create a repository (public, unless your plan allows Pages on private repos) and push this folder.
2. Settings → Pages → *Deploy from a branch* → `main` / root.
3. The site appears at `https://<user>.github.io/<repo>/` over HTTPS (needed for Web Crypto).

`data/published.json` is fetched with `cache: no-store`, so the phase switch shows up right away.
The rest (CSS/JS) may be cached by GitHub Pages for up to 10 minutes.

## Customising

Everything family-specific is in `js/config.js`: names, couples (`partner`), portraits and their placement,
jumper colours, accessories, seats, animation timing, KDF settings. Don't change `KDF` after people have registered.

```
index.html            scene + panels
css/style.css         all styling and animation
js/config.js          people, couples, timing
js/scene.js           characters and the reveal choreography
js/app.js             registration / reveal flows
js/crypto.js          PBKDF2 + AES-GCM (shared by browser and Node)
js/draw.js            constrained uniform draw (shared)
scripts/prepare-draw.mjs  organizer tool (local only)
test/                 node --test
data/published.json   current phase (+ encrypted results in reveal mode)
data/demo.json        test data for ?demo
portraits/            cropped family photos
fonts/                self-hosted fonts (no Google requests)
```
