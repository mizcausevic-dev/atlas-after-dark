import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleApi } from './server/api.ts'

function listener(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) {
  const url = req.url ?? ''
  if (!url.startsWith('/api/')) {
    next()
    return
  }
  const pathname = url.split('?')[0] ?? url
  void handleApi(req, res, pathname)
}

export function atlasApiPlugin(): Plugin {
  return {
    name: 'atlas-api',
    configureServer(server) {
      server.middlewares.use(listener)
    },
    configurePreviewServer(server) {
      server.middlewares.use(listener)
    },
  }
}
