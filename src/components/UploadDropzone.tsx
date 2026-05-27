import { useState, useRef } from 'react'
import { parseExcelFile } from '../lib/parser'
import { friendlifyError, type FriendlyError } from '../lib/friendlyError'
import type { Dataset } from '../types/dataset'

interface UploadDropzoneProps {
  onParsed: (dataset: Dataset) => void
}

export function UploadDropzone({ onParsed }: UploadDropzoneProps): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [hover, setHover] = useState(false)
  const [error, setError] = useState<FriendlyError | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const ds = await parseExcelFile(file)
      onParsed(ds)
    } catch (err) {
      setError(friendlifyError(err))
    } finally {
      setBusy(false)
    }
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
      onClick={() => inputRef.current?.click()}
      style={{
        padding: 6,
        borderRadius: 0,
        background: hover
          ? 'linear-gradient(135deg, var(--sky-soft), var(--plum-soft))'
          : 'rgba(255,255,255,0.025)',
        boxShadow: `0 0 0 1px ${hover ? 'var(--border-strong)' : 'var(--border)'}`,
        cursor: 'pointer',
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
          accept=".xlsx,.xls,.csv,.ods"
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
          {busy ? 'Procesando…' : 'Arrastra tu Excel o haz click'}
        </p>
        <p
          style={{
            color: 'var(--muted)',
            fontSize: 12,
            marginTop: 8,
            letterSpacing: '0.04em',
          }}
        >
          .xlsx · .xls · .csv · .ods · hasta 10 MB
        </p>
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
