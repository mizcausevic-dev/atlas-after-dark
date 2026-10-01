import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(root, 'data', 'photo-sources.json')
const outDir = join(root, 'public', 'assets', 'photos')

/** @type {string[]} */
const REVERT = [
  'aad-02',
  'aad-04',
  'aad-05',
  'aad-06',
  'aad-08',
  'aad-09',
  'aad-10',
  'aad-11',
  'aad-15',
  'aad-18',
  'aad-23',
]

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

for (const id of REVERT) {
  manifest[id] = {
    status: 'svg',
    keepSvgReason:
      'Reverted to SVG: prior automatic Commons pick failed location-verified policy. Add a vetted pick in data/photo-commons-picks.json.',
  }
  for (const suffix of ['', '-600']) {
    const p = join(outDir, `${id}${suffix}.webp`)
    if (existsSync(p)) unlinkSync(p)
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')
console.log(`Reverted ${REVERT.length} challenges to SVG in manifest`)
