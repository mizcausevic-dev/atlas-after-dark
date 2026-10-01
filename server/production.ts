import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApi } from './api.ts'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dist = join(__dirname, '..', 'dist')
const port = Number(process.env.PORT) || 4173

const mime: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, url.pathname)
    return
  }

  let path = join(dist, url.pathname === '/' ? 'index.html' : url.pathname)
  if (!existsSync(path) || extname(path) === '') {
    path = join(dist, 'index.html')
  }
  try {
    const data = readFileSync(path)
    res.statusCode = 200
    res.setHeader(
      'Content-Type',
      mime[extname(path)] ?? 'application/octet-stream',
    )
    res.end(data)
  } catch {
    res.statusCode = 404
    res.end('Not found')
  }
}).listen(port, () => {
  console.log(`Atlas After Dark listening on http://localhost:${port}`)
})
