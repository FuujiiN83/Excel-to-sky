import { useState } from 'react'
import type { Finding } from '../lib/insights/types'

/**
 * Collapsible "show your work" panel attached to a Finding (#108). When the
 * heuristic provided an `explain` block we render method + steps + an
 * optional reference link. Otherwise we synthesise a generic breakdown from
 * the FindingData kind so every finding can still answer "how was this
 * computed?" — useful for the dev workbench and for future surfaces where
 * the user wants to audit the engine before trusting a result.
 */

interface ExplainPanelProps {
  finding: Finding
  defaultOpen?: boolean
}

export function ExplainPanel({ finding, defaultOpen = false }: ExplainPanelProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  const explain = finding.explain ?? synthesise(finding)
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      style={{
        marginTop: 12,
        border: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.018)',
        padding: '10px 14px',
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono, monospace)',
          listStyle: 'none',
          outline: 'none',
        }}
      >
        Cómo se calcula ({explain.method})
      </summary>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {explain.steps.map((s) => (
          <div
            key={s.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr',
              gap: 12,
              fontSize: 12,
              alignItems: 'baseline',
            }}
          >
            <span style={{ color: 'var(--muted)' }}>{s.label}</span>
            <span
              className="font-mono"
              style={{ color: 'var(--ink-2)', fontFamily: 'var(--font-mono, monospace)' }}
            >
              {s.value}
            </span>
          </div>
        ))}
        {explain.reference && (
          <a
            href={explain.reference}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11,
              color: 'var(--sky)',
              marginTop: 8,
              textDecoration: 'underline',
            }}
          >
            Referencia →
          </a>
        )}
      </div>
    </details>
  )
}

/**
 * Synthesise a generic explain block from a Finding when no heuristic-specific
 * one was attached. Reads only public Finding fields so it works for any
 * finding kind without coupling to data internals.
 */
function synthesise(finding: Finding): NonNullable<Finding['explain']> {
  const steps: Array<{ label: string; value: string }> = [
    { label: 'Tipo', value: finding.type },
    { label: 'Severidad', value: finding.severity },
    { label: 'Score', value: finding.score.toFixed(3) },
    { label: 'Columnas', value: finding.columns.join(', ') || '—' },
  ]
  if (finding.recordRefs && finding.recordRefs.length > 0) {
    steps.push({ label: 'Filas afectadas', value: String(finding.recordRefs.length) })
  }
  // Surface every primitive field on FindingData for transparency.
  for (const [k, v] of Object.entries(finding.data)) {
    if (k === 'kind') continue
    if (typeof v === 'number') steps.push({ label: k, value: v.toFixed(3) })
    else if (typeof v === 'string') steps.push({ label: k, value: v })
    else if (typeof v === 'boolean') steps.push({ label: k, value: v ? 'sí' : 'no' })
  }
  return {
    method: 'detalle agregado',
    steps,
  }
}
