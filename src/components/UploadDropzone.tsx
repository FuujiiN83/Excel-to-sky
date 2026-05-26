import { useState, useRef } from 'react'
import { parseExcelFile, ParseError } from '../lib/parser'
import type { Dataset } from '../types/dataset'

interface UploadDropzoneProps {
  onParsed: (dataset: Dataset) => void
}

export function UploadDropzone({ onParsed }: UploadDropzoneProps): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const ds = await parseExcelFile(file)
      onParsed(ds)
    } catch (err) {
      setError(err instanceof ParseError ? err.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const f = e.dataTransfer.files[0]
        if (f) void handleFile(f)
      }}
      className="rounded-lg border-2 border-dashed border-border p-12 text-center cursor-pointer hover:border-ink transition-colors"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.ods"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
        }}
      />
      <p className="font-display text-2xl">
        {busy ? 'Procesando…' : 'Arrastra un Excel aquí o haz click'}
      </p>
      <p className="text-muted text-sm mt-2">.xlsx · .xls · .csv · .ods · máx 10 MB</p>
      {error && <p className="mt-4 text-coral">{error}</p>}
    </div>
  )
}
