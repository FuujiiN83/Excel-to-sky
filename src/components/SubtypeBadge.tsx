import type { ColumnSubtype } from '../types/dataset'

const SUBTYPE_LABEL: Record<ColumnSubtype, string> = {
  time: 'Hora',
  'datetime-tz': 'Datetime (TZ)',
  percentage: 'Porcentaje',
  phone: 'Teléfono',
  email: 'Email',
  url: 'URL',
  latlon: 'Coords',
  'postal-code': 'CP',
  uuid: 'UUID',
  'dni-nie': 'DNI/NIE',
}

interface SubtypeBadgeProps {
  subtype: ColumnSubtype
}

/**
 * Small uppercase pill that surfaces a detected `ColumnSubtype` next to a
 * column header. Purely informational — the underlying `type` still governs
 * stats and chart selection.
 */
export function SubtypeBadge({ subtype }: SubtypeBadgeProps): JSX.Element {
  return (
    <span
      title={`Subtipo detectado: ${SUBTYPE_LABEL[subtype]}`}
      style={{
        display: 'inline-block',
        background: 'transparent',
        color: 'var(--muted)',
        border: '1px solid var(--border-strong)',
        padding: '2px 6px',
        fontSize: 9,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-mono, monospace)',
        lineHeight: 1.4,
      }}
    >
      {SUBTYPE_LABEL[subtype]}
    </span>
  )
}
