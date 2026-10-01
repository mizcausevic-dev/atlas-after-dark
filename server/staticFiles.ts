import { existsSync, readFileSync } from 'node:fs'
import { extname, normalize, resolve, sep } from 'node:path'

const mime: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

function isInsideRoot(root: string, filePath: string): boolean {
  const rootWithSep = root.endsWith(sep) ? root : root + sep
  return filePath === root || filePath.startsWith(rootWithSep)
}

/** Resolve a URL path to a file under dist; null if outside dist or missing. */
export function resolveDistFile(
  distRoot: string,
  urlPath: string,
): { path: string; contentType: string } | null {
  const distResolved = resolve(distRoot)
  const relative =
    urlPath === '/' || urlPath === ''
      ? 'index.html'
      : normalize(urlPath.replace(/^\/+/, ''))
  if (relative.startsWith(`..${sep}`) || relative === '..') {
    return null
  }
  let filePath = resolve(distResolved, relative)
  if (!isInsideRoot(distResolved, filePath)) {
    return null
  }
  if (!existsSync(filePath) || extname(filePath) === '') {
    filePath = resolve(distResolved, 'index.html')
  }
  if (!isInsideRoot(distResolved, filePath) || !existsSync(filePath)) {
    return null
  }
  return {
    path: filePath,
    contentType: mime[extname(filePath)] ?? 'application/octet-stream',
  }
}

export function readDistFile(
  distRoot: string,
  urlPath: string,
): { data: Buffer; contentType: string } | null {
  const resolved = resolveDistFile(distRoot, urlPath)
  if (!resolved) return null
  try {
    return {
      data: readFileSync(resolved.path),
      contentType: resolved.contentType,
    }
  } catch {
    return null
  }
}
