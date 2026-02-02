// Cloudflare Pages Function: locale-aware edge redirect for unprefixed routes.
//
// Behavior:
// - If request path is NOT prefixed with a canonical locale, redirect to /<locale><path>
// - Locale preference order:
//   1) Cookie SOFTA_LOCALE or NEXT_LOCALE
//   2) Accept-Language header (best match against SUPPORTED_LOCALES)
//   3) Fallback DEFAULT_LOCALE
//
// Notes:
// - This is designed for static export (Next output: 'export') on Cloudflare Pages.
// - Make sure to exclude assets/internal paths to avoid breaking static resources.
import {
  detectPreferredLocaleFromHeaders,
  ensureTrailingSlash,
  readPreferredLocaleFromCookie
} from '../app/_utils/locales'

export async function onRequest(context: any) {
  const request: Request = context.request
  const next: () => Promise<Response> = context.next
  const url = new URL(request.url)
  const pathname = url.pathname

  // Only redirect safe navigation requests.
  if (request.method !== 'GET' && request.method !== 'HEAD') return next()

  // Only handle the site root. All other pages are expected to be locale-prefixed already.
  // This intentionally does NOT redirect `/docs/*` or other unprefixed paths.
  if (pathname !== '/') return next()

  const cookieHeader = request.headers.get('Cookie') || ''
  // `detectPreferredLocaleFromHeaders` already implements:
  // Cookie (SOFTA_LOCALE / NEXT_LOCALE) -> Accept-Language -> DEFAULT_LOCALE
  // We keep a separate cookie read to avoid parsing Accept-Language if not needed.
  const fromCookie = readPreferredLocaleFromCookie(cookieHeader)
  const locale = fromCookie
    ? fromCookie
    : detectPreferredLocaleFromHeaders({
        cookie: cookieHeader,
        acceptLanguage: request.headers.get('Accept-Language')
      })

  const targetPath = ensureTrailingSlash(pathname)
  const redirectPathWithQuery = `/${locale}${targetPath}${url.search}`
  // Workers `Response.redirect()` requires an absolute URL.
  const redirectTo = new URL(redirectPathWithQuery, url).toString()

  const res = Response.redirect(redirectTo, 302)
  // Avoid caching locale redirects across users.
  res.headers.set('Cache-Control', 'private, no-store')

  // Persist choice for subsequent visits (JS-readable to stay compatible with current client logic).
  const maxAge = 60 * 60 * 24 * 365
  const secure = url.protocol === 'https:' ? '; Secure' : ''
  res.headers.append(
    'Set-Cookie',
    `SOFTA_LOCALE=${encodeURIComponent(locale)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
  )

  return res
}
