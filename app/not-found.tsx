import { NotFoundView } from './_components/NotFoundView'
import { SitePageShell } from './_components/SitePageShell'

export default function GlobalNotFoundPage() {
  return (
    <SitePageShell contentClassName="x:flex x:min-h-[calc(100vh-var(--nextra-navbar-height))] x:items-center x:justify-center x:px-6 x:py-16">
      <NotFoundView withinSiteShell />
    </SitePageShell>
  )
}
