import { cp, rm } from 'node:fs/promises'
import path from 'node:path'

const SRC = path.join(process.cwd(), 'out', '_pagefind')
const DEST = path.join(process.cwd(), 'public', '_pagefind')

async function main() {
  // Keep dev and prod behavior consistent: Next dev serves from /public,
  // while static export serves from /out.
  await rm(DEST, { recursive: true, force: true })
  await cp(SRC, DEST, { recursive: true })
  // eslint-disable-next-line no-console
  console.log(`sync-pagefind-to-public: ${SRC} -> ${DEST}`)
}

await main()

