/** Prefix root-relative public paths with the Vite base (GitHub Pages subpath). */
export function assetUrl(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
