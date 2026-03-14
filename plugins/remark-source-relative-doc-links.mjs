import fs from 'node:fs'
import path from 'node:path'

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx'])

export default function remarkSourceRelativeDocLinks(options = {}) {
  const contentDir = path.resolve(process.cwd(), options.contentDir ?? 'content')
  const contentDirBasePath = normalizeBasePath(options.contentDirBasePath ?? '/')

  return function transform(tree, file) {
    const sourcePath = typeof file?.path === 'string' ? file.path : ''
    if (!sourcePath) return

    const relativeSourcePath = path.relative(contentDir, sourcePath)
    if (
      !relativeSourcePath ||
      relativeSourcePath.startsWith('..') ||
      path.isAbsolute(relativeSourcePath)
    ) {
      return
    }

    const sourceDir = path.dirname(sourcePath)

    visit(tree, (node) => {
      if (!isLinkLike(node) || typeof node.url !== 'string') return

      const rewrittenUrl = rewriteDocUrl(node.url, {
        contentDir,
        contentDirBasePath,
        sourceDir
      })

      if (rewrittenUrl) {
        node.url = rewrittenUrl
      }
    })
  }
}

function visit(node, visitor) {
  if (!node || typeof node !== 'object') return
  visitor(node)
  if (!Array.isArray(node.children)) return
  for (const child of node.children) {
    visit(child, visitor)
  }
}

function isLinkLike(node) {
  return node?.type === 'link' || node?.type === 'definition'
}

function rewriteDocUrl(rawUrl, context) {
  if (!isRelativeUrl(rawUrl)) return null

  const { pathname, search, hash } = splitUrl(rawUrl)
  if (!pathname) return null

  const targetFilePath = resolveMarkdownTarget(context.sourceDir, pathname)
  if (!targetFilePath) return null

  const routePath = contentFilePathToRoute(
    targetFilePath,
    context.contentDir,
    context.contentDirBasePath
  )
  if (!routePath) return null

  return `${routePath}${search}${hash}`
}

function isRelativeUrl(url) {
  if (!url) return false
  if (url.startsWith('#') || url.startsWith('/') || url.startsWith('?') || url.startsWith('//')) {
    return false
  }
  return !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(url)
}

function splitUrl(rawUrl) {
  const match = rawUrl.match(/^(?<pathname>[^?#]*)(?<search>\?[^#]*)?(?<hash>#.*)?$/)
  return {
    pathname: match?.groups?.pathname ?? rawUrl,
    search: match?.groups?.search ?? '',
    hash: match?.groups?.hash ?? ''
  }
}

function resolveMarkdownTarget(sourceDir, pathname) {
  const absolutePath = path.resolve(sourceDir, pathname)
  const ext = path.extname(absolutePath).toLowerCase()
  const candidates = []

  if (MARKDOWN_EXTENSIONS.has(ext)) {
    candidates.push(absolutePath)
  } else if (!ext) {
    candidates.push(
      `${absolutePath}.md`,
      `${absolutePath}.mdx`,
      path.join(absolutePath, 'index.md'),
      path.join(absolutePath, 'index.mdx')
    )
  } else {
    return null
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.normalize(candidate)
    }
  }

  return null
}

function contentFilePathToRoute(filePath, contentDir, contentDirBasePath) {
  const relativeFilePath = path.relative(contentDir, filePath)
  if (
    !relativeFilePath ||
    relativeFilePath.startsWith('..') ||
    path.isAbsolute(relativeFilePath)
  ) {
    return null
  }

  const routePath = toPosixPath(relativeFilePath)
    .replace(/\.(md|mdx)$/i, '')
    .replace(/\/index$/i, '')

  if (!routePath) {
    return contentDirBasePath || '/'
  }

  return joinRoute(contentDirBasePath, routePath)
}

function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') return ''
  return `/${String(basePath).replace(/^\/+|\/+$/g, '')}`
}

function joinRoute(basePath, routePath) {
  if (!basePath) return `/${routePath}`
  return `${basePath}/${routePath}`.replace(/\/+/g, '/')
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/')
}
