// src/dev/InsightsWorkbench.tsx
import { useEffect, useState } from 'react'
import { SAMPLE_DATASETS } from '../samples'
import { analyzeDataset, type InsightReport } from '../lib/insights'
import { insightsToMarkdown } from '../lib/insights/markdown'
import { pushToast } from '../lib/toast'
import { ExplainPanel } from '../components/ExplainPanel'
import type { Dataset } from '../types/dataset'

export function InsightsWorkbench(): JSX.Element {
  const sampleKeys = Object.keys(SAMPLE_DATASETS)
  const [selected, setSelected] = useState<string>(sampleKeys[0])
  const [report, setReport] = useState<InsightReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const ds: Dataset | undefined = SAMPLE_DATASETS[selected]
    if (!ds) return
    setBusy(true)
    setError(null)
    setReport(null)
    analyzeDataset(ds)
      .then(setReport)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false))
  }, [selected])

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto', color: 'var(--ink)' }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        dev · insights workbench
      </div>
      <h1
        className="font-display"
        style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.03em', margin: '8px 0 24px' }}
      >
        Inspector de InsightReport
      </h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {sampleKeys.map((k) => (
          <button
            key={k}
            onClick={() => setSelected(k)}
            style={{
              background: k === selected ? 'var(--ink)' : 'transparent',
              color: k === selected ? 'var(--bg)' : 'var(--ink-2)',
              border: '1px solid var(--border)',
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {SAMPLE_DATASETS[k].label}
          </button>
        ))}
      </div>

      {busy && <p style={{ color: 'var(--muted)' }}>Analizando…</p>}
      {error && <p style={{ color: 'var(--coral)' }}>{error}</p>}
      {report && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => {
              const md = insightsToMarkdown(report, SAMPLE_DATASETS[selected].label)
              void navigator.clipboard.writeText(md)
              pushToast('Markdown del informe copiado al portapapeles.', 'success', 3000)
            }}
            style={{
              background: 'var(--ink)',
              color: 'var(--bg)',
              border: 'none',
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Copiar como Markdown
          </button>
          <button
            type="button"
            onClick={() => {
              const md = insightsToMarkdown(report, SAMPLE_DATASETS[selected].label)
              const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `insights-${SAMPLE_DATASETS[selected].label}.md`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              setTimeout(() => URL.revokeObjectURL(url), 1000)
              pushToast('Informe descargado como .md', 'success', 3000)
            }}
            style={{
              background: 'transparent',
              color: 'var(--ink-2)',
              border: '1px solid var(--border-strong)',
              padding: '8px 14px',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Descargar .md
          </button>
        </div>
      )}
      {report && (
        <>
          <Section title="Summary">
            <pre style={preStyle}>{JSON.stringify(report.summary, null, 2)}</pre>
          </Section>
          <Section title={`Top findings (${report.findings.length})`}>
            {report.findings.map((f) => (
              <div
                key={f.id}
                style={{
                  padding: 16,
                  marginBottom: 12,
                  boxShadow: '0 0 0 1px var(--border)',
                  background: 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong style={{ fontSize: 14 }}>{f.title}</strong>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {f.type} · {f.severity} · {f.score.toFixed(3)}
                  </span>
                </div>
                <div style={{ color: 'var(--ink-2)', marginTop: 6, fontSize: 13 }}>{f.body}</div>
                {f.suggestion && (
                  <div style={{ color: 'var(--sky)', marginTop: 8, fontSize: 12 }}>
                    → {f.suggestion}
                  </div>
                )}
                <ExplainPanel finding={f} />
              </div>
            ))}
          </Section>
          <Section title="Runtime">
            <code style={{ fontSize: 12, color: 'var(--muted)' }}>
              {report.runtimeMs} ms{report.degraded ? ' (degraded)' : ''}
            </code>
          </Section>
        </>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 12,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

const preStyle: React.CSSProperties = {
  background: 'var(--surface)',
  padding: 16,
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  color: 'var(--ink-2)',
  overflow: 'auto',
  margin: 0,
  boxShadow: '0 0 0 1px var(--border)',
}
