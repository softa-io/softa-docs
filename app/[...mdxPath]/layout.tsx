import {
  Footer,
  LastUpdated,
  Layout,
  Navbar,
} from 'nextra-theme-docs'
import { Search } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { cache, type ReactNode } from 'react'
import { LocaleSwitchClient } from '../_components/LocaleSwitchClient'
import { NavbarActiveFix } from '../_components/NavbarActiveFix'
import { getDictionary, getDirection } from '../_dictionaries/get-dictionary'
import { DEFAULT_LOCALE, normalizeLocale } from '../_utils/locales'

type LayoutProps = Readonly<{
  children: ReactNode
  params: Promise<{
    mdxPath: string[]
  }>
}>

const getPageMapByRoute = cache(async (route: string) => getPageMap(route))

export default async function DocsLayout({ children, params }: LayoutProps) {
  const { mdxPath } = await params
  const locale = normalizeLocale(mdxPath?.[0]) ?? DEFAULT_LOCALE
  const isLocaleHome = mdxPath.length <= 1

  const direction = getDirection(locale)
  const dictionary = await getDictionary(locale)
  const pageMap = await getPageMapByRoute(`/${locale}`)

  // Avoid a visible "flash" where "Home" briefly appears active/bold on subroutes.
  const homeHref = `/${locale}/`
  const homeHrefNoSlash = `/${locale}`
  const navbarActiveFixStyle = isLocaleHome ? null : (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `
/* Nextra marks "/<locale>/" as aria-current on subroutes. */
.nextra-navbar nav a[href="${homeHref}"][aria-current="true"],
.nextra-navbar nav a[href="${homeHrefNoSlash}"][aria-current="true"] {
  font-weight: 400 !important;
  -webkit-font-smoothing: auto !important;
}
`
      }}
    />
  )

  const navbar = (
    <Navbar
      logo={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/icon.png" alt="Softa" width={28} height={28} />
          <strong>Softa</strong>
        </span>
      }
      logoLink={`/${locale}`}
      projectLink="https://github.com/softa-io/softa"
    >
      <NavbarActiveFix locale={locale} />
      <LocaleSwitchClient />
    </Navbar>
  )

  const footer = (
    <Footer className="flex-col items-center">
      <span>Copyright ©{new Date().getFullYear()} Softa.io</span>
    </Footer>
  )

  return (
    <div lang={locale} dir={direction} suppressHydrationWarning>
      {navbarActiveFixStyle}
      <Layout
        copyPageButton={false}
        darkMode={true}
        docsRepositoryBase="https://github.com/softa-io/softa-docs"
        editLink={dictionary.editPage}
        feedback={{ content: dictionary.feedback }}
        footer={footer}
        lastUpdated={
          <LastUpdated locale={locale}>{dictionary.lastUpdated}</LastUpdated>
        }
        navbar={navbar}
        pageMap={pageMap}
        search={
          <Search
            emptyResult={dictionary.searchEmptyResult}
            errorText={dictionary.searchError}
            loading={dictionary.searchLoading}
            placeholder={dictionary.searchPlaceholder}
          />
        }
        themeSwitch={{
          dark: dictionary.dark,
          light: dictionary.light,
          system: dictionary.system
        }}
        toc={{
          backToTop: dictionary.backToTop,
          title: dictionary.tocTitle
        }}
      >
        {children}
      </Layout>
    </div>
  )
}
