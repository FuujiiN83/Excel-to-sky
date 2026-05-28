import type { Accent } from '../types/dataset'

/**
 * Pure-SVG Sankey diagram for two-column flow data (#68). Source nodes
 * stack on the left, target nodes on the right; ribbons (cubic Bézier
 * paths) connect them with thickness proportional to the flow value.
 *
 * For the first iteration we render a "2-column" sankey — enough for the
 * common categorical-to-categorical flow ("city → product", "channel →
 * campaign"). Multi-stage Sankey is a follow-up; the data shape we accept
 * already names the columns explicitly so extending is non-breaking.
 */

export interface SankeyLink {
  source: string
  target: string
  value: number
}

interface ChartSankeyProps {
  links: ReadonlyArray<SankeyLink>
  accent?: Accent
  height?: number
  ariaLabel?: string
  /** Maximum nodes to keep per side. Rest collapsed into "Otros" to avoid clutter. */
  maxNodes?: number
}

interface NodeLayout {
  key: string
  total: number
  start: number
  end: number
}

function layoutSide(
  links: ReadonlyArray<SankeyLink>,
  side: 'source' | 'target',
  height: number,
  pad: number,
  gap: number,
  max: number,
): NodeLayout[] {
  const totals = new Map<string, number>()
  for (const l of links) {
    const key = side === 'source' ? l.source : l.target
    totals.set(key, (totals.get(key) ?? 0) + Math.max(0, l.value))
  }
  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])
  const visible = sorted.slice(0, max)
  const rest = sorted.slice(max)
  if (rest.length > 0) {
    const restTotal = rest.reduce((s, [, v]) => s + v, 0)
    visible.push(['Otros', restTotal])
  }
  const sum = visible.reduce((s, [, v]) => s + v, 0) || 1
  const usable = height - pad * 2 - gap * Math.max(0, visible.length - 1)
  const out: NodeLayout[] = []
  let cursor = pad
  for (const [key, total] of visible) {
    const h = (total / sum) * usable
    out.push({ key, total, start: cursor, end: cursor + h })
    cursor += h + gap
  }
  return out
}

function describe(links: ReadonlyArray<SankeyLink>): string {
  if (links.length === 0) return 'Diagrama de Sankey vacío.'
  const sources = new Set(links.map((l) => l.source))
  const targets = new Set(links.map((l) => l.target))
  return `Diagrama de Sankey con ${sources.size} orígenes y ${targets.size} destinos, ${links.length} flujos.`
}

export function ChartSankey({
  links,
  accent = 'sky',
  height = 320,
  ariaLabel,
  maxNodes = 8,
}: ChartSankeyProps): JSX.Element | null {
  if (!links || links.length === 0) return null
  const w = 600
  const pad = 12
  const gap = 6
  const nodeWidth = 14
  const sources = layoutSide(links, 'source', height, pad, gap, maxNodes)
  const targets = layoutSide(links, 'target', height, pad, gap, maxNodes)
  const sourceIndex = new Map(sources.map((n) => [n.key, n]))
  const targetIndex = new Map(targets.map((n) => [n.key, n]))
  const stroke = `var(--${accent})`

  // Per-node "consumed" cursor — successive ribbons stack within their node.
  const sourceUsed = new Map<string, number>()
  const targetUsed = new Map<string, number>()
  const sumSource = new Map<string, number>()
  const sumTarget = new Map<string, number>()
  for (const n of sources) sumSource.set(n.key, n.total)
  for (const n of targets) sumTarget.set(n.key, n.total)

  const ribbons = links
    .map((l) => {
      const s = sourceIndex.get(l.source) ?? sourceIndex.get('Otros')
      const t = targetIndex.get(l.target) ?? targetIndex.get('Otros')
      if (!s || !t || l.value <= 0) return null
      const sHeight = (l.value / sumSource.get(s.key)! || 0) * (s.end - s.start)
      const tHeight = (l.value / sumTarget.get(t.key)! || 0) * (t.end - t.start)
      const sY = s.start + (sourceUsed.get(s.key) ?? 0)
      const tY = t.start + (targetUsed.get(t.key) ?? 0)
      sourceUsed.set(s.key, (sourceUsed.get(s.key) ?? 0) + sHeight)
      targetUsed.set(t.key, (targetUsed.get(t.key) ?? 0) + tHeight)
      const x0 = pad + nodeWidth
      const x1 = w - pad - nodeWidth
      const cx = (x0 + x1) / 2
      const path = `M${x0},${sY} C${cx},${sY} ${cx},${tY} ${x1},${tY} L${x1},${tY + tHeight} C${cx},${tY + tHeight} ${cx},${sY + sHeight} ${x0},${sY + sHeight} Z`
      return { path, value: l.value, source: s.key, target: t.key }
    })
    .filter((x): x is { path: string; value: number; source: string; target: string } => x !== null)

  const label = ariaLabel ?? describe(links)

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {ribbons.map((r, i) => (
        <path
          key={i}
          d={r.path}
          fill={stroke}
          fillOpacity="0.18"
          stroke={stroke}
          strokeOpacity="0.35"
          strokeWidth="0.5"
        >
          <title>
            {r.source} → {r.target}: {r.value}
          </title>
        </path>
      ))}
      {sources.map((n) => (
        <g key={`s-${n.key}`}>
          <rect x={pad} y={n.start} width={nodeWidth} height={n.end - n.start} fill={stroke} />
          <text
            x={pad + nodeWidth + 4}
            y={(n.start + n.end) / 2 + 4}
            fontSize="11"
            fill="var(--ink-2)"
            fontFamily="var(--font-mono)"
          >
            {n.key}
          </text>
        </g>
      ))}
      {targets.map((n) => (
        <g key={`t-${n.key}`}>
          <rect
            x={w - pad - nodeWidth}
            y={n.start}
            width={nodeWidth}
            height={n.end - n.start}
            fill={stroke}
          />
          <text
            x={w - pad - nodeWidth - 4}
            y={(n.start + n.end) / 2 + 4}
            fontSize="11"
            fill="var(--ink-2)"
            fontFamily="var(--font-mono)"
            textAnchor="end"
          >
            {n.key}
          </text>
        </g>
      ))}
    </svg>
  )
}
