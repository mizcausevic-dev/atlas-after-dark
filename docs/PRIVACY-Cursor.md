# Privacy statement (Atlas After Dark demo)

**Effective:** 2026-10-01  
**Operator:** You (self-hosted / local deploy)

## What this app collects

- **Local storage only:** difficulty preference, contrast/motion settings, daily streak, and best scores per mode. Data stays in the browser unless you add analytics later.
- **Gameplay requests:** When not in offline mode, guess coordinates are POSTed to your same-origin `/api/guess` handler for scoring. No account system is included.

## What this app does not collect (in the default build)

- No cookies, no GA4/GTM, no ad networks, no account emails.
- No server-side persistence of guesses in the demo API.

## Third parties

- **OpenStreetMap tile servers** receive standard map tile HTTP requests (IP address, zoom, tile coordinates). See [OSMF privacy policy](https://wiki.osmfoundation.org/wiki/Privacy_Policy).
- **Google Fonts** (if loaded from CDN in `index.css`) receives browser requests. Self-host fonts to remove this.

## Your responsibilities before production

- Publish a contact for privacy requests if you add lead capture or accounts.
- Replace demo fixtures and review tile provider terms for expected traffic.
