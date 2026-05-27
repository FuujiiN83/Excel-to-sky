import { useEffect, useState } from 'react'
import { LegalLayout } from './LegalLayout'
import { clearErrors, exportErrorsAsText, listErrors } from '../lib/errorLog'

interface BugReportPageProps {
  onNav: (route: string) => void
}

const CONTACT_EMAIL = 'franosma83@gmail.com'
const APP_VERSION = '0.5'
// Conservative cap for mailto: body. Real-world browsers tolerate ~2 000–8 000.
const MAILTO_BODY_LIMIT = 1500

export function BugReportPage({ onNav }: BugReportPageProps): JSX.Element {
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [includeLog, setIncludeLog] = useState(true)
  const [logCount, setLogCount] = useState(0)
  const [logPreview, setLogPreview] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    void listErrors(50).then((entries) => {
      if (cancelled) return
      setLogCount(entries.length)
    })
    void exportErrorsAsText(50).then((text) => {
      if (cancelled) return
      setLogPreview(text)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function buildMailto(): Promise<string> {
    const lines: string[] = [
      description.trim() || '(añade aquí qué estabas haciendo cuando ocurrió el bug)',
      '',
      '— — — — — — — — — —',
      `Versión: ${APP_VERSION}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : '?'}`,
      `Navegador: ${typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : '?'}`,
    ]
    if (includeLog) {
      lines.push('', 'Log de errores (redactado):', await exportErrorsAsText(50))
    }
    let body = lines.join('\n')
    if (body.length > MAILTO_BODY_LIMIT) {
      body = body.slice(0, MAILTO_BODY_LIMIT) + '\n\n[…truncado…]'
    }
    const subject = `Bug report Excel to Sky${name.trim() ? ` — ${name.trim()}` : ''}`
    return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const url = await buildMailto()
    window.location.href = url
  }

  function copyToClipboard(): void {
    void exportErrorsAsText(50).then((text) => {
      void navigator.clipboard.writeText(text)
    })
  }

  return (
    <LegalLayout title="Reportar un bug" onNav={onNav}>
      <p>
        Si algo no funciona, cuéntanos qué pasó. El formulario abre tu cliente de correo con un
        mensaje pre-rellenado dirigido a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        Nunca enviamos nada sin tu permiso — el log adjunto va redactado para que no incluya
        contenido de tus datos.
      </p>

      <form
        onSubmit={(e) => void submit(e)}
        style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <label style={fieldRow}>
          <span style={fieldLabel}>Nombre (opcional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={input}
            placeholder="Cómo te llamas"
            autoComplete="off"
          />
        </label>
        <label style={fieldRow}>
          <span style={fieldLabel}>¿Qué pasó?</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ ...input, minHeight: 140, resize: 'vertical', fontFamily: 'inherit' }}
            placeholder="Describe qué estabas haciendo, qué esperabas que pasara y qué pasó en su lugar."
            required
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeLog}
            onChange={(e) => setIncludeLog(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Adjuntar el log de errores local{' '}
            <span style={{ color: 'var(--muted)' }}>
              (
              {logCount === 0
                ? 'sin entradas todavía'
                : `${logCount} entrada${logCount === 1 ? '' : 's'}`}
              , redactado)
            </span>
          </span>
        </label>

        {includeLog && logCount > 0 && (
          <details
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: 12,
              fontSize: 12,
              color: 'var(--ink-2)',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                color: 'var(--ink-2)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Vista previa del log adjunto
            </summary>
            <pre
              style={{
                marginTop: 12,
                fontSize: 11,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'var(--muted)',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {logPreview}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="submit"
            style={{
              background: '#2E6BFF',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Abrir email →
          </button>
          {logCount > 0 && (
            <button
              type="button"
              onClick={copyToClipboard}
              style={{
                background: 'transparent',
                color: 'var(--ink-2)',
                border: '1px solid var(--border-strong)',
                padding: '10px 16px',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Copiar log
            </button>
          )}
          {logCount > 0 && (
            <button
              type="button"
              onClick={() => {
                void clearErrors().then(() => {
                  setLogCount(0)
                  setLogPreview('(no errors logged)')
                })
              }}
              style={{
                background: 'transparent',
                color: 'var(--muted)',
                border: 'none',
                padding: '10px 0',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textDecoration: 'underline',
              }}
            >
              Borrar log
            </button>
          )}
        </div>
      </form>
    </LegalLayout>
  )
}

const fieldRow = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 6,
}

const fieldLabel = {
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: 'var(--muted)',
  fontFamily: 'var(--font-mono, monospace)',
}

const input = {
  background: 'var(--surface)',
  border: '1px solid var(--border-strong)',
  color: 'var(--ink)',
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
}
