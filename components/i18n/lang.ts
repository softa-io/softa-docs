export const SUPPORTED_LANGS = ['en-US', 'zh-CN'] as const
export type Lang = (typeof SUPPORTED_LANGS)[number]

export function normalizeLang(input: unknown): Lang {
  return input === 'zh-CN' ? 'zh-CN' : 'en-US'
}

export function toLocalePath(lang: Lang) {
  return lang === 'zh-CN' ? '/zh-CN' : '/en-US'
}
