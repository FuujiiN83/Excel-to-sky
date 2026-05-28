import type { Filter } from '../lib/filters'

/**
 * Drill-down breadcrumb strip (#144). Renders a horizontal chain of every
 * active filter as removable chips. Clicking a chip pops just that filter;
 * clicking "Limpiar" pops all. Highlight-only filters render with a different
 * style so users can tell at a glance which ones drop rows vs. dim them.
 */

interface FilterBreadcrumbsProps {
  filters: ReadonlyArray<Filter>
  onRemove: (id: string) => void
  onClear: () => void
}

export function FilterBreadcrumbs({
  filters,
  onRemove,
  onClear,
}: FilterBreadcrumbsProps): JSX.Element | null {
  if (filters.length === 0) return null
  return (
    <nav
      aria-label="Filtros activos"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border)',
        marginBottom: 14,
      }}
    >
      <span
        className="font-mono"
        style={{
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginRight: 8,
        }}
      >
        Filtros
      </span>
      {filters.map((f, i) => (
        <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <span style={{ color: 'var(--muted)', fontSize: 11 }}>›</span>}
          <button
            type="button"
            onClick={() => onRemove(f.id)}
            title={`Quitar filtro ${f.label}`}
            style={{
              background: f.highlightOnly ? 'rgba(125,227,200,0.12)' : 'rgba(77,158,250,0.12)',
              border: `1px solid ${f.highlightOnly ? 'var(--mint)' : 'var(--sky)'}`,
              color: 'var(--ink)',
              padding: '4px 10px',
              fontSize: 12,
              fontFamily: 'inherit',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {f.label}
            <span aria-hidden style={{ fontSize: 10, color: 'var(--muted)' }}>
              ✕
            </span>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClear}
        style={{
          marginLeft: 'auto',
          background: 'transparent',
          border: 'none',
          color: 'var(--muted)',
          fontSize: 11,
          cursor: 'pointer',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontFamily: 'inherit',
        }}
      >
        Limpiar
      </button>
    </nav>
  )
}
