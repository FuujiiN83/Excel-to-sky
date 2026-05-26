import { useState } from 'react'
import { createSharedDashboard } from '../lib/shareApi'
import { saveLocalDashboard } from '../lib/localDb'
import { isSupabaseConfigured } from '../lib/supabase'
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
  const configured = isSupabaseConfigured()

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
      <button onClick={onBack} className="text-muted">← Volver</button>
      <h1 className="font-display text-3xl mt-4">Compartir dashboard</h1>

      {!configured && (
        <p className="mt-6 rounded border border-amber bg-amber-soft p-4 text-ink">
          Supabase no está configurado. Define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en <code>.env.local</code> para poder compartir.
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
            <button onClick={() => navigator.clipboard.writeText(link)} className="text-sky">Copiar</button>
            <button onClick={onOpenPublic} className="text-sky">Abrir vista pública</button>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-coral">{error}</p>}
    </div>
  )
}
