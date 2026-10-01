import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173/atlas-after-dark/',
    trace: 'on-first-retry',
  },
  webServer: {
    command:
      'npx cross-env VITE_OFFLINE=true VITE_BASE=/atlas-after-dark/ npm run build && npx vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/atlas-after-dark/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
