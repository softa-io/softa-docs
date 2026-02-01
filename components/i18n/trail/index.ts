import type { Lang } from '../lang'
import type { TrailCopy } from './types'

import enUS from './en-US.json'
import zhCN from './zh-CN.json'

const TRAIL_DICTIONARIES: Record<Lang, TrailCopy> = {
  'en-US': enUS,
  'zh-CN': zhCN
}

export type { TrailCopy }

export function getTrailDictionary(lang: Lang): TrailCopy {
  return TRAIL_DICTIONARIES[lang]
}
