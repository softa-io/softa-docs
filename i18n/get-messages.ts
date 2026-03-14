import { DEFAULT_LOCALE, type Locale } from './config'
import { normalizeLocale } from './routing'
import type { AppMessages, HomeMessages, MessagesByNamespace } from './types'

import enUSApp from './messages/en-US/app.json'
import enUSHome from './messages/en-US/home.json'
import zhCNApp from './messages/zh-CN/app.json'
import zhCNHome from './messages/zh-CN/home.json'

const MESSAGES: Record<Locale, MessagesByNamespace> = {
  'en-US': {
    app: enUSApp as AppMessages,
    home: enUSHome as HomeMessages
  },
  'zh-CN': {
    app: zhCNApp as AppMessages,
    home: zhCNHome as HomeMessages
  }
}

export function getMessages<N extends keyof MessagesByNamespace>(
  locale: Locale | string | null | undefined,
  namespace: N
): MessagesByNamespace[N] {
  const resolvedLocale = normalizeLocale(locale) ?? DEFAULT_LOCALE
  return MESSAGES[resolvedLocale][namespace]
}

export function getAppMessages(locale: Locale | string | null | undefined): AppMessages {
  return getMessages(locale, 'app')
}

export function getHomeMessages(locale: Locale | string | null | undefined): HomeMessages {
  return getMessages(locale, 'home')
}

export type { AppMessages, HomeMessages, MessagesByNamespace }
