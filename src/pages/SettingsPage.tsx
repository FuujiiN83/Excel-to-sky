import type { ReactNode } from 'react'
import { LegalLayout } from './LegalLayout'
import { useSettings } from '../lib/SettingsContext'
import type { DateFormat, NumberLocale, Theme } from '../lib/settings'
import { fmtDate } from '../lib/stats'

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

          <SettingsRow
            label="Formato de números"
            description="Define el separador de miles y el decimal usados en gráficos, estadísticas y comparativas."
          >
            <SelectControl<NumberLocale>
              value={settings.numberLocale}
              onChange={(v) => update('numberLocale', v)}
              options={[
                { value: 'es-ES', label: 'Español (1.234,5)' },
                { value: 'en-US', label: 'English US (1,234.5)' },
                { value: 'de-DE', label: 'Deutsch (1.234,5)' },
                { value: 'fr-FR', label: 'Français (1 234,5)' },
                { value: 'pt-PT', label: 'Português (1 234,5)' },
              ]}
            />
            <SamplePreview
              label="Ejemplo"
              value={(1234567.89).toLocaleString(settings.numberLocale, {
                maximumFractionDigits: 1,
              })}
            />
          </SettingsRow>

          <SettingsRow
            label="Formato de fecha"
            description="Cómo se renderizan las fechas en stats, comparativas y vistas detalladas."
          >
            <SelectControl<DateFormat>
              value={settings.dateFormat}
              onChange={(v) => update('dateFormat', v)}
              options={[
                { value: 'dd/mm/yyyy', label: 'dd/mm/yyyy (Europa)' },
                { value: 'mm/dd/yyyy', label: 'mm/dd/yyyy (EEUU)' },
                { value: 'yyyy-mm-dd', label: 'yyyy-mm-dd (ISO 8601)' },
              ]}
            />
            <SamplePreview label="Hoy" value={fmtDate(new Date())} />
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

interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: ReadonlyArray<SelectOption<T>>
}

function SelectControl<T extends string>({
  value,
  onChange,
  options,
}: SelectControlProps<T>): JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        color: 'var(--ink)',
        padding: '8px 12px',
        fontSize: 13,
        fontFamily: 'inherit',
        cursor: 'pointer',
        minWidth: 220,
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

interface SamplePreviewProps {
  label: string
  value: string
}

function SamplePreview({ label, value }: SamplePreviewProps): JSX.Element {
  return (
    <div
      style={{
        marginTop: 10,
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 10,
        padding: '6px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        fontSize: 12,
      }}
    >
      <span
        style={{
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono, monospace)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontSize: 10,
        }}
      >
        {label}
      </span>
      <span
        className="font-mono"
        style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono, monospace)' }}
      >
        {value}
      </span>
    </div>
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
