'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  DEFAULT_LOCALE,
  ensureTrailingSlash,
  LOCALE_LABELS,
  normalizeLocale,
  readPreferredLocaleFromCookie,
  SUPPORTED_LOCALES,
  type Locale
} from '../_utils/locales'

function detectPreferredLocale(): Locale {
  // 1) Cookie preference (compatible with previous behavior)
  const cookie = typeof document !== 'undefined' ? document.cookie : ''
  const fromCookie = readPreferredLocaleFromCookie(cookie)
  if (fromCookie) return fromCookie

  // 2) Browser language
  if (typeof navigator !== 'undefined') {
    const langs = (navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language]
    ).filter(Boolean) as string[]

    for (const lang of langs) {
      const l = normalizeLocale(lang)
      if (l) return l
    }
  }

  // 3) Fallback
  return DEFAULT_LOCALE
}

function persistLocale(locale: Locale) {
  // 1 year
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `SOFTA_LOCALE=${encodeURIComponent(locale)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

export function LocaleRedirectClient({
  originalPathname
}: {
  originalPathname: string
}) {
  const router = useRouter()
  const clientPathname = usePathname()

  useEffect(() => {
    const locale = detectPreferredLocale()
    persistLocale(locale)

    // Prefer the server-provided pathname for static pages to avoid edge cases.
    const path = originalPathname || clientPathname || '/'
    const target = `/${locale}${ensureTrailingSlash(path)}`
    router.replace(target)
  }, [router, clientPathname, originalPathname])

  const path = originalPathname || '/'
  const normalized = ensureTrailingSlash(path)

  return (
    <main style={{ padding: 24 }}>
      <p>Redirecting…</p>
      <noscript>
        <p>
          JavaScript is required for automatic locale routing on static hosting.
          Please choose a language:
        </p>
        <ul>
          {SUPPORTED_LOCALES.map((l) => (
            <li key={l}>
              <a href={`/${l}${normalized}`}>{LOCALE_LABELS[l] || l}</a>
            </li>
          ))}
        </ul>
      </noscript>
    </main>
  )
}
