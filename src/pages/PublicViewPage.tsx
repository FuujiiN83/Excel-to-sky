import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Column, Dataset } from '../types/dataset'
import { DashboardPage } from './DashboardPage'
import { installOGImage } from '../lib/ogImage'
import { hashPassword, loadShareOptions } from '../lib/shareOptions'

interface PublicViewPageProps {
  dataset: Dataset
  onColumnClick: (column: Column) => void
  onExit: () => void
}

export function PublicViewPage(props: PublicViewPageProps): JSX.Element {
  const { dataset, onColumnClick, onExit } = props

  // Stamp a canvas-rendered 1200×630 OG card into the live document meta
  // tags (#155). Doesn't help server-side crawlers — they read the static
  // /og-default.svg — but it lets browser-side "share to X" buttons pick up
  // a dataset-specific image when the user is already viewing the page.
  useEffect(() => {
    void installOGImage(dataset)
  }, [dataset])

  // Load per-slug share options (#159 white-label, #160 password).
  const slug = useMemo(() => {
    if (typeof window === 'undefined') return null
    const m = /^\/(d|embed)\/([A-Za-z0-9]{12})$/.exec(window.location.pathname)
    return m?.[2] ?? null
  }, [])
  const shareOptions = useMemo(() => (slug ? loadShareOptions(slug) : null), [slug])
  const whiteLabel = shareOptions?.whiteLabel ?? null

  // Password gate (#160). When the local share options carry a hash and the
  // visitor hasn't unlocked yet, intercept the render with a small prompt.
  // The hash check stays in-browser — no round-trip — so this only blocks
  // casual snooping, not a determined attacker.
  const [unlocked, setUnlocked] = useState(!shareOptions?.passwordHash)
  if (shareOptions?.passwordHash && !unlocked) {
    return (
      <PasswordGate
        slug={slug ?? ''}
        expected={shareOptions.passwordHash}
        onUnlock={() => setUnlocked(true)}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div
        className="border-b border-border"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in oklab, var(--sky) 18%, var(--bg)) 0%, var(--bg) 70%)',
          padding: '18px 28px 22px',
        }}
      >
        <div
          className="flex justify-between items-center"
          style={{ maxWidth: 1400, margin: '0 auto' }}
        >
          <div className="flex items-center" style={{ gap: 14 }}>
            <div
              className="rounded"
              style={{
                width: 24,
                height: 24,
                background: 'linear-gradient(155deg, #2E6BFF 0%, #8B5CF6 60%, #FF7159 100%)',
              }}
            />
            <span
              className="bg-surface border border-border text-muted"
              style={{
                borderRadius: 0,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              VISTA PÚBLICA · SOLO LECTURA
            </span>
          </div>
          <div className="flex" style={{ gap: 10 }}>
            <button
              onClick={onExit}
              className="bg-surface border border-border"
              style={{
                color: 'var(--ink-2)',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              ← Volver al editor
            </button>
            <button
              style={{
                background: 'var(--ink)',
                color: 'var(--bg)',
                border: 'none',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Descargar PDF
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '30px 0 6px' }}>
          <div
            className="text-muted"
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Compartido por Lucía Méndez · 21 may 2026
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(40px, 4.6vw, 64px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              margin: '8px 0 0',
            }}
          >
            {dataset.label.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}
          </h1>
        </div>
      </div>
      <DashboardPage
        dataset={dataset}
        onColumnClick={onColumnClick}
        onCompare={() => {}}
        onShare={() => {}}
        isPublic
      />
      <div
        className="text-muted border-t border-border"
        style={{
          textAlign: 'center',
          padding: '20px',
          fontSize: 12,
        }}
      >
        {whiteLabel ? (
          <>
            Compartido por{' '}
            <span className="text-ink-2" style={{ fontWeight: 600 }}>
              {whiteLabel}
            </span>
          </>
        ) : (
          <>
            Hecho con{' '}
            <span className="text-ink-2" style={{ fontWeight: 600 }}>
              Excel to Sky
            </span>{' '}
            · convierte tus hojas de cálculo en dashboards
          </>
        )}
      </div>
    </div>
  )
}

interface PasswordGateProps {
  slug: string
  expected: string
  onUnlock: () => void
}

function PasswordGate({ slug, expected, onUnlock }: PasswordGateProps): JSX.Element {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function submit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    if (hashPassword(slug, value) === expected) {
      onUnlock()
    } else {
      setError(true)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg)',
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Dashboard protegido
        </div>
        <h2 className="font-display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)' }}>
          Introduce la contraseña
        </h2>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(false)
          }}
          placeholder="Contraseña"
          style={{
            background: 'var(--bg)',
            border: `1px solid ${error ? 'var(--coral, #F87171)' : 'var(--border-strong)'}`,
            color: 'var(--ink)',
            padding: '10px 12px',
            fontSize: 14,
            fontFamily: 'inherit',
          }}
        />
        {error && (
          <span style={{ fontSize: 12, color: 'var(--coral, #F87171)' }}>
            Contraseña incorrecta.
          </span>
        )}
        <button
          type="submit"
          style={{
            background: 'var(--ink)',
            color: 'var(--bg)',
            border: 'none',
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Abrir dashboard
        </button>
      </form>
    </div>
  )
}
