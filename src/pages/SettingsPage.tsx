import type { ReactNode } from 'react'
import { LegalLayout } from './LegalLayout'
import { useSettings } from '../lib/SettingsContext'
import type {
  ChartShape,
  ChartableType,
  DateFormat,
  Density,
  NumberLocale,
  Palette,
  Theme,
  UiLocale,
} from '../lib/settings'
import { UI_LOCALES } from '../lib/i18n'
import { fmtDate } from '../lib/stats'
import { HelpTip } from '../components/HelpTip'
import { confirm } from '../components/ConfirmModal'
import { pushToast } from '../lib/toast'
import { clearAllLocalData } from '../lib/clearAll'

const CHARTABLE_TYPES: ReadonlyArray<{ key: ChartableType; label: string; options: ChartShape[] }> =
  [
    { key: 'number', label: 'Numérico', options: ['auto', 'histogram', 'bar', 'line'] },
    { key: 'currency', label: 'Moneda', options: ['auto', 'histogram', 'bar', 'line'] },
    { key: 'category', label: 'Categórico', options: ['auto', 'bar'] },
    { key: 'date', label: 'Fecha', options: ['auto', 'line', 'bar'] },
    { key: 'geo', label: 'Geográfico', options: ['auto', 'map', 'bar'] },
  ]

const CHART_SHAPE_LABEL: Record<ChartShape, string> = {
  auto: 'Auto (recomendado)',
  histogram: 'Histograma',
  bar: 'Barras',
  line: 'Línea',
  map: 'Mapa',
}

interface SettingsPageProps {
  onNav: (route: string) => void
}

