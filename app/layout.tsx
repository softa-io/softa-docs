import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import 'nextra-theme-docs/style.css'
import '../style.css'
import { HtmlLangSyncScript } from './_components/HtmlLangSyncScript'
import { PagefindLocaleSyncClient } from './_components/PagefindLocaleSyncClient'

export const metadata: Metadata = {
  title: {
    default: 'Softa',
    template: '%s - Softa'
  },
  description: 'Metadata-driven application development framework',
  metadataBase: new URL('https://softa.io'),
  openGraph: {
    siteName: 'Softa',
    type: 'website',
    images: ['/logo.png']
  },
  twitter: {
    card: 'summary_large_image'
  },
  other: {
    'msapplication-TileColor': '#fff',
    'theme-color': '#fff'
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  // Root layout is required by Next.js and is the only place
  // we can import global CSS when using the App Router.
  return (
    <html lang="en-US" dir="ltr" suppressHydrationWarning>
      <body>
        <HtmlLangSyncScript />
        <PagefindLocaleSyncClient />
        {children}
      </body>
    </html>
  )
}
