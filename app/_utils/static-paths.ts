import 'server-only'

import { readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './locales'

function isMarkdownFile(name: string) {
  return name.endsWith('.md') || name.endsWith('.mdx')
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const out: string[] = []

  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue
    const full = join(dir, ent.name)
    if (ent.isDirectory()) {
      out.push(...(await walk(full)))
      continue
    }
    if (!ent.isFile()) continue
    if (!isMarkdownFile(ent.name)) continue
    out.push(full)
  }

  return out
}

function toSegments(contentRoot: string, filePath: string): string[] {
  const rel = relative(contentRoot, filePath)
  const parts = rel.split(sep)
  const file = parts[parts.length - 1]!
  const noExt = file.replace(/\.(md|mdx)$/, '')

  // Root index => []
  if (parts.length === 1 && noExt === 'index') return []

  // Folder index => folder path segments
  if (noExt === 'index') return parts.slice(0, -1)

  // Normal doc => folder segments + filename
  return [...parts.slice(0, -1), noExt]
}

export async function getAllMdxStaticParams(): Promise<Array<{ mdxPath: string[] }>> {
  const params: Array<{ mdxPath: string[] }> = []

  // 1) Locale-prefixed pages (canonical)
  for (const locale of SUPPORTED_LOCALES) {
    const contentRoot = join(process.cwd(), 'content', locale)
    const files = await walk(contentRoot)
    for (const file of files) {
      const segments = toSegments(contentRoot, file)
      // `/en-US` => `content/en-US/index.mdx` (segments = [])
      params.push({ mdxPath: [locale, ...segments] })
    }
  }

  // 2) Non-prefixed URLs that should redirect to `/<locale><path>`
  // (generated based on the default locale’s content tree).
  {
    const contentRoot = join(process.cwd(), 'content', DEFAULT_LOCALE)
    const files = await walk(contentRoot)
    const set = new Set<string>()
    for (const file of files) {
      const segments = toSegments(contentRoot, file)
      const key = segments.join('/')
      if (key) set.add(key)
    }
    for (const key of Array.from(set)) {
      params.push({ mdxPath: key.split('/') })
    }
  }

  return params
}
