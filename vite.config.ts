import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { atlasApiPlugin } from './vite-plugin-atlas-api.ts'

const offlineBuild =
  process.env.VITE_OFFLINE === 'true' || process.env.VITE_OFFLINE === '1'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  define: {
    __AAD_OFFLINE__: JSON.stringify(offlineBuild),
  },
  plugins: [react(), atlasApiPlugin()],
  test: {
    environment: 'jsdom',
    include: ['shared/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
