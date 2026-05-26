import { useMemo, useState } from 'react'
import type { Dataset } from '../types/dataset'

interface SharePageProps {
  dataset: Dataset
  onBack: () => void
  onOpenPublic: () => void
}

type Permission = 'public' | 'workspace' | 'password'
type Expires = 'never' | '7' | '30'

export function SharePage(props: SharePageProps): JSX.Element {
  const { dataset, onBack, onOpenPublic } = props
  const [copied, setCopied] = useState(false)
  const [permission, setPermission] = useState<Permission>('public')
  const [password, setPassword] = useState('')
  const [expires, setExpires] = useState<Expires>('never')
  const linkId = useMemo(() => Math.random().toString(36).slice(2, 9), [dataset.id])
  const url = `excel-to-sky.app/v/${linkId}`

  function copy(): void {
    navigator.clipboard?.writeText('https://' + url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div style={{ padding: '32px 28px 60px', maxWidth: 1080, margin: '0 auto' }}>
      <button
        onClick={onBack}
        className="border border-border text-muted"
        style={{
          background: 'transparent',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 12,
          marginBottom: 22,
        }}
      >
        ← Dashboard
      </button>

      <div style={{ marginBottom: 30 }}>
        <div
          className="text-muted"
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}
        >
          Compartir dashboard
        </div>
        <h1
          className="font-display"
          style={{
            fontSize: 'clamp(36px, 4vw, 56px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          Un link y la historia queda contada.
        </h1>
        <p
          className="text-muted"
          style={{ marginTop: 12, maxWidth: 580, fontSize: 15 }}
        >
          Cualquiera con este enlace verá tu dashboard en modo lectura — los datos van encriptados al servidor.
        </p>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: '1.2fr 1fr', gap: 'var(--gap)' }}
      >
        {/* Link card */}
        <div
          className="bg-surface border border-border"
          style={{ borderRadius: 'var(--radius-lg)', padding: 'var(--pad-lg)' }}
        >
          <div
            className="flex items-center bg-surface-2 border border-border-strong"
            style={{
              gap: 12,
              padding: '10px 12px',
              borderRadius: 12,
            }}
          >
            <div
              className="grid place-items-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'linear-gradient(155deg, #2E6BFF, #8B5CF6)',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div
              className="font-mono"
              style={{
                flex: 1,
                fontSize: 14,
                color: 'var(--ink-2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span className="text-muted">https://</span>
              {url}
            </div>
            <button
              onClick={copy}
              style={{
                background: copied ? 'var(--mint)' : 'var(--ink)',
                color: 'var(--bg)',
                border: 'none',
                borderRadius: 999,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 500,
                transition: 'all .2s ease',
              }}
            >
              {copied ? 'Copiado ✓' : 'Copiar link'}
            </button>
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              marginTop: 22,
            }}
          >
            <div>
              <div
                className="text-muted"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}
              >
                Quién puede ver
              </div>
              <div
                className="flex bg-surface-2 border border-border"
                style={{ borderRadius: 10, padding: 3 }}
              >
                {(
                  [
                    { value: 'public', label: 'Cualquiera con link' },
                    { value: 'workspace', label: 'Mi workspace' },
                    { value: 'password', label: 'Con contraseña' },
                  ] as const
                ).map((o) => {
                  const active = permission === o.value
                  return (
                    <button
                      key={o.value}
                      onClick={() => setPermission(o.value)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        fontSize: 12,
                        fontWeight: 500,
                        background: active ? 'var(--surface)' : 'transparent',
                        border: 'none',
                        borderRadius: 7,
                        color: active ? 'var(--ink)' : 'var(--muted)',
                        boxShadow: active ? 'var(--shadow-sm)' : 'none',
                      }}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
              {permission === 'password' && (
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="palabra clave"
                  className="bg-surface-2 border border-border"
                  style={{
                    marginTop: 10,
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                />
              )}
            </div>
            <div>
              <div
                className="text-muted"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}
              >
                Expira
              </div>
              <div
                className="flex bg-surface-2 border border-border"
                style={{ borderRadius: 10, padding: 3 }}
              >
                {(
                  [
                    { value: 'never', label: 'Nunca' },
                    { value: '7', label: '7 días' },
                    { value: '30', label: '30 días' },
                  ] as const
                ).map((o) => {
                  const active = expires === o.value
                  return (
                    <button
                      key={o.value}
                      onClick={() => setExpires(o.value)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        fontSize: 12,
                        fontWeight: 500,
                        background: active ? 'var(--surface)' : 'transparent',
                        border: 'none',
                        borderRadius: 7,
                        color: active ? 'var(--ink)' : 'var(--muted)',
                        boxShadow: active ? 'var(--shadow-sm)' : 'none',
                      }}
                    >
                      {o.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Preview card */}
        <div
          className="bg-surface border border-border flex flex-col"
          style={{
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--pad-lg)',
          }}
        >
          <div
            className="text-muted"
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            Vista previa pública
          </div>
          <button
            onClick={onOpenPublic}
            className="border border-border bg-surface-2 flex flex-col text-left"
            style={{
              borderRadius: 14,
              padding: 0,
              overflow: 'hidden',
            }}
          >
            <div className="rounded border border-border p-4">
              Preview placeholder: vista pública del dataset {dataset.label}
            </div>
          </button>
          <button
            onClick={onOpenPublic}
            className="inline-flex items-center justify-center rounded-full"
            style={{
              marginTop: 14,
              background: 'var(--ink)',
              color: 'var(--bg)',
              border: 'none',
              padding: '10px 16px',
              fontWeight: 500,
              gap: 8,
            }}
          >
            Abrir vista pública
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
