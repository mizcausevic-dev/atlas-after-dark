import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(
  readFileSync(join(root, 'data', 'photo-sources.json'), 'utf8'),
)

const cards = Object.entries(manifest)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, entry]) => {
    const img =
      entry.status === 'photo'
        ? `../public/assets/photos/${id}.webp`
        : `../public/assets/photos/${id}.svg`
    const caption =
      entry.status === 'photo'
        ? `<strong>${id}</strong><br/>${entry.author}<br/><a href="${entry.licenseUrl}">${entry.license}</a><br/><a href="${entry.commonsPageUrl}">Commons</a><br/><em>${entry.modifications}</em>`
        : `<strong>${id}</strong><br/>SVG fallback<br/>${entry.keepSvgReason ?? ''}`
    return `<figure><img src="${img}" alt="${id}" loading="lazy"/><figcaption>${caption}</figcaption></figure>`
  })
  .join('\n')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Atlas After Dark — photo contact sheet</title>
<style>
body{font-family:system-ui,sans-serif;background:#0b0c10;color:#c5c6c7;padding:1rem;}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem;}
figure{margin:0;background:#1f2833;border-radius:8px;overflow:hidden;}
img{width:100%;height:160px;object-fit:cover;display:block;}
figcaption{font-size:0.75rem;padding:0.5rem;line-height:1.35;}
a{color:#66fcf1;}
</style>
</head>
<body>
<h1>Photo contact sheet (25 challenges)</h1>
<div class="grid">
${cards}
</div>
</body>
</html>`

writeFileSync(join(root, 'docs', 'photo-contact-sheet.html'), html, 'utf8')
console.log('Wrote docs/photo-contact-sheet.html')
