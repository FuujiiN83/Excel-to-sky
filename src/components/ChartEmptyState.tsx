/**
 * Per-chart empty-state placeholder (#249). Each chart kind owns its own
 * mini-SVG so the user sees a hint of what the chart would have looked like
 * with data, plus a short copy describing what's missing. Reusable across
 * ChartBar, ChartLine, ChartScatter, ChartBoxPlot, ChartDensity,
 * ChartHeatmap and ChartStackedBar so they stay style-consistent.
 */

type ChartKind = 'bar' | 'line' | 'scatter' | 'box' | 'density' | 'heatmap' | 'stacked' | 'map'

interface ChartEmptyStateProps {
  kind: ChartKind
  /** Override the default message — handy when callers know *why* it's empty. */
  message?: string
  height?: number
}

const DEFAULT_COPY: Record<ChartKind, string> = {
  bar: 'Sin categorías para representar.',
  line: 'Sin puntos en la línea temporal.',
  scatter: 'No hay pares numéricos suficientes para cruzar.',
  box: 'Necesitamos al menos 4 valores para dibujar la caja.',
  density: 'Pocos valores para estimar una densidad fiable.',
  heatmap: 'Faltan columnas numéricas para construir la matriz.',
  stacked: 'Sin grupos para apilar.',
  map: 'No detectamos coordenadas en los datos.',
}

export function ChartEmptyState({
  kind,
  message,
  height = 160,
}: ChartEmptyStateProps): JSX.Element {
  return (
    <div
      role="img"
      aria-label={message ?? DEFAULT_COPY[kind]}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 16,
        height,
        border: '1px dashed var(--border)',
        background: 'rgba(255,255,255,0.015)',
      }}
    >
      <svg viewBox="0 0 120 60" width={120} height={60} aria-hidden style={{ opacity: 0.5 }}>
        {renderGlyph(kind)}
      </svg>
      <span
        style={{
          fontSize: 12,
          color: 'var(--muted)',
          textAlign: 'center',
          maxWidth: 280,
          lineHeight: 1.45,
        }}
      >
        {message ?? DEFAULT_COPY[kind]}
      </span>
    </div>
  )
}

function renderGlyph(kind: ChartKind): JSX.Element {
  const stroke = 'var(--ink-2)'
  switch (kind) {
    case 'bar':
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.5">
          <rect x="10" y="35" width="14" height="20" />
          <rect x="32" y="20" width="14" height="35" />
          <rect x="54" y="28" width="14" height="27" />
          <rect x="76" y="15" width="14" height="40" />
          <rect x="98" y="40" width="14" height="15" />
        </g>
      )
    case 'line':
      return (
        <g
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 45 L25 30 L50 38 L75 18 L100 26 L115 14" />
          <circle cx="25" cy="30" r="2" />
          <circle cx="50" cy="38" r="2" />
          <circle cx="75" cy="18" r="2" />
          <circle cx="100" cy="26" r="2" />
        </g>
      )
    case 'scatter':
      return (
        <g fill={stroke} stroke="none">
          {[
            [12, 42],
            [22, 30],
            [30, 38],
            [48, 22],
            [55, 30],
            [62, 14],
            [74, 28],
            [82, 36],
            [94, 18],
            [104, 32],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="2.5" />
          ))}
        </g>
      )
    case 'box':
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.5">
          <line x1="10" y1="30" x2="110" y2="30" />
          <line x1="20" y1="22" x2="20" y2="38" />
          <line x1="100" y1="22" x2="100" y2="38" />
          <rect x="40" y="18" width="40" height="24" />
          <line x1="60" y1="18" x2="60" y2="42" strokeWidth="2" />
        </g>
      )
    case 'density':
      return (
        <g fill="none" stroke={stroke} strokeWidth="1.5">
          <path d="M5 50 Q30 50 40 30 Q55 5 75 5 Q95 5 105 30 Q115 50 115 50" />
        </g>
      )
    case 'heatmap':
      return (
        <g stroke={stroke} strokeWidth="0.8">
          {Array.from({ length: 4 }).map((_, r) =>
            Array.from({ length: 6 }).map((_, c) => (
              <rect
                key={`${r}-${c}`}
                x={6 + c * 18}
                y={2 + r * 14}
                width="16"
                height="12"
                fill={`rgba(125,227,200,${0.15 + ((r * 6 + c) % 5) * 0.12})`}
              />
            )),
          )}
        </g>
      )
    case 'stacked':
      return (
        <g stroke={stroke} strokeWidth="0.8">
          {[8, 30, 52, 74, 96].map((x, i) => (
            <g key={i}>
              <rect x={x} y="40" width="14" height="15" fill="rgba(77,158,250,0.5)" />
              <rect x={x} y="25" width="14" height="15" fill="rgba(125,227,200,0.5)" />
              <rect x={x} y="10" width="14" height="15" fill="rgba(176,148,255,0.5)" />
            </g>
          ))}
        </g>
      )
    case 'map':
      return (
        <g fill="none" stroke={stroke} strokeWidth="1">
          <path d="M10 40 Q25 28 40 35 Q55 42 70 30 Q85 18 100 28 L110 50 L10 50 Z" />
          <circle cx="55" cy="30" r="3" fill={stroke} />
          <circle cx="80" cy="22" r="2" fill={stroke} />
        </g>
      )
  }
}
