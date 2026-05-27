import type { InsightReport, Finding } from './types'

const SEVERITY_ORDER = ['critical', 'important', 'note', 'info'] as const
const SEVERITY_LABEL: Record<Finding['severity'], string> = {
  critical: '🔴 Crítico',
  important: '🟠 Importante',
  note: '🟡 Nota',
  info: '⚪ Info',
}

/**
 * Render an InsightReport as Markdown suitable for pasting into Notion, a
 * Google Doc or a README. Sections are stable so re-running on the same
 * dataset produces the same output (the runner ranks deterministically).
 */
export function insightsToMarkdown(report: InsightReport, datasetLabel: string): string {
  const lines: string[] = []
  const now = new Date().toISOString().slice(0, 10)

  lines.push(`# Insights — ${datasetLabel}`)
  lines.push(`_${now} · ${report.findings.length} hallazgos · runtime ${report.runtimeMs} ms_`)
  lines.push('')

  // Summary block
  const s = report.summary
  lines.push('## Resumen')
  lines.push('')
  lines.push(`- **Filas**: ${s.rowCount}`)
  lines.push(`- **Columnas**: ${s.columnCount}`)
  lines.push(`- **Calidad**: ${Math.round(s.qualityScore * 100)}%`)
  if (s.temporalRange) {
    lines.push(
      `- **Rango temporal**: ${s.temporalRange.from} → ${s.temporalRange.to} (${s.temporalRange.days} días)`,
    )
  }
  lines.push(`- **Filas duplicadas**: ${s.duplicateRowCount}`)
  const byType = Object.entries(s.byType)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${k}`)
    .join(' · ')
  if (byType) lines.push(`- **Tipos de columna**: ${byType}`)
  lines.push('')

  if (report.findings.length === 0) {
    lines.push('## Hallazgos')
    lines.push('')
    lines.push('_Sin hallazgos relevantes para este dataset._')
    return lines.join('\n')
  }

  // Group findings by severity, render in order.
  lines.push('## Hallazgos')
  lines.push('')
  for (const sev of SEVERITY_ORDER) {
    const group = report.findings.filter((f) => f.severity === sev)
    if (group.length === 0) continue
    lines.push(`### ${SEVERITY_LABEL[sev]} (${group.length})`)
    lines.push('')
    for (const f of group) {
      lines.push(`- **${f.title}**`)
      lines.push(`  - ${f.body}`)
      if (f.suggestion) lines.push(`  - _Sugerencia_: ${f.suggestion}`)
      if (f.columns.length > 0) {
        const cols = f.columns.map((c) => `\`${c}\``).join(', ')
        lines.push(`  - Columnas: ${cols}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}
