import type { ReactNode } from 'react'
import { LegalLayout } from './LegalLayout'
import { useSettings } from '../lib/SettingsContext'
import type { Theme } from '../lib/settings'

interface SettingsPageProps {
  onNav: (route: string) => void
}

export function SettingsPage({ onNav }: SettingsPageProps): JSX.Element {
  const { settings, ready, update } = useSettings()

  return (
    <LegalLayout title="Configuración" onNav={onNav}>
      <p>
        Tus preferencias se guardan localmente en este navegador (IndexedDB). Nada de esto se envía
        al servidor. Si vacías el almacenamiento del navegador o usas otro dispositivo, se
        restablecerán los valores por defecto.
      </p>

      {!ready ? (
        <p style={{ color: 'var(--muted)', marginTop: 24 }}>Cargando…</p>
      ) : (
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 28 }}>
          <SettingsRow
            label="Tema"
            description="Paleta visual de la aplicación. El alto contraste también se activa automáticamente si tu sistema operativo lo pide."
          >
            <RadioGroup<Theme>
              value={settings.theme}
              onChange={(v) => update('theme', v)}
              options={[
                { value: 'dark', label: 'Oscuro', hint: 'Por defecto' },
                { value: 'light', label: 'Claro' },
                { value: 'high-contrast', label: 'Alto contraste', hint: 'Negro/blanco' },
              ]}
              name="theme"
            />
          </SettingsRow>
        </div>
      )}
    </LegalLayout>
  )
}

interface SettingsRowProps {
  label: string
  description?: string
  children: ReactNode
}

function SettingsRow({ label, description, children }: SettingsRowProps): JSX.Element {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          paddingBottom: 4,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          className="font-display"
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>{description}</div>
        )}
      </div>
      <div>{children}</div>
    </section>
  )
}

interface RadioGroupOption<T extends string> {
  value: T
  label: string
  hint?: string
}

interface RadioGroupProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: ReadonlyArray<RadioGroupOption<T>>
  name: string
}

function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  name,
}: RadioGroupProps<T>): JSX.Element {
  return (
    <div role="radiogroup" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <label
            key={opt.value}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              border: `1px solid ${active ? 'var(--sky)' : 'var(--border-strong)'}`,
              background: active ? 'var(--sky-soft, rgba(77,158,250,0.12))' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-2)',
              cursor: 'pointer',
              fontSize: 13,
              userSelect: 'none',
            }}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={active}
              onChange={() => onChange(opt.value)}
              style={{ accentColor: 'var(--sky)' }}
            />
            <span style={{ fontWeight: active ? 600 : 500 }}>{opt.label}</span>
            {opt.hint && (
              <span
                style={{
                  color: 'var(--muted)',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono, monospace)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {opt.hint}
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}
