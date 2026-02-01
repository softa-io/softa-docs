import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SITE_ROOT = path.join(process.cwd(), '.next', 'server', 'app')

async function walk(dir) {
  /** @type {string[]} */
  const out = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const ent of entries) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) out.push(...(await walk(p)))
    else out.push(p)
  }
  return out
}

function desiredLangForRelPath(rel) {
  // We only care about the locale-prefixed static HTML pages.
  if (rel === 'en-US.html' || rel.startsWith(`en-US${path.sep}`)) return 'en-US'
  if (rel === 'zh-CN.html' || rel.startsWith(`zh-CN${path.sep}`)) return 'zh-CN'
  return null
}

function setHtmlLang(html, desiredLang) {
  // Prefer replacing an existing lang attribute.
  if (/<html\b[^>]*\blang\s*=/.test(html)) {
    return html.replace(
      /(<html\b[^>]*\blang\s*=\s*")[^"]*(")/i,
      `$1${desiredLang}$2`
    )
  }
  // Otherwise, inject lang into the <html ...> tag.
  return html.replace(/<html\b/i, `<html lang="${desiredLang}"`)
}

async function main() {
  const files = (await walk(SITE_ROOT)).filter((p) => p.endsWith('.html'))
  let updated = 0

  for (const abs of files) {
    const rel = path.relative(SITE_ROOT, abs)
    const lang = desiredLangForRelPath(rel)
    if (!lang) continue

    const before = await readFile(abs, 'utf8')
    const after = setHtmlLang(before, lang)
    if (after !== before) {
      await writeFile(abs, after, 'utf8')
      updated++
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `patch-pagefind-html-lang: updated ${updated} file(s) under ${SITE_ROOT}`
  )
}

await main()

