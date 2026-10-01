import { test, expect } from '@playwright/test'
import { expectMarkersInsideMap, expectMinTapTargets } from './helpers/tapTargets'

function screenshotSlug(projectName: string): string {
  if (projectName === 'mobile-iphone-se') return 'iphone-se'
  if (projectName === 'mobile-pixel-7') return 'pixel-7'
  return projectName
}

test('tap targets ≥44px on title screen', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Atlas After Dark' })).toBeVisible()
  await expectMinTapTargets(page)
})

test('play flow: tap map, sticky lock, result pins in view', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await page.getByRole('button', { name: /Start tonight's case/i }).click()
  await expect(page.locator('.play-grid')).toBeVisible({ timeout: 15_000 })
  await page.locator('.play-map .leaflet-container').click({ position: { x: 100, y: 90 } })
  await expect(page.locator('.mobile-lock-bar .primary--lock')).toBeEnabled()
  await page.locator('.mobile-lock-bar .primary--lock').click()
  await expect(page.getByText(/Score \d+ \/ 6,300/)).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.locator('.result-map')).toBeVisible()
  await expectMarkersInsideMap(page)
})

test('result map markers inside container at 375×667', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await page.getByRole('button', { name: /Start tonight's case/i }).click()
  await page.locator('.leaflet-container').click({ position: { x: 100, y: 90 } })
  await page.locator('.mobile-lock-bar .primary--lock').click()
  await expect(page.getByText(/Score \d+ \/ 6,300/)).toBeVisible({
    timeout: 15_000,
  })
  await expectMarkersInsideMap(page)
})

test('landscape 667×375: lock bar reachable, no horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 667, height: 375 })
  await page.goto('/')
  await page.getByRole('button', { name: /Start tonight's case/i }).click()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(overflow).toBe(false)
  const lock = page.locator('.mobile-lock-bar .primary--lock')
  await expect(lock).toBeVisible()
  await lock.scrollIntoViewIfNeeded()
  const box = await lock.boundingBox()
  expect(box).toBeTruthy()
  if (box) {
    expect(box.y + box.height).toBeLessThanOrEqual(375 + 1)
  }
})

test('mode radios tappable via full label', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await page.getByText('Night Owl', { exact: false }).click()
  await expect(page.getByRole('radio', { name: /Night Owl/i })).toBeChecked()
})

test('screenshots at 375px title, play, result', async ({ page }, testInfo) => {
  const slug = screenshotSlug(testInfo.project.name)
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await page.screenshot({
    path: `e2e/screenshots/${slug}-title-375.png`,
    fullPage: true,
  })
  await page.getByRole('button', { name: /Start tonight's case/i }).click()
  await page.screenshot({
    path: `e2e/screenshots/${slug}-play-375.png`,
    fullPage: true,
  })
  await page.locator('.play-map .leaflet-container').click({ position: { x: 110, y: 95 } })
  await page.locator('.mobile-lock-bar .primary--lock').click()
  await expect(page.getByText(/Score \d+ \/ 6,300/)).toBeVisible({
    timeout: 15_000,
  })
  await page.screenshot({
    path: `e2e/screenshots/${slug}-result-375.png`,
    fullPage: true,
  })
})

test('scroll resets on start; map center not covered by photo strip', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const before = await page.evaluate(() => window.scrollY)
  expect(before).toBeGreaterThan(0)
  await page.getByRole('button', { name: /Start tonight's case/i }).click()
  await expect(page.locator('.play-grid')).toBeVisible({ timeout: 15_000 })
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(0)
  const mapHit = await page.evaluate(() => {
    const map = document.querySelector('.play-map .leaflet-container')
    if (!map) return { ok: false, reason: 'no map' }
    const r = map.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const el = document.elementFromPoint(cx, cy)
    if (!el) return { ok: false, reason: 'no element at center' }
    return { ok: map.contains(el), tag: el.tagName, cls: el.className }
  })
  expect(mapHit.ok, mapHit.reason ?? mapHit.cls).toBe(true)
})

test('no horizontal overflow at 320px on title and play', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  let overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(overflow).toBe(false)
  await page.getByRole('button', { name: /Start tonight's case/i }).click()
  overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  )
  expect(overflow).toBe(false)
})
