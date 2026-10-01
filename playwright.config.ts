import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173/atlas-after-dark/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /(?:mobile-touch|result-map-fit|photo-strip-visual)\.spec\.ts/,
    },
    {
      name: 'mobile-iphone-se',
      testMatch: /(?:mobile-touch|result-map-fit)\.spec\.ts/,
      use: { ...devices['iPhone SE'], hasTouch: true },
    },
    {
      name: 'mobile-pixel-7',
      testMatch: /(?:mobile-touch|result-map-fit)\.spec\.ts/,
      use: { ...devices['Pixel 7'], hasTouch: true },
    },
    {
      name: 'photo-visual-desktop',
      testMatch: /photo-strip-visual\.spec\.ts/,
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'photo-visual-mobile',
      testMatch: /photo-strip-visual\.spec\.ts/,
      use: { ...devices['Pixel 7'], hasTouch: true, viewport: { width: 375, height: 667 } },
    },
  ],
  webServer: {
    command:
      'npx cross-env VITE_OFFLINE=true VITE_BASE=/atlas-after-dark/ npm run build && npx vite preview --host 127.0.0.1 --port 4173 --base /atlas-after-dark/',
    url: 'http://127.0.0.1:4173/atlas-after-dark/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
