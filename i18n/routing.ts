import { DEFAULT_LOCALE, LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from './config'

export { DEFAULT_LOCALE, LOCALE_LABELS, SUPPORTED_LOCALES, type Locale }

export function isCanonicalLocaleSegment(input: string | undefined | null): input is Locale {
  if (!input) return false
  return (SUPPORTED_LOCALES as readonly string[]).includes(input)
}

export function normalizeLocale(input: string | undefined | null): Locale | null {
  if (!input) return null
  const raw = String(input).trim()
  if (!raw) return null

  const normalized = raw.replace(/_/g, '-')
  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === normalized.toLowerCase())
  if (exact) return exact

  const base = normalized.toLowerCase().split('-')[0]
  const baseMatch = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase().split('-')[0] === base)
  if (baseMatch) return baseMatch

  return null
}

export function ensureTrailingSlash(pathname: string) {
  const last = pathname.split('/').pop() || ''
  if (last.includes('.')) return pathname
  if (pathname === '/') return '/'
  return pathname.endsWith('/') ? pathname : `${pathname}/`
}

export function isLocalePrefixedPathname(pathname: string) {
  const segment = pathname.replace(/^\/+/, '').split('/')[0]
  return isCanonicalLocaleSegment(segment)
}

export function getLocaleFromPathname(pathname: string): Locale {
  const segment = pathname.replace(/^\/+/, '').split('/')[0]
  return normalizeLocale(segment) ?? DEFAULT_LOCALE
}

export function getLocaleRootPath(locale: Locale) {
  return `/${locale}`
}

export function switchLocalePath(pathname: string, nextLocale: Locale) {
  const parts = pathname.split('/')
  const current = parts[1] || ''
  const currentLocale = normalizeLocale(current)

  if (currentLocale) parts[1] = nextLocale
  else parts.splice(1, 0, nextLocale)

  return parts.join('/') || `/${nextLocale}`
}

export function prefixPathWithLocale(pathname: string, locale: Locale) {
  if (!pathname) return getLocaleRootPath(locale)
  if (/^(?:[a-zA-Z][a-zA-Z\d+.-]*:|#|mailto:|tel:)/.test(pathname) || pathname.startsWith('//')) {
    return pathname
  }
  if (isLocalePrefixedPathname(pathname)) return pathname

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${getLocaleRootPath(locale)}${normalizedPath}`
}

export function readPreferredLocaleFromCookie(cookieHeaderOrCookieString: string): Locale | null {
  const match = cookieHeaderOrCookieString.match(
    /(?:^|;\s*)(?:SOFTA_LOCALE|NEXT_LOCALE)=([^;]+)/
  )
  const raw = match ? decodeURIComponent(match[1]) : null
  return normalizeLocale(raw)
}

export function parseAcceptLanguageHeader(header: string): string[] {
  if (!header) return []

  return header
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [tag, ...params] = part.split(';').map((section) => section.trim())
      let q = 1

      for (const param of params) {
        const match = param.match(/^q=([0-9.]+)$/i)
        if (!match) continue
        const value = Number(match[1])
        if (!Number.isNaN(value)) q = value
      }

      return { tag, q }
    })
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag)
}

export function detectPreferredLocaleFromHeaders(opts: {
  cookie?: string | null
  acceptLanguage?: string | null
}): Locale {
  const fromCookie = readPreferredLocaleFromCookie(opts.cookie || '')
  if (fromCookie) return fromCookie

  const acceptLanguage = opts.acceptLanguage || ''
  for (const tag of parseAcceptLanguageHeader(acceptLanguage)) {
    const locale = normalizeLocale(tag)
    if (locale) return locale
  }

  return DEFAULT_LOCALE
}
