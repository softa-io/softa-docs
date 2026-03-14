'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { getLocaleFromPathname } from '../../i18n/routing'

declare global {
  interface Window {
    pagefind?: {
      destroy?: () => Promise<void> | void
      options?: (opts: unknown) => Promise<void> | void
    }
  }
}

/**
 * Keeps <html lang> in sync on client-side navigation and resets Pagefind,
 * since Pagefind chooses its language index at init-time and caches globally.
 */
export function PagefindLocaleSyncClient() {
  const pathname = usePathname() || '/'
  const lastLocaleRef = useRef<string | null>(null)

  useEffect(() => {
    const locale = getLocaleFromPathname(pathname)

    // Always keep the html lang correct.
    document.documentElement.setAttribute('lang', locale)
    document.documentElement.setAttribute('dir', 'ltr')
    document.documentElement.setAttribute('data-softa-locale', locale)

    // If locale changed and Pagefind is already loaded, reset it so the next
    // search initializes with the new language index.
    if (lastLocaleRef.current && lastLocaleRef.current !== locale) {
      const pf = window.pagefind
      if (pf?.destroy) {
        Promise.resolve(pf.destroy()).finally(() => {
          // Re-apply baseUrl (destroy clears initial options).
          pf.options?.({ baseUrl: '/' })
        })
      }
    }

    lastLocaleRef.current = locale
  }, [pathname])

  return null
}
