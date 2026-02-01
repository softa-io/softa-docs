import nextra from 'nextra'

const withNextra = nextra({
  latex: false,
  search: {
    codeblocks: false
  },
  defaultShowCopyCode: true,
  // Using `content/` directory convention.
  contentDirBasePath: '/'
})

export default withNextra({
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
})
