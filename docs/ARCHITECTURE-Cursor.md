# Atlas After Dark — Architecture & Asset Rights

## Product slice

Single-player daily night-photo location detective. Player studies a bundled night image, places a pin on an OpenStreetMap-backed map, then receives distance, score, and three environmental clues. Optional hints cost points.

## Content classification

| Class | What | In this repo |
| --- | --- | --- |
| **Licensed / attributed** | Map tiles (OSM), fonts (system stack) | Leaflet + OSM tile URL with on-map attribution |
| **Demo fixture (original)** | 25 night-scene SVG illustrations | `public/assets/photos/*.svg` — procedural originals, not photographs |
| **Fictional** | UI copy, clue flavor text tied to real cities | Written for gameplay; cities and coordinates are real public facts |
| **Server-only** | Target coordinates and city names for scoring | `server/data/challenges.secret.json` (never sent before guess) |

Replace demo SVG fixtures with clearly licensed night photographs before commercial launch. See `docs/ASSET_RIGHTS-Cursor.md`.

## System diagram

```text
Browser (React + Leaflet)
  │  GET /api/daily?mode=&date=
  │  POST /api/guess { challengeId, lat, lng, hintsUsed, elapsedMs }
  ▼
Vite dev middleware OR Express (production)
  │  reads server/data/challenges.secret.json
  ▼
Haversine + disclosed score formula (shared lib)
```

## Modes & progression

1. **Rookie** — wider scoring band (`distanceMultiplier` 18), optional region nudge in instructions.
2. **Daily** — seed from UTC date; same puzzle for all players that day.
3. **Night Owl** — stricter scoring (`distanceMultiplier` 32), no starter zoom hint.

## Persistence (localStorage)

- `aad_settings`: difficulty default, reduced motion, high contrast
- `aad_progress`: last played date, streak, best scores per mode

## Assumptions (unverified)

- OSM tile usage stays within [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) for expected traffic; production should use a commercial tile provider or self-hosted tiles at scale.
- Demo SVG assets are acceptable stand-ins until real licensed photos are ingested.
- UTC calendar date is acceptable for “daily” puzzle rotation (no geo-fenced midnight).
