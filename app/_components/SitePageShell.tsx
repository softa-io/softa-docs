import type { ReactNode } from 'react'
import { SiteHeaderClient } from './SiteHeaderClient'

type SitePageShellProps = Readonly<{
  children: ReactNode
  contentClassName?: string
}>

export function SitePageShell({
  children,
  contentClassName = 'x:mx-auto x:max-w-(--nextra-content-width) x:px-6 x:py-16'
}: SitePageShellProps) {
  return (
    <>
      <SiteHeaderClient />
      <main className={contentClassName}>{children}</main>
    </>
  )
}
