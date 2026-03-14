import nextra from 'nextra'
import remarkSourceRelativeDocLinks from './plugins/remark-source-relative-doc-links.mjs'

const contentDirBasePath = '/'
const isProductionBuild = process.env.NODE_ENV === 'production'

const withNextra = nextra({
  latex: false,
  search: {
    codeblocks: false
  },
  defaultShowCopyCode: true,
  mdxOptions: {
    remarkPlugins: [
      // Resolve doc links relative to the source markdown file, not the rendered URL.
      [remarkSourceRelativeDocLinks, { contentDir: 'content', contentDirBasePath }]
    ]
  },
  // Using `content/` directory convention.
  contentDirBasePath
})

export default withNextra({
  reactStrictMode: true,
  // Keep static export for production builds, but let `next dev` use normal
  // routing so catch-all docs routes can fall through to 404 without the
  // export-mode "missing param in generateStaticParams" runtime error.
  output: isProductionBuild ? 'export' : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
})
