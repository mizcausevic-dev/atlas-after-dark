import { createServer } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createDefaultApiDeps,
  getClientIp,
  handleApi,
  type ApiDeps,
} from './api.ts'
import { readDistFile } from './staticFiles.ts'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dist = join(__dirname, '..', 'dist')
const port = Number(process.env.PORT) || 4173

const sessionSecret = process.env.AAD_SESSION_SECRET ?? ''
const apiDeps: ApiDeps = createDefaultApiDeps(sessionSecret)

const CSP =
  "default-src 'self'; " +
  "script-src 'self'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' https://tile.openstreetmap.org data:; " +
  "connect-src 'self'; " +
  "font-src 'self' data:; " +
  "frame-ancestors 'none'; " +
  "base-uri 'self'; " +
  "form-action 'self'"

function applySecurityHeaders(res: import('node:http').ServerResponse) {
  res.setHeader('Content-Security-Policy', CSP)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'DENY')
}

createServer(async (req, res) => {
  applySecurityHeaders(res)
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, url.pathname, getClientIp(req), apiDeps)
    return
  }

  const file = readDistFile(dist, url.pathname)
  if (!file) {
    res.statusCode = 404
    res.end('Not found')
    return
  }
  res.statusCode = 200
  res.setHeader('Content-Type', file.contentType)
  res.end(file.data)
}).listen(port, () => {
  console.log(`Atlas After Dark listening on http://localhost:${port}`)
  if (!sessionSecret) {
    console.warn('Warning: AAD_SESSION_SECRET is not set. API routes will return 503.')
  }
})
