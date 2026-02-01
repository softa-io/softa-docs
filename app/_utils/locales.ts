export const SUPPORTED_LOCALES = ['en-US', 'zh-CN'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en-US'

export function normalizeLocale(input: string | undefined | null): Locale | null {
  if (!input) return null
  if ((SUPPORTED_LOCALES as readonly string[]).includes(input)) return input as Locale

  const base = input.toLowerCase().split('-')[0]
  if (base === 'zh') return 'zh-CN'
  if (base === 'en') return 'en-US'
  return null
}

