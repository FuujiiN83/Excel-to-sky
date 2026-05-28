import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { createSharedDashboard } from '../lib/shareApi'
import { saveLocalDashboard } from '../lib/localDb'
import { isSupabaseConfigured } from '../lib/supabase'
import { pushToast } from '../lib/toast'
import { detectPII, describeHit, redactDataset } from '../lib/pii'
import type { Dataset } from '../types/dataset'

interface SharePageProps {
  dataset: Dataset
  onBack: () => void
  onOpenPublic: () => void
}

export function SharePage({ dataset, onBack, onOpenPublic }: SharePageProps): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [redact, setRedact] = useState(false)
  const configured = isSupabaseConfigured()

  // Scan once per dataset identity (#194). detectPII walks every text/category
  // column so we don't want to redo it on every render.
  const piiReport = useMemo(() => detectPII(dataset), [dataset])
  const piiLabel = (key: string): string => dataset.columns.find((c) => c.key === key)?.label ?? key

  // Regenerate the QR every time the link changes (#164). Uses the local
  // qrcode lib so no API call is made.
  useEffect(() => {
    if (!link) {
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    void QRCode.toDataURL(link, {
      margin: 1,
      width: 240,
      color: { dark: '#F5F5F7', light: '#0E1015' },
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [link])

  function downloadQr(): void {
    if (!qrDataUrl || !link) return
    const slug = link.split('/').pop() ?? 'qr'
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `excel-to-sky-${slug}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    pushToast('QR descargado.', 'success', 3000)
  }

  async function handleShare(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      // Auto-redact mode (#195): swap PII-flagged cells for opaque tokens
      // before publishing. The local dashboard is untouched; only the copy
      // that lands on Supabase is sanitised.
      const payload = redact && piiReport.hits.length > 0 ? redactDataset(dataset) : dataset
      const { slug, deleteToken } = await createSharedDashboard(payload)
      await saveLocalDashboard({ slug, name: dataset.label, deleteToken, owner: 'created' })
      setLink(`${window.location.origin}/d/${slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <button onClick={onBack} className="text-muted">
        ← Volver
      </button>
      <h1 className="font-display text-3xl mt-4">Compartir dashboard</h1>

      {!configured && (
        <p className="mt-6 rounded border border-amber bg-amber-soft p-4 text-ink">
          Supabase no está configurado. Define <code>VITE_SUPABASE_URL</code> y{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> en <code>.env.local</code> para poder compartir.
        </p>
      )}

      {configured && !link && piiReport.hits.length > 0 && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: '1px solid var(--coral, #F87171)',
            background: 'rgba(248,113,113,0.06)',
          }}
          role="alert"
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--coral, #F87171)',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            Detectamos posible información personal
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55, marginTop: 8 }}>
            Antes de publicar este dashboard, revisa las columnas que parecen contener PII. Una vez
            en el link público, cualquiera que lo abra verá estos valores.
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '12px 0 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {piiReport.hits.map((hit) => (
              <li key={hit.column} style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                · {describeHit(hit, piiLabel(hit.column))}{' '}
                <span
                  className="font-mono"
                  style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 6 }}
                >
                  → ejemplo redactado: {hit.preview[0] ?? '—'}
                </span>
              </li>
            ))}
          </ul>
          <label
            style={{
              marginTop: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={redact}
              onChange={(e) => setRedact(e.target.checked)}
              style={{ accentColor: 'var(--sky)' }}
            />
            Redactar automáticamente antes de publicar (sustituir por tokens opacos)
          </label>
        </div>
      )}

      {configured && !link && (
        <button
          onClick={handleShare}
          disabled={busy}
          className="mt-6 rounded bg-ink text-bg px-6 py-3 disabled:opacity-50"
        >
          {busy
            ? 'Generando link…'
            : redact && piiReport.hits.length > 0
              ? 'Crear link público (redactado)'
              : 'Crear link público'}
        </button>
      )}

      {link && (
        <div className="mt-6 rounded border border-border p-4">
          <p className="text-muted text-sm">Tu link:</p>
          <code className="block break-all font-mono text-ink mt-2">{link}</code>
          <div className="flex gap-3 mt-3">
            <button onClick={() => navigator.clipboard.writeText(link)} className="text-sky">
              Copiar
            </button>
            <button onClick={onOpenPublic} className="text-sky">
              Abrir vista pública
            </button>
          </div>

          <EmbedSnippet link={link} />

          {qrDataUrl && (
            <div
              style={{
                marginTop: 24,
                paddingTop: 24,
                borderTop: '1px dashed var(--border)',
                display: 'flex',
                gap: 20,
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <img
                src={qrDataUrl}
                alt={`Código QR del link ${link}`}
                width={160}
                height={160}
                style={{ border: '1px solid var(--border-strong)' }}
              />
              <div style={{ flex: 1, minWidth: 200 }}>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    fontFamily: 'var(--font-mono, monospace)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    margin: 0,
                  }}
                >
                  Código QR
                </p>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 8 }}>
                  Imprime o pega este código en presentaciones para que cualquiera abra el dashboard
                  escaneándolo con el móvil.
                </p>
                <button
                  type="button"
                  onClick={downloadQr}
                  style={{
                    marginTop: 10,
                    background: 'transparent',
                    color: 'var(--sky)',
                    border: '1px solid var(--sky)',
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Descargar QR PNG
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-coral">{error}</p>}
    </div>
  )
}

interface EmbedSnippetProps {
  link: string
}

function EmbedSnippet({ link }: EmbedSnippetProps): JSX.Element {
  const embedUrl = link.replace('/d/', '/embed/')
  const html = `<iframe src="${embedUrl}" width="100%" height="640" style="border:0" loading="lazy"></iframe>`
  return (
    <div
      style={{
        marginTop: 24,
        paddingTop: 24,
        borderTop: '1px dashed var(--border)',
      }}
    >
      <p
        style={{
          fontSize: 12,
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono, monospace)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin: 0,
        }}
      >
        Embebido en otra web
      </p>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 8 }}>
        La ruta <code>/embed/&lt;slug&gt;</code> renderiza el dashboard sin barra superior ni
        bandejas flotantes. Pega este snippet en tu HTML.
      </p>
      <code
        className="font-mono"
        style={{
          display: 'block',
          padding: '10px 12px',
          background: 'var(--surface-2, rgba(255,255,255,0.04))',
          border: '1px solid var(--border)',
          fontSize: 11,
          color: 'var(--ink-2)',
          marginTop: 8,
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
        }}
      >
        {html}
      </code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(html)
          pushToast('Snippet copiado.', 'success', 3000)
        }}
        style={{
          marginTop: 10,
          background: 'transparent',
          color: 'var(--sky)',
          border: '1px solid var(--sky)',
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Copiar snippet
      </button>
    </div>
  )
}
