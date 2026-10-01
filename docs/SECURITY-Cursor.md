# Security notes (Atlas After Dark)

## GitHub Pages preview (offline solo demo)

The Pages build sets `VITE_OFFLINE=true`. Answer coordinates ship in the static JS bundle (`challenges.offline-answers.json`). That is intentional for solo play only, not for competitive leaderboards.

## Server mode (competitive-oriented)

- Set `AAD_SESSION_SECRET` (see `.env.example`). Without it, `/api/*` returns 503 except health checks are still rate-limited.
- `GET /api/daily` returns a signed session token; coordinates and clue text are withheld until `POST /api/guess`.
- Hints are served only via `POST /api/hint` and are bound to the token.
- Session state lives in an **in-memory store with TTL** (`server/sessionStore.ts`). It does **not** sync across multiple Node instances. Use a single instance or add shared storage before horizontal scale.
- Each token accepts one scored guess (409 on replay).
- Mode, elapsed time, and hints used are derived server-side from the token and session record, not from the client body.

## Repository

- `server/data/challenges.secret.json` is in git for self-hosted API deploys. Treat as spoiler data for the game, not a platform secret.
- Never commit `.env` with tokens. Use `.env.example` only.

## API hardening (self-hosted)

- POST body capped at 4 KB
- `challengeId` must match `aad-NN`
- Lat/lng range validation
- Daily date query validated as `YYYY-MM-DD`

## Before competitive launch

- Run server mode with coordinates off the static host
- Add rate limiting and CSP headers on your origin
- Replace demo fixtures with licensed media per `ASSET_RIGHTS-Cursor.md`
