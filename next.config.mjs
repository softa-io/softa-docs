import nextra from 'nextra'
import remarkSourceRelativeDocLinks from './plugins/remark-source-relative-doc-links.mjs'

const contentDirBasePath = '/'

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
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
})
