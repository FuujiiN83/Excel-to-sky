import { useEffect, useRef, useState } from 'react'
import { parseExcelFileWithMeta, fileSizeTier, WARN_FILE_BYTES } from '../lib/parser'
import { friendlifyError, type FriendlyError } from '../lib/friendlyError'
import { pushToast } from '../lib/toast'
import type { Dataset } from '../types/dataset'

interface UploadDropzoneProps {
  onParsed: (dataset: Dataset) => void
}

interface MultiSheet {
  file: File
  dataset: Dataset
  sheetNames: string[]
  sheetIndex: number
}

export function UploadDropzone({ onParsed }: UploadDropzoneProps): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [hover, setHover] = useState(false)
  const [error, setError] = useState<FriendlyError | null>(null)
  // 0-1 progress reported by the worker (#11). Null while idle.
  const [progress, setProgress] = useState<{ ratio: number; label: string } | null>(null)
  // When set, the user is sitting on the sheet picker after a multi-sheet parse.
  // The dropzone shows the picker UI and defers calling onParsed until they confirm.
  const [picker, setPicker] = useState<MultiSheet | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File, sheetIndex = 0): Promise<void> {
    setBusy(true)
    setError(null)
    setProgress({ ratio: 0, label: 'Cargando archivo…' })
    if (fileSizeTier(file.size) === 'warn' && sheetIndex === 0) {
      pushToast(
        `Archivo grande (${(file.size / 1024 / 1024).toFixed(1)} MB > ${Math.round(WARN_FILE_BYTES / 1024 / 1024)} MB). El parseo puede tardar unos segundos.`,
        'info',
        6000,
      )
    }
    try {
      const result = await parseExcelFileWithMeta(file, {
        sheetIndex,
        onProgress: ({ ratio, label }) => setProgress({ ratio, label }),
      })
      const { dataset, meta } = result
      if (meta.sheetNames && meta.sheetNames.length > 1) {
        // Multi-sheet workbook (#1) — show the picker before bubbling up.
        setPicker({ file, dataset, sheetNames: meta.sheetNames, sheetIndex: meta.sheetIndex })
      } else {
        setPicker(null)
        onParsed(dataset)
      }
    } catch (err) {
      setError(friendlifyError(err))
      setPicker(null)
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  function reparseSheet(newIndex: number): void {
    if (!picker || busy) return
    void handleFile(picker.file, newIndex)
  }

  // Clipboard paste support (#13). When the user pastes spreadsheet-shaped
  // text on the upload page (typically copied straight out of Excel /
  // Google Sheets — that's TSV by default), wrap it in a synthetic File so
  // the existing parse pipeline handles it. We only react to paste events
  // whose data shape actually looks tabular (>=1 newline OR a tab) so a
  // stray paste in an unrelated text field doesn't trigger an upload.
  useEffect(() => {
    function onPaste(e: ClipboardEvent): void {
      if (busy || picker) return
      // Ignore if focus is in an input/textarea/contenteditable — the user
      // is pasting into a form, not the dropzone.
      const ae = document.activeElement as HTMLElement | null
      if (ae) {
        const tag = ae.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || ae.isContentEditable) return
      }
      const text = e.clipboardData?.getData('text/plain') ?? ''
      if (!text) return
      // Tabular shape gate: needs either a tab OR a newline with a comma /
      // semicolon. A single line of plain text shouldn't trigger upload.
      const looksTabular = text.includes('\t') || /\r?\n.*[,;]/.test(text)
      if (!looksTabular) return
      e.preventDefault()
      // Tab-separated content is the default Excel clipboard payload, so we
      // hand it to the worker as a .tsv blob; the CSV preprocessor picks
      // the right delimiter via detectCsvDelimiter().
      const blob = new Blob([text], { type: 'text/tab-separated-values' })
      const file = new File([blob], 'pegado.tsv', { type: 'text/tab-separated-values' })
      void handleFile(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // handleFile is stable enough for this hook — it only depends on props
    // that don't change for the lifetime of the dropzone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, picker])

  function confirmCurrentSheet(): void {
    if (!picker) return
    onParsed(picker.dataset)
    setPicker(null)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setHover(true)
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault()
        setHover(false)
        const f = e.dataTransfer.files[0]
        if (f) void handleFile(f)
      }}
      onClick={() => {
        // Don't trigger the file picker while the sheet picker is shown.
        if (picker) return
        inputRef.current?.click()
      }}
      onKeyDown={(e) => {
        if (picker) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      role="button"
      tabIndex={picker ? -1 : 0}
      aria-label="Zona para soltar tu Excel o CSV. Pulsa Enter para abrir el selector de archivos."
      aria-busy={busy}
      style={{
        padding: 6,
        borderRadius: 0,
        background: hover
          ? 'linear-gradient(135deg, var(--sky-soft), var(--plum-soft))'
          : 'rgba(255,255,255,0.025)',
        boxShadow: `0 0 0 1px ${hover ? 'var(--border-strong)' : 'var(--border)'}`,
        cursor: picker ? 'default' : 'pointer',
        transition:
          'background 320ms cubic-bezier(0.32,0.72,0,1), box-shadow 320ms cubic-bezier(0.32,0.72,0,1)',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 0,
          padding: '52px 32px',
          textAlign: 'center',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.tsv,.ods,.txt"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
          }}
        />
        <div
          aria-hidden
          style={{
            width: 48,
            height: 48,
            margin: '0 auto 18px',
            borderRadius: 0,
            background: 'linear-gradient(135deg, var(--sky-soft), var(--plum-soft))',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--sky)',
            boxShadow: 'inset 0 0 0 1px var(--border)',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p
          className="font-display"
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: 'var(--ink)',
            letterSpacing: '-0.015em',
            margin: 0,
          }}
        >
          {busy
            ? 'Procesando…'
            : picker
              ? 'Elige la hoja que quieres usar'
              : 'Arrastra tu Excel o haz click'}
        </p>
        {busy && progress && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress.ratio * 100)}
            aria-label={progress.label}
            style={{
              marginTop: 16,
              maxWidth: 320,
              marginLeft: 'auto',
              marginRight: 'auto',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                height: 6,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.round(progress.ratio * 100)}%`,
                  height: '100%',
                  background:
                    'linear-gradient(90deg, var(--sky) 0%, var(--plum) 50%, var(--mint) 100%)',
                  transition: 'width 160ms ease-out',
                }}
              />
            </div>
            <p
              style={{
                marginTop: 6,
                fontSize: 11,
                color: 'var(--muted)',
                letterSpacing: '0.04em',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {progress.label} · {Math.round(progress.ratio * 100)}%
            </p>
          </div>
        )}
        {!picker && !busy && (
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 12,
              marginTop: 8,
              letterSpacing: '0.04em',
            }}
          >
            .xlsx · .xls · .csv · .tsv · .ods · hasta 20 MB
          </p>
        )}
        {!picker && !busy && (
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 11,
              marginTop: 4,
              letterSpacing: '0.04em',
            }}
          >
            …o pega contenido tabular con ⌘V / Ctrl V
          </p>
        )}

        {picker && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: 16,
              padding: '14px 16px',
              border: '1px solid var(--border-strong)',
              background: 'rgba(255,255,255,0.02)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--ink)' }}>{picker.file.name}</strong> tiene{' '}
              {picker.sheetNames.length} hojas. Vista previa de{' '}
              <strong style={{ color: 'var(--sky)' }}>
                {picker.sheetNames[picker.sheetIndex]}
              </strong>
              : {picker.dataset.rows.length} filas, {picker.dataset.columns.length} columnas.
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                color: 'var(--ink-2)',
              }}
            >
              <span style={{ minWidth: 80 }}>Hoja:</span>
              <select
                value={picker.sheetIndex}
                onChange={(e) => reparseSheet(Number(e.target.value))}
                disabled={busy}
                style={{
                  flex: 1,
                  background: 'var(--surface)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--ink)',
                  padding: '6px 10px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  cursor: busy ? 'wait' : 'pointer',
                }}
              >
                {picker.sheetNames.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={confirmCurrentSheet}
                disabled={busy}
                style={{
                  background: 'var(--ink)',
                  color: 'var(--bg)',
                  border: 'none',
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: busy ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Usar esta hoja
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setPicker(null)
                }}
                disabled={busy}
                style={{
                  background: 'transparent',
                  color: 'var(--ink-2)',
                  border: '1px solid var(--border-strong)',
                  padding: '8px 16px',
                  fontSize: 13,
                  cursor: busy ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Otro archivo
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 18,
              padding: '12px 14px',
              border: '1px solid var(--coral)',
              borderLeftWidth: 3,
              background: 'rgba(248, 113, 113, 0.06)',
              textAlign: 'left',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              style={{
                color: 'var(--coral)',
                fontSize: 13,
                fontWeight: 600,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              {error.title}
            </p>
            {error.hint && (
              <p
                style={{
                  color: 'var(--ink-2)',
                  fontSize: 12,
                  margin: '6px 0 0',
                  lineHeight: 1.55,
                }}
              >
                {error.hint}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
