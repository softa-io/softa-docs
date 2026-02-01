import type { Lang } from '../lang'
import type { FeatureItem, FeaturesDictionary } from './types'

import enUS from './en-US.json'
import zhCN from './zh-CN.json'

const FEATURES_DICTIONARIES: Record<Lang, FeaturesDictionary> = {
  'en-US': enUS,
  'zh-CN': zhCN
}

export type { FeatureItem, FeaturesDictionary }

export function getFeaturesDictionary(lang: Lang): FeaturesDictionary {
  return FEATURES_DICTIONARIES[lang]
}
