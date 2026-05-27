#!/usr/bin/env node
/**
 * Bundle-size budget check (#181).
 *
 * Reads every JS chunk under dist/assets/, gzips it in-memory, and fails
 * with a non-zero exit code if the MAIN entry exceeds the configured budget.
 * Lazy-loaded route chunks have their own (looser) budget — they're paid for
 * only when visited.
 *
 * Usage:
 *   node scripts/check-bundle-size.mjs
 *   node scripts/check-bundle-size.mjs --max-main=500 --max-route=120
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=')
      return [k, Number(v)]
    }),
)

// All sizes in KB after gzip.
const MAX_MAIN_KB = args['max-main'] ?? 500
const MAX_ROUTE_KB = args['max-route'] ?? 120

const ASSETS = join('dist', 'assets')

function isJs(file) {
  return file.endsWith('.js')
}

function gzipKB(path) {
  const buf = readFileSync(path)
  return gzipSync(buf).length / 1024
}

let files
try {
  files = readdirSync(ASSETS)
} catch (e) {
  console.error(`No se encuentra ${ASSETS}. ¿Has corrido "npm run build"?`)
  console.error(e.message)
  process.exit(2)
}

const jsFiles = files.filter(isJs).map((f) => ({
  name: f,
  path: join(ASSETS, f),
  size: statSync(join(ASSETS, f)).size,
}))

if (jsFiles.length === 0) {
  console.error(`No se encontraron archivos .js en ${ASSETS}.`)
  process.exit(2)
}

// Main entry — Vite names it index-*.js. Everything else is a route/vendor chunk.
const main = jsFiles.find((f) => /^index-/.test(f.name))
const others = jsFiles.filter((f) => f !== main)

if (!main) {
  console.error(`No se identificó el bundle principal (index-*.js) en ${ASSETS}.`)
  process.exit(2)
}

const mainKB = gzipKB(main.path)
const breaches = []

console.log(`Bundle size budget (gzip):`)
console.log(`  Main:  ${mainKB.toFixed(1)} KB / ${MAX_MAIN_KB} KB`)
if (mainKB > MAX_MAIN_KB) {
  breaches.push(`Main bundle ${main.name} = ${mainKB.toFixed(1)} KB > ${MAX_MAIN_KB} KB`)
}

let oversizedRoute = false
for (const f of others) {
  const kb = gzipKB(f.path)
  const tag = kb > MAX_ROUTE_KB ? ' ⚠' : ''
  console.log(`  Route: ${f.name.padEnd(40)} ${kb.toFixed(1).padStart(6)} KB${tag}`)
  if (kb > MAX_ROUTE_KB) {
    oversizedRoute = true
    breaches.push(`Route chunk ${f.name} = ${kb.toFixed(1)} KB > ${MAX_ROUTE_KB} KB`)
  }
}

if (breaches.length > 0) {
  console.error('\nBundle size budget exceeded:')
  for (const b of breaches) console.error(`  - ${b}`)
  console.error(
    '\nIf this is intentional, bump the budget via --max-main / --max-route or in package.json scripts.',
  )
  process.exit(1)
}

console.log(`\n✓ Within budget (max main ${MAX_MAIN_KB} KB, max route ${MAX_ROUTE_KB} KB).`)
if (oversizedRoute) {
  // Unreachable today — kept as a defensive print since the breach loop above
  // exits non-zero before this line. Future tweak might re-classify chunks.
  console.log('(some route chunks are large — consider splitting further)')
}
