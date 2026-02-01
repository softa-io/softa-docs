'use client'

import { useParams, usePathname } from 'next/navigation'
import Home from './Home'
import { normalizeLang, type Lang } from './i18n/lang'

export default function HomeEntry() {
  const params = useParams<{ lang?: string }>()
  const pathname = usePathname()
  const fromParams = typeof params?.lang === 'string' ? params.lang : undefined
  const fromPath = pathname?.startsWith('/zh-CN') ? 'zh-CN' : 'en-US'
  const lang: Lang = normalizeLang(fromParams ?? fromPath)

  return <Home lang={lang} />
}
