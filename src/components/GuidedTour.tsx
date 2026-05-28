import { useEffect, useState } from 'react'

/**
 * Five-step welcome overlay shown to first-time visitors of the /app upload
 * page. Dismissal is persisted in localStorage so the tour never re-appears
 * once the user has clicked Skip or finished it.
 *
 * We intentionally avoid screen-anchored highlights (positioned tooltips
 * pinned to DOM elements) for the first iteration — the upload page changes
 * layout depending on dashboard history, and anchored arrows tend to drift.
 * Instead we use a centered step card that talks the user through the four
 * routes they should know about (upload, dashboard, drill-down, settings).
 */

const STORAGE_KEY = 'ets-tour-dismissed-v1'

interface Step {
  badge: string
  title: string
  body: string
}

const STEPS: ReadonlyArray<Step> = [
  {
    badge: 'Paso 1 · Bienvenido',
    title: 'Excel → narrativa visual en 30 segundos',
    body: 'Excel to Sky convierte una hoja de cálculo en un dashboard estadístico legible. Sin instalar nada, sin enviar datos a ningún servidor.',
  },
  {
    badge: 'Paso 2 · Sube tu archivo',
    title: 'Arrastra, pega o prueba con un ejemplo',
    body: 'Acepta .xlsx, .xls, .csv, .tsv y .ods. También puedes pegar una tabla copiada desde el Excel directamente con Ctrl/⌘ + V. Si quieres ver la app trabajando sin subir nada, elige uno de los nueve datasets de ejemplo.',
  },
  {
    badge: 'Paso 3 · El dashboard',
    title: 'Stats, gráficos y subtipos detectados',
    body: 'Cada columna se analiza por tipo (número, fecha, categoría, geo, moneda…). Click en cualquier tarjeta abre el detalle con la distribución completa. El dock flotante de la izquierda te lleva a compartir, comparar y exportar.',
  },
  {
    badge: 'Paso 4 · Privacidad',
    title: 'Tus datos nunca salen del navegador',
    body: 'Todo el parsing y el análisis corre en local. Solo cuando pulsas Compartir se sube el dashboard a Supabase con un enlace caducable. Lo verás en el badge inferior derecho y en el panel de auditoría.',
  },
  {
    badge: 'Paso 5 · Personaliza',
    title: 'Ajusta a tu gusto en Configuración',
    body: 'Cambia el idioma, la paleta, los formatos de número y fecha, o desactiva el autoanálisis. Puedes restablecer todo o borrar los datos locales con un click desde /settings.',
  },
]

export function GuidedTour(): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return
    } catch {
      // Storage blocked (private mode, quota): skip the tour silently.
      return
    }
    setOpen(true)
  }, [])

  function dismiss(): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, '1')
      }
    } catch {
      // Best-effort persistence; the user will see the tour again next visit.
    }
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') dismiss()
      else if (e.key === 'ArrowRight') setStep((s) => Math.min(STEPS.length - 1, s + 1))
      else if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ets-tour-title"
      onClick={dismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 195,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          padding: '32px 36px',
          maxWidth: 520,
          width: '100%',
          boxShadow: '0 30px 60px -24px rgba(0,0,0,0.7)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--sky)',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {current.badge}
        </div>
        <h2
          id="ets-tour-title"
          className="font-display"
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.025em',
            margin: '6px 0 14px',
          }}
        >
          {current.title}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--ink-2)',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {current.body}
        </p>

        <div
          aria-hidden
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 24,
          }}
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? 24 : 8,
                height: 4,
                background: i === step ? 'var(--sky)' : 'var(--border-strong)',
                transition: 'width 160ms ease',
              }}
            />
          ))}
        </div>

        <div
          style={{
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={dismiss}
            style={{
              background: 'transparent',
              color: 'var(--muted)',
              border: 'none',
              padding: '8px 4px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Saltar tour
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                style={{
                  background: 'transparent',
                  color: 'var(--ink)',
                  border: '1px solid var(--border-strong)',
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Anterior
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                isLast ? dismiss() : setStep((s) => Math.min(STEPS.length - 1, s + 1))
              }
              style={{
                background: 'var(--ink)',
                color: 'var(--bg)',
                border: 'none',
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {isLast ? 'Empezar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Re-open the tour from anywhere (e.g. a "Volver a ver el tour" button in
 * settings). Clears the dismissal marker. Caller is responsible for forcing
 * a remount of <GuidedTour /> so the effect re-evaluates.
 */
export function resetGuidedTour(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
