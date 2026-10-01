import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  createDefaultApiDeps,
  getClientIp,
  handleApi,
  type ApiDeps,
} from './server/api.ts'

let deps: ApiDeps | null = null

function getDeps(): ApiDeps {
  if (!deps) {
    const secret =
      process.env.AAD_SESSION_SECRET ??
      'dev-insecure-session-secret-change-me'
    deps = createDefaultApiDeps(secret)
  }
  return deps
}

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
  void handleApi(req, res, pathname, getClientIp(req), getDeps())
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
