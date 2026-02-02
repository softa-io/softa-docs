import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { importPage } from 'nextra/pages'
import { useMDXComponents as getMDXComponents } from '../../mdx-components'
import { normalizeLocale } from '../_utils/locales'
import { getAllMdxStaticParams } from '../_utils/static-paths'

export const dynamicParams = false
export async function generateStaticParams() {
  return await getAllMdxStaticParams()
}

type PageProps = Readonly<{
  params: Promise<{
    mdxPath: string[]
  }>
}>

export async function generateMetadata(props: PageProps) {
  const { mdxPath } = await props.params

  // Unprefixed path: it will redirect client-side.
  if (!normalizeLocale(mdxPath?.[0])) return {}

  // Ignore browser/OS well-known probes (e.g. Chrome devtools).
  if (mdxPath?.[0] === '.well-known') return {}

  try {
    const { metadata } = await importPage(mdxPath)
    return metadata as Metadata
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err && 'code' in err ? (err as any).code : undefined
    if (code === 'MODULE_NOT_FOUND') return {}
    throw err
  }
}

const Wrapper = getMDXComponents().wrapper

export default async function Page(props: PageProps) {
  const { mdxPath } = await props.params
  // All pages under this catch-all route must be locale-prefixed.
  // Locale detection + redirect is handled only on the site root (`/`).
  if (!normalizeLocale(mdxPath?.[0])) notFound()

  // Ignore browser/OS well-known probes (e.g. Chrome devtools).
  if (mdxPath?.[0] === '.well-known') notFound()

  let imported: Awaited<ReturnType<typeof importPage>>
  try {
    imported = await importPage(mdxPath)
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err && 'code' in err ? (err as any).code : undefined
    if (code === 'MODULE_NOT_FOUND') notFound()
    throw err
  }

  const { default: MDXContent, toc, metadata, sourceCode } = imported
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={{ mdxPath }} />
    </Wrapper>
  )
}
