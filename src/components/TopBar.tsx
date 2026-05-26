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
        className="relative overflow-hidden rounded-lg"
        style={{
          width: size,
          height: size,
          background: 'linear-gradient(155deg, #2E6BFF 0%, #8B5CF6 60%, #FF7159 100%)',
          boxShadow: '0 4px 12px -4px rgba(46,107,255,0.45)',
        }}
      >
        <svg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full">
          <path
            d="M7 17 L 11 13 L 14 16 L 18 8"
            stroke="white"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="8" r="1.6" fill="white" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span
          className="font-display font-bold text-ink"
          style={{ fontSize: 16, letterSpacing: '-0.02em' }}
        >
          Excel to Sky
        </span>
        <span className="text-muted" style={{ fontSize: 10, marginTop: 2 }}>
          Tus datos, visibles · v0.4
        </span>
      </div>
    </div>
  )
}

export function TopBar(props: TopBarProps): JSX.Element {
  const { current, onNav, dataset, hideNav, onShare } = props

  return (
    <header
      className="flex items-center justify-between border-b border-border sticky top-0 z-10"
      style={{
        padding: '14px 28px',
        background: 'color-mix(in oklab, var(--bg) 88%, transparent)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center" style={{ gap: 22 }}>
        <Logo />
        {!hideNav && (
          <nav
            className="flex bg-surface border border-border rounded-full"
            style={{ gap: 2, marginLeft: 8, padding: 4 }}
          >
            {NAV_ITEMS.map((it) => {
              const active = current === it.id
              return (
                <button
                  key={it.id}
                  onClick={() => onNav(it.id)}
                  className="rounded-full border-none transition-all"
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
            className="flex items-center bg-surface border border-border rounded-full"
            style={{ gap: 10, padding: '6px 12px 6px 6px', fontSize: 13 }}
          >
            <div
              className="grid place-items-center rounded-md"
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
            className="inline-flex items-center border-none rounded-full"
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
