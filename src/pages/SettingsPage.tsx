import { LegalLayout } from './LegalLayout'
import { useSettings } from '../lib/SettingsContext'

interface SettingsPageProps {
  onNav: (route: string) => void
}

export function SettingsPage({ onNav }: SettingsPageProps): JSX.Element {
  const { settings, ready } = useSettings()

  return (
    <LegalLayout title="Configuración" onNav={onNav}>
      <p>
        Tus preferencias se guardan localmente en este navegador (IndexedDB). Nada de esto se envía
        al servidor. Si vacías el almacenamiento del navegador o usas otro dispositivo, se
        restablecerán los valores por defecto.
      </p>

      {!ready ? (
        <p style={{ color: 'var(--muted)' }}>Cargando…</p>
      ) : (
        <pre
          style={{
            marginTop: 16,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: 16,
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            color: 'var(--ink-2)',
          }}
        >
          {JSON.stringify(settings, null, 2)}
        </pre>
      )}
      <p style={{ marginTop: 24, color: 'var(--muted)', fontSize: 13 }}>
        Los controles individuales aparecerán a medida que se vayan habilitando cada preferencia.
      </p>
    </LegalLayout>
  )
}
