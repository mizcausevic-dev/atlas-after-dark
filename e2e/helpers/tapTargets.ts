import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const MIN_TAP = 44

export async function expectMinTapTargets(page: Page, minPx = MIN_TAP) {
  const offenders = await page.evaluate((minSize) => {
    const skip = (el: Element | null) => {
      if (!el) return true
      if (el.closest('.leaflet-control-attribution')) return true
      return false
    }
    const isVisible = (el: Element) => {
      const style = window.getComputedStyle(el)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }
    const nodes = document.querySelectorAll(
      'button, a[href], label, input[type="checkbox"], input[type="radio"]',
    )
    const bad: string[] = []
    nodes.forEach((el) => {
      if (skip(el) || !isVisible(el)) return
      const tag = el.tagName.toLowerCase()
      if (tag === 'input') {
        const type = (el as HTMLInputElement).type
        if (type === 'radio' || type === 'checkbox') {
          const parentLabel = el.closest('label')
          if (parentLabel) {
            const lr = parentLabel.getBoundingClientRect()
            if (lr.width >= minSize && lr.height >= minSize) return
          }
        }
      }
      const rect = el.getBoundingClientRect()
      if (rect.width < minSize || rect.height < minSize) {
        const name =
          el.getAttribute('aria-label') ||
          (el as HTMLElement).innerText?.slice(0, 40) ||
          tag
        bad.push(`${tag} "${name}" ${Math.round(rect.width)}×${Math.round(rect.height)}`)
      }
    })
    return bad
  }, minPx)
  expect(offenders, offenders.join('\n')).toEqual([])
}

function markersInsideMapEval() {
  const map = document.querySelector('.result-map .leaflet-container')
  if (!map) return { ok: false, reason: 'no result map' }
  const mapRect = map.getBoundingClientRect()
  const pane = map.querySelector('.leaflet-marker-pane')
  if (!pane) return { ok: false, reason: 'no marker pane' }
  const markers = pane.querySelectorAll(':scope > *')
  if (markers.length < 2) {
    return { ok: false, reason: `expected 2 markers, got ${markers.length}` }
  }
  const tol = 2
  for (const m of markers) {
    const r = m.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if (
      r.left < mapRect.left - tol ||
      r.right > mapRect.right + tol ||
      r.top < mapRect.top - tol ||
      r.bottom > mapRect.bottom + tol
    ) {
      return { ok: false, reason: 'marker bounding box outside map' }
    }
  }
  return { ok: true }
}

export async function expectMarkersInsideMap(page: Page) {
  await expect
    .poll(
      async () => {
        const ok = await page.evaluate(markersInsideMapEval)
        return ok.ok ? 'ok' : ok.reason ?? 'unknown'
      },
      { timeout: 8_000 },
    )
    .toBe('ok')
}
