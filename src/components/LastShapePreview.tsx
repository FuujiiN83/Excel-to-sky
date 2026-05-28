import type { DatasetShape } from '../lib/lastShape'

/**
 * Skeleton preview of the user's last dashboard shape (#186). Renders only
 * when busy — visually anchors the wait by showing a translucent ghost of
 * the layout the parsed file will produce. Pure presentation; the caller is
 * responsible for deciding when the preview should be visible.
 */

interface LastShapePreviewProps {
  shape: DatasetShape
}

export function LastShapePreview({ shape }: LastShapePreviewProps): JSX.Element {
  const total = Math.max(1, shape.typeMix.numeric + shape.typeMix.categorical + shape.typeMix.date)
  const cards = Math.min(8, Math.max(3, shape.columns))
  return (
    <div
      aria-hidden
      style={{
        marginTop: 18,
        padding: 14,
        border: '1px dashed var(--border)',
        background: 'rgba(255,255,255,0.02)',
        opacity: 0.85,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 10,
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        Vista previa — basada en tu último dashboard ({shape.rows.toLocaleString('es-ES')} filas ×{' '}
        {shape.columns} columnas)
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cards}, 1fr)`,
          gap: 6,
        }}
      >
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="ets-skeleton"
            style={{
              height: 36,
              borderRadius: 0,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 14,
          marginTop: 10,
          fontSize: 11,
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono, monospace)',
        }}
      >
        <span>{Math.round((shape.typeMix.numeric / total) * 100)}% numéricas</span>
        <span>{Math.round((shape.typeMix.categorical / total) * 100)}% categóricas</span>
        <span>{Math.round((shape.typeMix.date / total) * 100)}% fechas</span>
      </div>
    </div>
  )
}
