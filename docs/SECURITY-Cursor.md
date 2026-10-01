# Security notes (Atlas After Dark)

## GitHub Pages preview

The Pages build sets `VITE_OFFLINE=true`. Answer coordinates ship in the static JS bundle (`challenges.offline-answers.json`). That is intentional for a solo demo preview, not for competitive leaderboards.

The API build (`VITE_OFFLINE` unset) does **not** bundle answer coordinates; scoring stays server-side.

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
