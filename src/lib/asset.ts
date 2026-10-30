/** Resolves a file in `public/` against Vite's base URL so paths work on GitHub Pages sub-paths. */
export function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
