#!/usr/bin/env node
/**
 * Generate CHANGELOG.md from the git log (#233). Walks `git log --oneline`
 * since the most recent tag (or all history when there is none), groups
 * commits by their conventional-commit type, and writes a Markdown file at
 * the repo root.
 *
 * Run via `npm run changelog`. Designed for zero dependencies — uses only
 * Node built-ins so the script doesn't add to the install graph.
 */
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const TYPES = {
  feat: 'New features',
  fix: 'Bug fixes',
  perf: 'Performance',
  refactor: 'Refactoring',
  docs: 'Documentation',
  build: 'Build',
  ci: 'CI / DevEx',
  test: 'Tests',
  chore: 'Chore',
  a11y: 'Accessibility',
}

function git(command) {
  return execSync(`git ${command}`, { encoding: 'utf-8' }).trim()
}

function previousTag() {
  try {
    return git('describe --tags --abbrev=0')
  } catch {
    return null
  }
}

function log(range) {
  const fmt = '%H%x09%s%x09%aI'
  const cmd = range ? `log ${range}..HEAD --format=${fmt}` : `log --format=${fmt}`
  return git(cmd)
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, subject, date] = line.split('\t')
      return { hash, subject, date }
    })
}

function classify(subject) {
  const match = /^([a-z]+)(?:\(([^)]+)\))?(?:!)?: (.+)$/.exec(subject)
  if (!match) return { type: 'chore', scope: null, message: subject }
  const [, type, scope, message] = match
  return { type, scope, message }
}

const tag = previousTag()
const commits = log(tag)
if (commits.length === 0) {
  console.error('No commits to include in changelog.')
  process.exit(0)
}

const grouped = new Map()
for (const c of commits) {
  const parsed = classify(c.subject)
  const heading = TYPES[parsed.type] ?? 'Other'
  if (!grouped.has(heading)) grouped.set(heading, [])
  grouped.get(heading).push({ ...c, ...parsed })
}

const today = new Date().toISOString().slice(0, 10)
const lines = []
lines.push(`# Changelog`)
lines.push('')
lines.push(`## ${tag ? `Unreleased (since ${tag})` : 'Initial'} — ${today}`)
lines.push('')
for (const [heading, items] of grouped) {
  lines.push(`### ${heading}`)
  for (const item of items) {
    const short = item.hash.slice(0, 7)
    const scopePrefix = item.scope ? `**${item.scope}**: ` : ''
    lines.push(`- ${scopePrefix}${item.message} (\`${short}\`)`)
  }
  lines.push('')
}

writeFileSync('CHANGELOG.md', lines.join('\n'))
console.log(`Wrote ${commits.length} commits to CHANGELOG.md.`)
