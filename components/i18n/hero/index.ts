import type { Lang } from '../lang'
import type { HeroCopy } from './types'

import enUS from './en-US.json'
import zhCN from './zh-CN.json'

const HERO_DICTIONARIES: Record<Lang, HeroCopy> = {
  'en-US': enUS,
  'zh-CN': zhCN
}

export type { HeroCopy }

export function getHeroDictionary(lang: Lang): HeroCopy {
  return HERO_DICTIONARIES[lang]
}
