'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getAppMessages } from '../../i18n/get-messages'
import { getLocaleFromPathname } from '../../i18n/routing'

type NotFoundViewProps = Readonly<{
  withinDocs?: boolean
}>

export function NotFoundView({ withinDocs = false }: NotFoundViewProps) {
  const pathname = usePathname() || '/'
  const locale = getLocaleFromPathname(pathname)
  const copy = getAppMessages(locale).notFound

  const docsHomeHref = `/${locale}/docs`
  const siteHomeHref = `/${locale}`
  const links = [
    { href: docsHomeHref, label: copy.docsLabel },
    { href: `/${locale}/docs/backend_dev`, label: copy.backendLabel },
    { href: `/${locale}/docs/frontend_dev`, label: copy.frontendLabel },
    { href: `/${locale}/about`, label: copy.aboutLabel }
  ]

  return (
    <section
      className={
        withinDocs
          ? 'x:mx-auto x:max-w-(--nextra-content-width) x:px-6 x:py-16'
          : 'x:mx-auto x:flex x:min-h-[70vh] x:max-w-(--nextra-content-width) x:items-center x:px-6 x:py-16'
      }
    >
      <div className="x:mx-auto x:w-full x:max-w-3xl x:overflow-hidden x:rounded-3xl x:border x:border-black/10 x:bg-linear-to-br x:from-white x:to-slate-50 x:p-8 x:shadow-lg x:shadow-black/5 x:dark:border-white/10 x:dark:from-neutral-900 x:dark:to-neutral-950">
        <div className="x:flex x:flex-wrap x:items-center x:gap-3">
          <span className="x:inline-flex x:rounded-full x:border x:border-current/10 x:bg-primary-600/10 x:px-3 x:py-1 x:text-xs x:font-semibold x:tracking-[0.18em] x:text-primary-700 x:uppercase x:dark:text-primary-300">
            {copy.badge}
          </span>
          <span className="x:text-sm x:text-gray-500 x:dark:text-gray-400">
            {withinDocs ? docsHomeHref : siteHomeHref}
          </span>
        </div>

        <h1 className="x:mt-5 x:text-4xl x:font-bold x:tracking-tight x:text-slate-900 x:dark:text-slate-100 x:md:text-5xl">
          {copy.title}
        </h1>

        <p className="x:mt-4 x:max-w-2xl x:text-base x:leading-7 x:text-gray-600 x:dark:text-gray-300">
          {copy.description}
        </p>

        <p className="x:mt-3 x:max-w-2xl x:text-sm x:leading-6 x:text-gray-500 x:dark:text-gray-400">
          {copy.hint}
        </p>

        <div className="x:mt-8 x:flex x:flex-wrap x:gap-3">
          <Link
            href={docsHomeHref}
            className="x:inline-flex x:items-center x:justify-center x:rounded-xl x:bg-slate-900 x:px-4 x:py-2.5 x:text-sm x:font-medium x:text-white x:no-underline x:transition x:hover:bg-slate-700 x:dark:bg-slate-100 x:dark:text-slate-900 x:dark:hover:bg-white"
          >
            {copy.primaryLabel}
          </Link>
          <Link
            href={siteHomeHref}
            className="x:inline-flex x:items-center x:justify-center x:rounded-xl x:border x:border-black/10 x:px-4 x:py-2.5 x:text-sm x:font-medium x:text-slate-700 x:no-underline x:transition x:hover:border-black/20 x:hover:bg-black/[.03] x:dark:border-white/10 x:dark:text-slate-200 x:dark:hover:bg-white/[.04]"
          >
            {copy.secondaryLabel}
          </Link>
        </div>

        <div className="x:mt-8 x:grid x:gap-3 x:md:grid-cols-2">
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
      </div>
    </section>
  )
}
