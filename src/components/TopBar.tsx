import type { Dataset } from '../types/dataset'

interface TopBarProps {
  current: string | null
  onNav: (route: string) => void
  dataset: Dataset | null
  hideNav?: boolean
  onShare?: () => void
}

interface NavItem {
  id: string
  label: string
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'compare', label: 'Comparar' },
  { id: 'detail', label: 'Columnas' },
  { id: 'share', label: 'Compartir' },
]

function Logo({ size = 26 }: { size?: number }): JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative overflow-hidden"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(135deg, var(--sky), var(--plum))',
          borderRadius: 0,
          boxShadow: '0 0 0 1px var(--border), 0 6px 18px -8px rgba(77,158,250,0.5)',
        }}
      >
        <svg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full">
          <path
            d="M7 17 L 11 13 L 14 16 L 18 8"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="8" r="1.5" fill="rgba(255,255,255,0.95)" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span
          className="font-display text-ink"
          style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}
        >
          Excel to Sky
        </span>
        <span className="text-muted" style={{ fontSize: 10, marginTop: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          v0.5 · beta
        </span>
      </div>
    </div>
  )
}

export function TopBar(props: TopBarProps): JSX.Element {
  const { current, onNav, dataset, hideNav, onShare } = props

  return (
    <header
      className="flex items-center justify-between sticky top-0 z-10"
      style={{
        padding: '14px 28px',
        background: 'color-mix(in oklab, var(--bg) 70%, transparent)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center" style={{ gap: 22 }}>
        <Logo />
        {!hideNav && (
          <nav
            className="flex bg-surface border border-border"
            style={{ gap: 2, marginLeft: 8, padding: 4 }}
          >
            {NAV_ITEMS.map((it) => {
              const active = current === it.id
              return (
                <button
                  key={it.id}
                  onClick={() => onNav(it.id)}
                  className="border-none transition-all"
                  style={{
                    padding: '6px 14px',
                    background: active ? 'var(--ink)' : 'transparent',
                    color: active ? 'var(--bg)' : 'var(--ink-2)',
                    fontSize: 13,
                    fontWeight: 500,
                    transitionDuration: '150ms',
                  }}
                >
                  {it.label}
                </button>
              )
            })}
          </nav>
        )}
      </div>
      <div className="flex items-center" style={{ gap: 12 }}>
        {dataset && (
          <div
            className="flex items-center bg-surface border border-border"
            style={{ gap: 10, padding: '6px 12px 6px 6px', fontSize: 13 }}
          >
            <div
              className="grid place-items-center"
              style={{
                width: 22,
                height: 22,
                background: 'var(--mint-soft)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--mint)',
              }}
            >
              xls
            </div>
            <span style={{ color: 'var(--ink-2)' }}>{dataset.label}</span>
            <span
              className="font-mono text-muted"
              style={{ fontSize: 11 }}
            >
              {dataset.rows.length} filas · {dataset.columns.length} columnas
            </span>
          </div>
        )}
        {!hideNav && onShare && (
          <button
            onClick={onShare}
            className="inline-flex items-center border-none"
            style={{
              background: 'var(--ink)',
              color: 'var(--bg)',
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              gap: 6,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Compartir
          </button>
        )}
      </div>
    </header>
  )
}
