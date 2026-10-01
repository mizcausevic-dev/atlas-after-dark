import { test, expect } from '@playwright/test'

const PHOTO_IDS = ['aad-03', 'aad-07', 'aad-14'] as const

async function assertStripCover(page: import('@playwright/test').Page) {
  const img = page.locator('.photo-strip-trigger .evidence-photo')
  await expect(img).toBeVisible()
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0)
  const strip = await img.evaluate((el) => {
    const style = window.getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const tr = el.parentElement!.getBoundingClientRect()
    return {
      objectFit: style.objectFit,
      fillsWidth: r.width >= tr.width - 2,
      fillsHeight: r.height >= tr.height - 2,
    }
  })
  expect(strip.objectFit).toBe('cover')
  expect(strip.fillsWidth).toBe(true)
  expect(strip.fillsHeight).toBe(true)
}

async function assertLightboxUncropped(page: import('@playwright/test').Page) {
  await page.locator('.photo-strip-trigger').click()
  const full = page.locator('.photo-lightbox-img')
  await expect(full).toBeVisible()
  const meta = await full.evaluate((el: HTMLImageElement) => {
    const r = el.getBoundingClientRect()
    if (!el.naturalWidth || !el.naturalHeight) {
      return { ok: false, reason: 'no natural size' }
    }
    const ratioNat = el.naturalWidth / el.naturalHeight
    const ratioBox = r.width / r.height
    return {
      ok: Math.abs(ratioNat - ratioBox) < 0.06,
      ratioNat,
      ratioBox,
    }
  })
  expect(meta.ok, JSON.stringify(meta)).toBe(true)
  await page.getByRole('button', { name: 'Close' }).click()
}

for (const id of PHOTO_IDS) {
  test(`play strip fills frame (${id})`, async ({ page }, testInfo) => {
    const mobile = testInfo.project.name.includes('mobile')
    if (mobile) {
      await page.setViewportSize({ width: 375, height: 667 })
    }
    await page.goto(`/?e2ePlay=${id}`)
    await assertStripCover(page)
    if (mobile) {
      await assertLightboxUncropped(page)
    }
    const suffix = mobile ? '375' : 'desktop'
    await page.screenshot({
      path: `e2e/screenshots/photo-${id}-${suffix}.png`,
      fullPage: false,
    })
  })
}
