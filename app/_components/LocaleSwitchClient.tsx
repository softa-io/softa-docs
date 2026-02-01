'use client'

import { Globe } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_LOCALE, normalizeLocale, SUPPORTED_LOCALES, type Locale } from '../_utils/locales'

function persistLocale(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `SOFTA_LOCALE=${encodeURIComponent(locale)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

function getCurrentLocale(pathname: string): Locale {
  const seg = pathname.split('/')[1] || ''
  return normalizeLocale(seg) ?? DEFAULT_LOCALE
}

function switchLocalePath(pathname: string, nextLocale: Locale) {
  const parts = pathname.split('/')
  const current = parts[1] || ''
  const currentLocale = normalizeLocale(current)

  if (currentLocale) parts[1] = nextLocale
  else parts.splice(1, 0, nextLocale)

  return parts.join('/') || `/${nextLocale}`
}

function localeLabel(locale: Locale) {
  return locale === 'en-US' ? 'English' : '简体中文'
}

export function LocaleSwitchClient() {
  const router = useRouter()
  const pathname = usePathname() || '/'
  const current = getCurrentLocale(pathname)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  function onSelect(nextLocale: Locale) {
    persistLocale(nextLocale)
    router.push(switchLocalePath(pathname, nextLocale))
    setOpen(false)
  }

  const items = useMemo(
    () =>
      SUPPORTED_LOCALES.map(l => ({
        locale: l,
        label: localeLabel(l)
      })),
    []
  )

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = rootRef.current
      if (!el) return
      if (e.target instanceof Node && el.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        aria-label="Language"
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 28,
          padding: '0 8px',
          border: 0,
          borderRadius: 10,
          background: 'transparent',
          color: 'inherit',
          fontSize: 11,
          lineHeight: '28px',
          cursor: 'pointer'
        }}
        onMouseEnter={e => {
          ;(e.currentTarget.style.background = 'var(--nextra-primary-color, rgba(0,0,0,.06))')
        }}
        onMouseLeave={e => {
          ;(e.currentTarget.style.background = 'transparent')
        }}
      >
        <Globe size={16} aria-hidden="true" />
        <span>{localeLabel(current)}</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Language menu"
          style={{
            position: 'absolute',
            top: 36,
            right: 0,
            minWidth: 140,
            padding: 6,
            borderRadius: 12,
            background: 'var(--nextra-background-color, #fff)',
            border: '1px solid var(--nextra-border-color, rgba(0,0,0,.1))',
            boxShadow:
              '0 12px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.08)',
            zIndex: 50
          }}
        >
          {items.map(item => (
            <button
              key={item.locale}
              type="button"
              role="menuitemradio"
              aria-checked={item.locale === current ? 'true' : 'false'}
              onClick={() => onSelect(item.locale)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                border: 0,
                borderRadius: 10,
                background:
                  item.locale === current
                    ? 'var(--nextra-primary-color, rgba(0,0,0,.06))'
                    : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                lineHeight: 1.2
              }}
              onMouseEnter={e => {
                if (item.locale === current) return
                ;(e.currentTarget.style.background =
                  'var(--nextra-primary-color, rgba(0,0,0,.06))')
              }}
              onMouseLeave={e => {
                if (item.locale === current) return
                ;(e.currentTarget.style.background = 'transparent')
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
