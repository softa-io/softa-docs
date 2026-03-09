import { cp, rm } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join(process.cwd(), 'public', '_pagefind')
const DEST = path.join(process.cwd(), 'out', '_pagefind')

async function main() {
  // Cloudflare Pages (and some other hosts) deploy from out/; ensure _pagefind
  // is present there. Output to public first, then sync to out.
  await rm(DEST, { recursive: true, force: true })
  await cp(SRC, DEST, { recursive: true })
  // eslint-disable-next-line no-console
  console.log(`sync-pagefind-to-out: ${SRC} -> ${DEST}`)
}

await main()
