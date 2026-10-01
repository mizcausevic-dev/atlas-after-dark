# Asset rights register

## Map

- **Library:** Leaflet (BSD-2-Clause)
- **Tiles:** © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors — default demo endpoint `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Attribute on map. For production traffic, migrate to a provider with a written license (MapTiler, Stadia, self-hosted, etc.).

## Night challenge photographs

### Policy

- Source **only** from [Wikimedia Commons](https://commons.wikimedia.org/) via the MediaWiki API (`action=query`, `prop=imageinfo`, `iiprop=url|extmetadata|size|mime`).
- Read license fields from `extmetadata` (`LicenseShortName`, `LicenseUrl`, `Artist`, `Credit`, `AttributionRequired`). Do not infer authors or licenses.
- **Allowed:** CC0, Public Domain, CC BY 2.0/3.0/4.0, CC BY-SA 2.0/3.0/4.0. Reject all other licenses (including GFDL-only, fair use, unknown).
- **CC BY-SA:** resize/crop/WebP re-encode is an adaptation; derived files remain **CC BY-SA** and are labeled **modified** in-game and in the manifest.
- Canonical manifest: `data/photo-sources.json` (one entry per challenge `aad-01` … `aad-25`). Production build fails if any entry is missing or incomplete.
- Original downloads live in `.cache/commons-originals/` (gitignored). Shipped assets: `public/assets/photos/aad-NN.webp` (1200px) and `aad-NN-600.webp` (srcset), metadata stripped, neutral alt text **Night street scene**. No city names in filenames or public JSON titles.

### Attribution in the product

- Photo credit (author, license link, Wikimedia Commons link, **modified**) appears on the **result screen only**, after the player submits a guess.
- **Server mode:** credit is attached to `/api/guess` responses only (not `/api/daily`).
- **Offline demo:** credits are bundled in `src/data/photo-attribution.json` (same trade-off as offline answer coordinates).

### Tooling

| Script | Purpose |
|--------|---------|
| `npm run photos:fetch` | Rate-limited Commons fetch + Sharp WebP pipeline |
| `npm run photos:apply` | Sync `imagePath` + server secret metadata from manifest |
| `npm run photos:contact-sheet` | Regenerate `docs/photo-contact-sheet.html` |
| `prebuild` | Validates manifest + applies paths |

User-Agent on Commons requests: `AtlasAfterDark/1.0` with project URL (see `scripts/commons-helpers.mjs`).

### Generated manifest table

Regenerate this section after `photos:fetch` and `photos:contact-sheet`:

| ID | Status | Author | License | Commons |
|----|--------|--------|---------|---------|
| _(run `node scripts/generate-photo-contact-sheet.mjs` and inspect `data/photo-sources.json`)_ | | | | |

Review all selections in `docs/photo-contact-sheet.html` before production.

## SVG fallbacks

When no compliant Commons image exists for a city, the challenge keeps `public/assets/photos/aad-NN.svg` (original demo fixture). The manifest records `status: "svg"` and `keepSvgReason`.
