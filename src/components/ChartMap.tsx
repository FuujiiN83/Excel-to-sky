import type { Accent } from '../types/dataset'

export interface MapLocation {
  name: string
  value?: number
  /** Optional explicit normalised coordinates (0..1). Falls back to GEO lookup. */
  x?: number
  y?: number
}

interface ChartMapProps {
  locations: MapLocation[]
  accent?: Accent
  /** "world" renders 2:1 aspect (default), "iberia" renders 1:1. */
  mode?: 'world' | 'iberia'
  maxValue?: number
  /** Accessible description. If omitted, one is derived from the data. */
  ariaLabel?: string
}

function defaultMapAria(locations: MapLocation[], mode: 'world' | 'iberia'): string {
  if (locations.length === 0) return 'Mapa vacío.'
  const scope = mode === 'world' ? 'mundial' : 'de la península Ibérica'
  const named = locations
    .slice(0, 5)
    .map((l) => l.name)
    .join(', ')
  const suffix = locations.length > 5 ? ` y ${locations.length - 5} más` : ''
  return `Mapa ${scope} con ${locations.length} ubicaciones: ${named}${suffix}.`
}

/**
 * Stylised dotted-world map with city bubbles. Geo coordinates are an inline
 * lookup table — same set as the legacy `GEO` constant.
 */
const GEO: Record<string, { x: number; y: number }> = {
  // travel destinations
  Tokio: { x: 0.86, y: 0.42 },
  Roma: { x: 0.53, y: 0.36 },
  'Nueva York': { x: 0.28, y: 0.36 },
  Lisboa: { x: 0.47, y: 0.36 },
  París: { x: 0.5, y: 0.3 },
  Bangkok: { x: 0.78, y: 0.52 },
  Marrakech: { x: 0.49, y: 0.42 },
  Estambul: { x: 0.59, y: 0.36 },
  Praga: { x: 0.54, y: 0.3 },
  'Buenos Aires': { x: 0.34, y: 0.78 },
  Reikiavik: { x: 0.47, y: 0.18 },
  'El Cairo': { x: 0.6, y: 0.44 },
  Edimburgo: { x: 0.49, y: 0.24 },
  Berlín: { x: 0.54, y: 0.28 },
  // Spanish cities
  Madrid: { x: 0.49, y: 0.4 },
  Barcelona: { x: 0.52, y: 0.38 },
  Valencia: { x: 0.5, y: 0.42 },
  Sevilla: { x: 0.47, y: 0.43 },
  Bilbao: { x: 0.49, y: 0.34 },
  Zaragoza: { x: 0.5, y: 0.38 },
  Málaga: { x: 0.48, y: 0.45 },
  Granada: { x: 0.48, y: 0.44 },
  Murcia: { x: 0.5, y: 0.43 },
  Palma: { x: 0.53, y: 0.4 },
  Vigo: { x: 0.46, y: 0.36 },
  Alicante: { x: 0.51, y: 0.42 },
  'San Sebastián': { x: 0.5, y: 0.33 },
  Santander: { x: 0.48, y: 0.33 },
  Córdoba: { x: 0.48, y: 0.44 },
}

export function ChartMap({
  locations,
  accent = 'sky',
  mode = 'world',
  maxValue,
  ariaLabel,
}: ChartMapProps): JSX.Element {
  const stroke = `var(--${accent})`
  const max = maxValue || Math.max(...locations.map((l) => l.value || 1), 1)
  const label = ariaLabel ?? defaultMapAria(locations, mode)

  return (
    <div
      role="img"
      aria-label={label}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: mode === 'world' ? '2 / 1' : '1 / 1',
        background: 'var(--surface-2)',
        borderRadius: 0,
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      <svg
        viewBox="0 0 200 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <pattern id="chart-map-dots" x="0" y="0" width="2.2" height="2.2" patternUnits="userSpaceOnUse">
            <circle cx="1.1" cy="1.1" r="0.35" fill="var(--border-strong)" opacity="0.55" />
          </pattern>
          <mask id="chart-map-land">
            <rect width="200" height="100" fill="black" />
            <path d="M10 22 Q 20 14 38 16 L 58 22 L 64 36 L 56 50 L 40 56 L 26 50 L 14 38 Z" fill="white" />
            <path d="M48 56 L 58 56 L 64 72 L 56 88 L 46 92 L 42 78 Z" fill="white" />
            <path d="M88 22 L 110 18 L 122 26 L 118 36 L 104 40 L 92 34 Z" fill="white" />
            <path d="M96 40 L 118 38 L 126 56 L 120 76 L 108 82 L 98 70 L 92 54 Z" fill="white" />
            <path d="M120 18 L 168 18 L 184 30 L 184 48 L 168 56 L 152 50 L 134 42 L 124 32 Z" fill="white" />
            <path d="M162 70 L 180 68 L 186 78 L 176 86 L 164 82 Z" fill="white" />
          </mask>
        </defs>
        <rect width="200" height="100" fill="var(--surface-2)" />
        <g mask="url(#chart-map-land)">
          <rect width="200" height="100" fill="url(#chart-map-dots)" />
        </g>
      </svg>
      {locations.map((loc, i) => {
        const g = loc.x !== undefined && loc.y !== undefined ? { x: loc.x, y: loc.y } : GEO[loc.name]
        if (!g) return null
        const v = loc.value || 1
        const sz = 12 + (v / max) * 52
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${g.x * 100}%`,
              top: `${g.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                width: sz,
                height: sz,
                borderRadius: 0,
                background: `radial-gradient(circle at 30% 30%, color-mix(in oklab, ${stroke} 80%, white), ${stroke})`,
                boxShadow: `0 0 0 4px color-mix(in oklab, ${stroke} 25%, transparent), 0 6px 16px -4px ${stroke}`,
                opacity: 0.9,
              }}
            />
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 0,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ink-2)',
                boxShadow: 'var(--shadow-sm)',
                whiteSpace: 'nowrap',
              }}
            >
              {loc.name}
              {loc.value !== undefined && (
                <>
                  {' '}·{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{loc.value}</span>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function hasGeoCoords(name: string): boolean {
  return name in GEO
}
