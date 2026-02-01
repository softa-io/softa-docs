'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { DEFAULT_LOCALE, normalizeLocale } from '../_utils/locales'

function detectPreferredLocale(): 'en-US' | 'zh-CN' {
  // 1) Cookie preference (compatible with previous behavior)
  const cookie = typeof document !== 'undefined' ? document.cookie : ''
  if (cookie) {
    const m = cookie.match(/(?:^|;\s*)(?:SOFTA_LOCALE|NEXT_LOCALE)=([^;]+)/)
    const l = normalizeLocale(m?.[1])
    if (l) return l
  }

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

function persistLocale(locale: 'en-US' | 'zh-CN') {
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
    const target = `/${locale}${path === '/' ? '' : path}`
    router.replace(target)
  }, [router, clientPathname, originalPathname])

  return (
    <main style={{ padding: 24 }}>
      <p>Redirecting…</p>
      <noscript>
        <p>
          JavaScript is required for automatic locale routing on static hosting.
          Please choose a language:
        </p>
        <ul>
          <li>
            <a href={`/en-US${originalPathname === '/' ? '' : originalPathname}`}>
              English
            </a>
          </li>
          <li>
            <a href={`/zh-CN${originalPathname === '/' ? '' : originalPathname}`}>
              简体中文
            </a>
          </li>
        </ul>
      </noscript>
    </main>
  )
}

