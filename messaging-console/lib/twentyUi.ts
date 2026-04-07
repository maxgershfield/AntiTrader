/**
 * Builds links into the Twenty web UI (self-hosted or cloud).
 * Paths vary by Twenty version — override with NEXT_PUBLIC_TWENTY_PATH_* if defaults 404.
 */

export function joinOriginPath(origin: string, path: string): string {
  const base = origin.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

export function getTwentyUiOrigin(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TWENTY_UI_URL) {
    return process.env.NEXT_PUBLIC_TWENTY_UI_URL.replace(/\/$/, '')
  }
  return 'http://localhost:3020'
}

export function getTwentyPipelineUrl(): string {
  const origin = getTwentyUiOrigin()
  const path = process.env.NEXT_PUBLIC_TWENTY_PATH_OPPORTUNITIES || '/objects/opportunities'
  return joinOriginPath(origin, path)
}

export function getTwentyPeopleUrl(): string {
  const origin = getTwentyUiOrigin()
  const path = process.env.NEXT_PUBLIC_TWENTY_PATH_PEOPLE || '/objects/people'
  return joinOriginPath(origin, path)
}
