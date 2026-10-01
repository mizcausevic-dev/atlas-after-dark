# Atlas After Dark (working title)

Original night-scene location detective for the browser. Single-player daily case: study a bundled night image, drop a map pin, get distance + score + three environmental clues. Optional hints reduce points.

Not affiliated with GeoGuessr, Kahoot!, Melatonin, or any proprietary place-game assets.

Live preview: https://mizcausevic-dev.github.io/atlas-after-dark/

## Setup

```bash
cd atlas-after-dark
npm install
npm run generate:content   # 25 demo SVG fixtures + datasets
cp .env.example .env       # optional
npm run dev                # http://localhost:5173 + /api routes
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server + embedded API middleware |
| `npm run build` | Production client bundle |
| `npm run preview` | Preview build (API middleware active) |
| `npm run start` | Serve `dist/` + API via Node (`tsx server/production.ts`) |
| `npm test` | Vitest (Haversine, scoring, seed, hook transitions) |
| `npm run test:e2e` | Playwright happy path (offline build) |
| `npm run generate:content` | Regenerate photos + JSON datasets |

## Modes

1. **Rookie** — softer distance penalty  
2. **Daily** — shared UTC puzzle  
3. **Night Owl** — strict penalty curve  

## Architecture & rights

- [docs/ARCHITECTURE-Cursor.md](./docs/ARCHITECTURE-Cursor.md)  
- [docs/ASSET_RIGHTS-Cursor.md](./docs/ASSET_RIGHTS-Cursor.md)  
- [docs/SCORING-Cursor.md](./docs/SCORING-Cursor.md)  
- [docs/PRIVACY-Cursor.md](./docs/PRIVACY-Cursor.md)  

## Live preview (GitHub Pages)

Push to `main` deploys an **offline demo** build (answers in bundle; fine for solo play, not for competitive leaderboards):

**https://mizcausevic-dev.github.io/atlas-after-dark/**

See [docs/SECURITY-Cursor.md](./docs/SECURITY-Cursor.md).

## Deployment

**Recommended (competitive-safe):** build client, run Node server so coordinates stay in `server/data/challenges.secret.json` only.

```bash
npm run generate:content
npm run build
PORT=4173 npm run start
```

Upload `dist/`, `server/`, `shared/`, and production `package.json` to Hostinger Node hosting or any Node VM. Do not ship `src/data/challenges.offline-answers.json` to competitive production (offline solo only).

**Static-only hosting:** set `VITE_OFFLINE=true` at build time. Scoring uses bundled answers (trust-on-client). Suitable for demos, not leaderboards.

## API cost notes

- **OSM tiles:** free at low volume; heavy traffic needs a commercial tile plan (MapTiler, Stadia, self-hosted). Budget $0–50/mo for indie traffic on a paid tile tier if you outgrow OSM’s fair-use policy.
- **No paid geocoding or photo API** in the default demo.

## Unverified assumptions

See [docs/ARCHITECTURE-Cursor.md](./docs/ARCHITECTURE-Cursor.md#assumptions-unverified).