export function SettingsPage({ onNav }: SettingsPageProps): JSX.Element {
  const { settings, ready, update, reset } = useSettings()

  async function onReset(): Promise<void> {
    const ok = await confirm({
      title: '¿Restablecer todas las preferencias?',
      body: 'Tema, formatos, gráficos por defecto y autoanálisis volverán a sus valores originales. Esta acción no se puede deshacer.',
      confirmLabel: 'Restablecer',
      cancelLabel: 'Cancelar',
      destructive: true,
    })
    if (!ok) return
    await reset()
    pushToast('Preferencias restablecidas.', 'success')
  }

  async function onClearAll(): Promise<void> {
    const ok = await confirm({
      title: '¿Borrar TODOS los datos locales?',
      body: 'Esto eliminará dashboards guardados, preferencias, log de errores y cualquier dato que Excel to Sky haya almacenado en este navegador. Los enlaces públicos que ya compartiste seguirán funcionando hasta su expiración natural. La página se recargará al terminar.',
      confirmLabel: 'Borrar todo',
      cancelLabel: 'Cancelar',
      destructive: true,
    })
    if (!ok) return
    await clearAllLocalData()
    pushToast('Datos locales borrados. Recargando…', 'success', 2000)
    window.setTimeout(() => window.location.reload(), 800)
  }

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
            label="Idioma de la interfaz"
            description="Cambia el idioma de la app y de los insights estadísticos. La traducción cubre las superficies principales; algunas vistas legales y mensajes técnicos siguen en castellano por ahora."
          >
            <SelectControl<UiLocale>
              value={settings.uiLocale}
              onChange={(v) => update('uiLocale', v)}
              options={UI_LOCALES.map((l) => ({ value: l.code, label: l.label }))}
            />
          </SettingsRow>

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
            tooltip="Esto solo cambia cómo se muestran los números en pantalla. No afecta a los datos del Excel original ni a los enlaces compartidos."
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
            tooltip="Solo cambia cómo se muestran. Por dentro Excel to Sky parsea cualquier fecha en formato dd/mm/yyyy, mm/dd/yyyy o ISO yyyy-mm-dd indistintamente."
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

          <SettingsRow
            label="Analizar tras subir"
            description="Cuando está activo, el motor de insights estadísticos corre automáticamente al cargar un Excel. Desactívalo si prefieres lanzarlo a mano (útil con archivos grandes)."
          >
            <ToggleControl
              checked={settings.autoAnalyze}
              onChange={(v) => update('autoAnalyze', v)}
              label={settings.autoAnalyze ? 'Activado' : 'Desactivado'}
            />
          </SettingsRow>

          <SettingsRow
            label="Texto grande"
            description="Aumenta el tamaño general de la interfaz a aproximadamente 18 px. Útil para pantallas grandes o personas con baja visión."
          >
            <ToggleControl
              checked={settings.largeText}
              onChange={(v) => update('largeText', v)}
              label={settings.largeText ? 'Activado' : 'Desactivado'}
            />
          </SettingsRow>

          <SettingsRow
            label="Densidad"
            description="Cuánto espacio dejan las tarjetas y stats entre sí. Compact aprieta todo en menos píxeles, airy lo airea para presentaciones."
          >
            <RadioGroup<Density>
              value={settings.density}
              onChange={(v) => update('density', v)}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'cozy', label: 'Cozy', hint: 'Por defecto' },
                { value: 'airy', label: 'Airy' },
              ]}
              name="density"
            />
          </SettingsRow>

          <SettingsRow
            label="Paleta de gráficos"
            description="Color principal que usan las barras, líneas y stats. 'Mixto' rota los acentos por tipo de columna (azul para números, morado para categorías…)."
          >
            <RadioGroup<Palette>
              value={settings.palette}
              onChange={(v) => update('palette', v)}
              options={[
                { value: 'mixed', label: 'Mixto', hint: 'Por defecto' },
                { value: 'sky', label: 'Azul' },
                { value: 'mint', label: 'Menta' },
                { value: 'plum', label: 'Ciruela' },
                { value: 'amber', label: 'Ámbar' },
              ]}
              name="palette"
            />
          </SettingsRow>

          <SettingsRow
            label="Modo solo-local"
            description="Oculta toda la interfaz de compartir. Útil para sesiones con datos sensibles donde quieres asegurarte de que nada sale del navegador, ni siquiera por accidente."
            tooltip="Esto desactiva los botones de 'Compartir' y la ruta /share. Los dashboards que ya hayas creado siguen siendo accesibles por su enlace público hasta que caduquen — esta opción solo previene crear nuevos."
          >
            <ToggleControl
              checked={settings.localOnly}
              onChange={(v) => update('localOnly', v)}
              label={settings.localOnly ? 'Activado' : 'Desactivado'}
            />
          </SettingsRow>

          <SettingsRow
            label="Gráfico por defecto"
            description="Forma de gráfico preferida para cada tipo de columna. 'Auto' deja que la app elija la más apropiada según la forma de los datos."
            tooltip="Tu elección guía a Excel to Sky; el motor siempre podrá ofrecer un gráfico alternativo si la forma del dato no encaja con el preferido (por ejemplo, intentar 'mapa' en una columna sin coordenadas detectadas)."
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '10px 16px',
                alignItems: 'center',
                maxWidth: 520,
              }}
            >
              {CHARTABLE_TYPES.map((t) => (
                <ChartTypeRow
                  key={t.key}
                  label={t.label}
                  value={settings.defaultChartType[t.key]}
                  options={t.options}
                  onChange={(v) =>
                    update('defaultChartType', { ...settings.defaultChartType, [t.key]: v })
                  }
                />
              ))}
            </div>
          </SettingsRow>

          <div
            style={{
              marginTop: 16,
              paddingTop: 24,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void onReset()}
                style={{
                  background: 'transparent',
                  color: 'var(--coral, #F87171)',
                  border: '1px solid var(--coral, #F87171)',
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Restablecer valores por defecto
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                Borra todas las preferencias guardadas en este navegador.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void onClearAll()}
                style={{
                  background: 'var(--coral, #F87171)',
                  color: '#fff',
                  border: '1px solid var(--coral, #F87171)',
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Borrar todos los datos locales
              </button>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                Elimina dashboards, preferencias y log de errores. Recarga al terminar.
              </span>
            </div>
          </div>
        </div>
      )}
    </LegalLayout>
  )
}

interface ChartTypeRowProps {
  label: string
  value: ChartShape
  options: ReadonlyArray<ChartShape>
  onChange: (v: ChartShape) => void
}

function ChartTypeRow({ label, value, options, onChange }: ChartTypeRowProps): JSX.Element {
  return (
    <>
      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{label}</span>
      <SelectControl<ChartShape>
        value={value}
        onChange={onChange}
        options={options.map((o) => ({ value: o, label: CHART_SHAPE_LABEL[o] }))}
      />
    </>
  )
}

interface SettingsRowProps {
  label: string
  description?: string
  tooltip?: string
  children: ReactNode
}

function SettingsRow({ label, description, tooltip, children }: SettingsRowProps): JSX.Element {
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
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {label}
          {tooltip && <HelpTip content={tooltip} side="right" />}
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

interface ToggleControlProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}

function ToggleControl({ checked, onChange, label }: ToggleControlProps): JSX.Element {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        userSelect: 'none',
        fontSize: 13,
        color: 'var(--ink-2)',
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
          width: 38,
          height: 22,
          background: checked ? 'var(--sky)' : 'var(--surface-2, rgba(255,255,255,0.08))',
          border: `1px solid ${checked ? 'var(--sky)' : 'var(--border-strong)'}`,
          transition: 'background 120ms ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            background: 'var(--ink)',
            transition: 'left 120ms ease',
          }}
        />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        aria-label={label}
      />
      <span>{label}</span>
    </label>
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
