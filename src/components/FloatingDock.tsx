interface FloatingDockProps {
  route: { name: string }
  onNav: (route: string) => void
}

interface DockItem {
  id: string
  label: string
}

const DOCK_ITEMS: readonly DockItem[] = [
  { id: 'upload', label: 'Subida' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'detail', label: 'Detalle' },
  { id: 'compare', label: 'Comparar' },
  { id: 'share', label: 'Compartir' },
]

export function FloatingDock({ route, onNav }: FloatingDockProps): JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 22,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: 5,
        borderRadius: 999,
        background: 'rgba(14, 16, 21, 0.72)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.08), 0 20px 50px -16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'inline-flex',
        gap: 2,
        zIndex: 50,
      }}
    >
      {DOCK_ITEMS.map((it) => {
        const active = route.name === it.id
        return (
          <button
            key={it.id}
            onClick={() => onNav(it.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: 'none',
              background: active
                ? 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))'
                : 'transparent',
              boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.08)' : 'none',
              color: active ? 'var(--ink)' : 'var(--muted)',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '-0.005em',
              transition: 'color 220ms cubic-bezier(0.32, 0.72, 0, 1), background 220ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = 'var(--ink)'
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = 'var(--muted)'
            }}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
