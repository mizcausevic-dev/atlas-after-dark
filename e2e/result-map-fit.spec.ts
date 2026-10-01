import { test } from '@playwright/test'
import { expectMarkersInsideMap } from './helpers/tapTargets'

test.describe('result map fitBounds', () => {
  test('far-apart guess vs Americas target shows both markers in frame', async ({
    page,
  }) => {
    await page.goto('/?e2eResult=far')
    await page.waitForSelector('.result-map .leaflet-container')
    await expectMarkersInsideMap(page)
  })

  test('dateline case (Honolulu vs ~150°E guess) shows both markers in frame', async ({
    page,
  }) => {
    await page.goto('/?e2eResult=dateline')
    await page.waitForSelector('.result-map .leaflet-container')
    await expectMarkersInsideMap(page)
  })
})
