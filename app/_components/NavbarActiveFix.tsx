'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import type { Locale } from '../_utils/locales'

type Props = {
  locale: Locale
}

/**
 * Nextra currently marks `/<locale>/` as `aria-current` on subroutes like
 * `/<locale>/docs/...`, which makes "Home" appear active/bold everywhere and
 * is also incorrect for assistive technologies.
 *
 * This fixes the semantics by removing `aria-current` from the locale root
 * navbar link unless the current route is exactly the locale root.
 */
export function NavbarActiveFix({ locale }: Props) {
  const pathname = usePathname() || '/'

  useEffect(() => {
    const homeHref = `/${locale}/`
    const homeHrefNoSlash = `/${locale}`

    if (pathname === homeHref || pathname === homeHrefNoSlash) return

    const nav = document.querySelector('.nextra-navbar nav')
    if (!nav) return

    const homeLinks = [
      nav.querySelector(`a[href="${homeHref}"]`),
      nav.querySelector(`a[href="${homeHrefNoSlash}"]`)
    ].filter(Boolean) as HTMLAnchorElement[]

    for (const a of homeLinks) {
      if (a.getAttribute('aria-current') === 'true') {
        a.removeAttribute('aria-current')
      }
    }
  }, [pathname, locale])

  return null
}

