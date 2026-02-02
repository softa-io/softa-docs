export const SUPPORTED_LOCALES = ['en-US', 'zh-CN'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en-US'

export function isCanonicalLocaleSegment(input: string | undefined | null): input is Locale {
  if (!input) return false
  return (SUPPORTED_LOCALES as readonly string[]).includes(input)
}

export function normalizeLocale(input: string | undefined | null): Locale | null {
  if (!input) return null
  const raw = String(input).trim()
  if (!raw) return null

  // Normalize separators like zh_CN -> zh-CN
  const normalized = raw.replace(/_/g, '-')

  // 1) Exact match (case-insensitive) against canonical locales.
  const exact = SUPPORTED_LOCALES.find((l) => l.toLowerCase() === normalized.toLowerCase())
  if (exact) return exact

  // 2) Base-language match (e.g. "zh", "zh-Hans" -> first supported "zh-*").
  // If multiple variants exist (e.g. "pt-BR" + "pt-PT"), order in SUPPORTED_LOCALES decides.
  const base = normalized.toLowerCase().split('-')[0]
  const baseMatch = SUPPORTED_LOCALES.find((l) => l.toLowerCase().split('-')[0] === base)
  if (baseMatch) return baseMatch

  return null
}

export function ensureTrailingSlash(pathname: string) {
  // Keep file-like paths unchanged; otherwise align with `trailingSlash: true`.
  const last = pathname.split('/').pop() || ''
  if (last.includes('.')) return pathname
  if (pathname === '/') return '/'
  return pathname.endsWith('/') ? pathname : `${pathname}/`
}

export function isLocalePrefixedPathname(pathname: string) {
  const seg = pathname.replace(/^\/+/, '').split('/')[0]
  return isCanonicalLocaleSegment(seg)
}

export function readPreferredLocaleFromCookie(cookieHeaderOrCookieString: string): Locale | null {
  const m = cookieHeaderOrCookieString.match(
    /(?:^|;\s*)(?:SOFTA_LOCALE|NEXT_LOCALE)=([^;]+)/
  )
  const raw = m ? decodeURIComponent(m[1]) : null
  return normalizeLocale(raw)
}

export function parseAcceptLanguageHeader(header: string): string[] {
  // Returns language tags in preference order.
  // Example: "zh-CN,zh;q=0.9,en;q=0.8" -> ["zh-CN","zh","en"]
  if (!header) return []
  return header
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [tag, ...params] = part.split(';').map((s) => s.trim())
      let q = 1
      for (const p of params) {
        const m = p.match(/^q=([0-9.]+)$/i)
        if (m) {
          const n = Number(m[1])
          if (!Number.isNaN(n)) q = n
        }
      }
      return { tag, q }
    })
    .sort((a, b) => b.q - a.q)
    .map((x) => x.tag)
}

export function detectPreferredLocaleFromHeaders(opts: {
  cookie?: string | null
  acceptLanguage?: string | null
}): Locale {
  const fromCookie = readPreferredLocaleFromCookie(opts.cookie || '')
  if (fromCookie) return fromCookie

  const al = opts.acceptLanguage || ''
  for (const tag of parseAcceptLanguageHeader(al)) {
    const l = normalizeLocale(tag)
    if (l) return l
  }

  return DEFAULT_LOCALE
}

export const LOCALE_LABELS: Record<Locale, string> = {
  'en-US': 'English',
  'zh-CN': '简体中文'
}
