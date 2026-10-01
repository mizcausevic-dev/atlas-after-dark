import { describe, it, expect } from 'vitest'
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const photoDir = join(process.cwd(), 'public', 'assets', 'photos')

describe('processed challenge photos', () => {
  it('has no EXIF or GPS in WebP outputs', async () => {
    if (!existsSync(photoDir)) return
    const files = readdirSync(photoDir).filter((f) => /^aad-\d{2}\.webp$/.test(f))
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const meta = await sharp(join(photoDir, file)).metadata()
      expect(meta.exif, file).toBeUndefined()
      expect(meta.icc, file).toBeUndefined()
      expect(meta.xmp, file).toBeUndefined()
    }
  })
})
