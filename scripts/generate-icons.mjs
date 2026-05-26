// Generates icon-192.png and icon-512.png from public/icons/favicon.svg.
// Run: node scripts/generate-icons.mjs
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SVG = resolve(ROOT, 'public/icons/favicon.svg')

async function main() {
  const svg = await readFile(SVG)
  for (const size of [192, 512]) {
    const out = resolve(ROOT, `public/icons/icon-${size}.png`)
    const png = await sharp(svg, { density: 384 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    await writeFile(out, png)
    console.log(`wrote ${out} (${png.length} bytes)`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
