'use client'

import { usePathname } from 'next/navigation'
import { getLocaleFromPathname } from '../i18n/routing'
import Home from './Home'

export default function HomeEntry() {
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname || '/')

  return <Home locale={locale} />
}
