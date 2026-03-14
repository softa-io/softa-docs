'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getAppMessages } from '../../i18n/get-messages'
import { getLocaleFromPathname } from '../../i18n/routing'

type NotFoundViewProps = Readonly<{
  withinDocs?: boolean
  withinSiteShell?: boolean
}>

export function NotFoundView({
  withinDocs = false,
  withinSiteShell = false
}: NotFoundViewProps) {
  const pathname = usePathname() || '/'
  const locale = getLocaleFromPathname(pathname)
  const copy = getAppMessages(locale).notFound

  const docsHomeHref = `/${locale}/docs`
  const siteHomeHref = `/${locale}`
  const currentPath = pathname
  const isDocsPath =
    currentPath === docsHomeHref || currentPath.startsWith(`${docsHomeHref}/`)
  const renderEmbedded = withinDocs || withinSiteShell || isDocsPath
  const links = [
    { href: docsHomeHref, label: copy.docsLabel },
    { href: `/${locale}/docs/backend_dev`, label: copy.backendLabel },
    { href: `/${locale}/docs/frontend_dev`, label: copy.frontendLabel },
    { href: `/${locale}/about`, label: copy.aboutLabel }
  ]

  return (
    <section
      className={
        withinSiteShell
          ? 'x:w-full x:max-w-3xl x:py-0'
          : renderEmbedded
          ? 'x:mx-auto x:max-w-(--nextra-content-width) x:px-6 x:py-16'
          : 'x:relative x:isolate x:flex x:min-h-screen x:items-center x:overflow-hidden x:px-6 x:py-12'
      }
    >
      {!renderEmbedded ? (
        <div
          aria-hidden="true"
          className="x:pointer-events-none x:absolute x:inset-0 x:-z-1"
          style={{
            background:
              'radial-gradient(circle at top, rgba(59,130,246,0.16), transparent 34%), linear-gradient(180deg, #f8fafc 0%, #ffffff 45%, #f8fafc 100%)'
          }}
        />
      ) : null}

      <div
        className={
          withinSiteShell
            ? 'x:mx-auto x:w-full x:text-center'
            : renderEmbedded
            ? 'x:mx-auto x:w-full x:max-w-4xl'
            : 'x:mx-auto x:w-full x:max-w-4xl x:overflow-hidden x:rounded-[32px] x:border x:border-black/10 x:bg-linear-to-br x:from-white x:via-white x:to-slate-50 x:p-8 x:shadow-[0_24px_80px_rgba(15,23,42,0.10)] x:dark:border-white/10 x:dark:from-neutral-900 x:dark:via-neutral-950 x:dark:to-black x:md:p-10'
        }
      >
        {!renderEmbedded ? (
          <div className="x:mb-8 x:flex x:items-center x:justify-between x:gap-4 x:border-b x:border-black/5 x:pb-6 x:dark:border-white/10">
            <Link
              href={siteHomeHref}
              className="x:inline-flex x:items-center x:gap-3 x:text-sm x:font-semibold x:text-slate-800 x:no-underline x:dark:text-slate-100"
            >
              <img src="/icon.png" alt="Softa" width={28} height={28} />
              <span>Softa</span>
            </Link>
          </div>
        ) : null}

        <div
          className={
            withinSiteShell
              ? 'x:flex x:flex-wrap x:items-center x:justify-center x:gap-3'
              : 'x:flex x:flex-wrap x:items-center x:gap-3'
          }
        >
          <span className="x:inline-flex x:rounded-full x:border x:border-current/10 x:bg-primary-600/10 x:px-3 x:py-1 x:text-xs x:font-semibold x:uppercase x:tracking-[0.18em] x:text-primary-700 x:dark:text-primary-300">
            {copy.badge}
          </span>
          <span className="x:text-sm x:text-gray-500 x:dark:text-gray-400">
            {currentPath}
          </span>
        </div>

        <h1 className="x:mt-5 x:text-4xl x:font-bold x:tracking-tight x:text-slate-900 x:dark:text-slate-100 x:md:text-5xl">
          {copy.title}
        </h1>

        <p
          className={
            withinSiteShell
              ? 'x:mx-auto x:mt-4 x:max-w-2xl x:text-base x:leading-7 x:text-gray-600 x:dark:text-gray-300'
              : 'x:mt-4 x:max-w-2xl x:text-base x:leading-7 x:text-gray-600 x:dark:text-gray-300'
          }
        >
          {copy.description}
        </p>

        <p
          className={
            withinSiteShell
              ? 'x:mx-auto x:mt-3 x:max-w-2xl x:text-sm x:leading-6 x:text-gray-500 x:dark:text-gray-400'
              : 'x:mt-3 x:max-w-2xl x:text-sm x:leading-6 x:text-gray-500 x:dark:text-gray-400'
          }
        >
          {copy.hint}
        </p>

        {withinSiteShell ? null : (
          <div className="x:mt-10 x:grid x:gap-3 x:md:grid-cols-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="x:rounded-2xl x:border x:border-black/10 x:bg-white/70 x:px-4 x:py-4 x:text-sm x:font-medium x:text-slate-700 x:no-underline x:transition x:hover:border-primary-500/30 x:hover:text-primary-700 x:dark:border-white/10 x:dark:bg-white/[.03] x:dark:text-slate-200 x:dark:hover:text-primary-300"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
