export const SUPPORTED_LOCALES = ['en-US', 'zh-CN'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en-US'

export const LOCALE_LABELS: Record<Locale, string> = {
  'en-US': 'English',
  'zh-CN': '简体中文'
}
