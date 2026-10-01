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
      testIgnore: /mobile-touch\.spec\.ts/,
    },
    {
      name: 'mobile-iphone-se',
      testMatch: /mobile-touch\.spec\.ts/,
      use: { ...devices['iPhone SE'], hasTouch: true },
    },
    {
      name: 'mobile-pixel-7',
      testMatch: /mobile-touch\.spec\.ts/,
      use: { ...devices['Pixel 7'], hasTouch: true },
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
