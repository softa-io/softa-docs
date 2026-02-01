import type { Lang } from '../lang'
import type { HomeDictionary, HomeQuickLink } from './types'

import enUS from './en-US.json'
import zhCN from './zh-CN.json'

// Compile-time validation: if JSON misses keys or has wrong types, TS will error here.
const HOME_DICTIONARIES: Record<Lang, HomeDictionary> = {
  'en-US': enUS,
  'zh-CN': zhCN
}

export type { HomeDictionary, HomeQuickLink }

export function getHomeDictionary(lang: Lang): HomeDictionary {
  return HOME_DICTIONARIES[lang]
}
