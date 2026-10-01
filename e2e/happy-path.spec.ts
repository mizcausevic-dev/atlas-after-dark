import { test, expect } from '@playwright/test'

test('daily case happy path: start, pin, score, clues', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Atlas After Dark' })).toBeVisible()
  await page.getByRole('button', { name: /Start tonight's case/i }).click()
  const evidence = page.getByRole('img', { name: /Night evidence/i })
  await expect(evidence).toBeVisible()
  const src = await evidence.getAttribute('src')
  expect(src).toContain('/atlas-after-dark/assets/photos/')
  await expect(evidence).toHaveAttribute(
    'src',
    /\/assets\/photos\/aad-\d+\.(webp|svg)/,
  )
  await expect
    .poll(() =>
      evidence.evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0)
  await page.locator('.leaflet-container').click({ position: { x: 220, y: 160 } })
  await page.getByRole('button', { name: /Lock in guess/i }).click()
  await expect(page.getByText(/Score \d+ \/ 6,300/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 2 })).toContainText(',')
  await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible()
})
