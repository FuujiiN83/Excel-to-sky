import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { createSharedDashboard } from '../lib/shareApi'
import { saveLocalDashboard } from '../lib/localDb'
import { isSupabaseConfigured } from '../lib/supabase'
import { pushToast } from '../lib/toast'
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
  const configured = isSupabaseConfigured()

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
      const { slug, deleteToken } = await createSharedDashboard(dataset)
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

      {configured && !link && (
        <button
          onClick={handleShare}
          disabled={busy}
          className="mt-6 rounded bg-ink text-bg px-6 py-3 disabled:opacity-50"
        >
          {busy ? 'Generando link…' : 'Crear link público'}
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
