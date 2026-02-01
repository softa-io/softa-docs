import 'server-only'
import { cache } from 'react'

export const locales = ['en-US', 'zh-CN'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en-US'

type Dictionary = {
  backToTop: string
  dark: string
  editPage: string
  feedback: string
  footer: string
  lastUpdated: string
  light: string
  searchEmptyResult: string
  searchError: string
  searchLoading: string
  searchPlaceholder: string
  system: string
  tocTitle: string
}

const dictionaries: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  'en-US': () => import('./en-US.json'),
  'zh-CN': () => import('./zh-CN.json')
}

const getDictionaryByLocale = cache(async (locale: Locale): Promise<Dictionary> => {
  const { default: dictionary } = await dictionaries[locale]()
  return dictionary
})

export async function getDictionary(locale: string): Promise<Dictionary> {
  const l = (locales.includes(locale as Locale) ? locale : defaultLocale) as Locale
  return getDictionaryByLocale(l)
}

export function getDirection(_locale: string) {
  return 'ltr' as const
}
