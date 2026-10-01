# Asset rights register

## Map

- **Library:** Leaflet (BSD-2-Clause)
- **Tiles:** © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors — default demo endpoint `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. Attribute on map. For production traffic, migrate to a provider with a written license (MapTiler, Stadia, self-hosted, etc.).

## Photographs (demo fixtures)

All current challenge images are **original SVG demo fixtures** generated for this repository (`public/assets/photos/`). They are **not** real night photography.

Metadata fields `source`, `license`, and `attribution` in `server/data/challenges.secret.json` are set to `demo-fixture/original-svg` until replaced.

## To ingest real photos

For each of 25 assets, record:

- `sourceUrl`, `author`, `license` (SPDX or URL), `attribution` string
- Confirm license allows bundling and web display
- Store JPEG/WebP in `public/assets/photos/` and update `imagePath` in secret dataset

Do not scrape Google Street View, GeoGuessr, or other proprietary sources.
