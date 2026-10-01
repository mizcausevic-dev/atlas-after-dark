import { test, expect } from '@playwright/test'

async function startCase(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Start tonight's case/i }).click()
  await expect(page.getByRole('application', { name: 'World map pin placement' })).toBeVisible()
}

test('Enter on Lock in guess submits when map is not focused', async ({ page }) => {
  await startCase(page)
  await page.getByRole('application', { name: 'World map pin placement' }).focus()
  await page.keyboard.press('ArrowUp')
  await page.getByRole('button', { name: /Lock in guess/i }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Score \d+ \/ 10,000/)).toBeVisible({ timeout: 15_000 })
})

test('Space on Lock in guess submits', async ({ page }) => {
  await startCase(page)
  await page.getByRole('application', { name: 'World map pin placement' }).focus()
  await page.keyboard.press('ArrowUp')
  await page.getByRole('button', { name: /Lock in guess/i }).focus()
  await page.keyboard.press('Space')
  await expect(page.getByText(/Score \d+ \/ 10,000/)).toBeVisible({ timeout: 15_000 })
})

test('Enter on Reveal hint 1 reveals hint without map intercepting', async ({ page }) => {
  await startCase(page)
  const hintBtn = page.getByRole('button', { name: /Reveal hint 1/i })
  await hintBtn.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Hemisphere:/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Hint 1 revealed/i })).toBeDisabled()
})

test('Arrow keys nudge pin only when map is focused', async ({ page }) => {
  await startCase(page)
  await page.getByRole('button', { name: /Reveal hint 1/i }).focus()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('button', { name: /Lock in guess/i })).toBeDisabled()
  await page.getByRole('application', { name: 'World map pin placement' }).focus()
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('button', { name: /Lock in guess/i })).toBeEnabled()
})
