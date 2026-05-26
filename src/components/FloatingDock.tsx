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
  { id: 'public', label: 'Pública' },
]

export function FloatingDock({ route, onNav }: FloatingDockProps): JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'color-mix(in oklab, var(--ink) 96%, transparent)',
        color: 'var(--bg)',
        borderRadius: 999,
        padding: 5,
        display: 'inline-flex',
        gap: 2,
        zIndex: 50,
        boxShadow: '0 18px 50px -18px rgba(0,0,0,.4)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <span
        style={{
          padding: '6px 10px 6px 12px',
          fontSize: 10,
          fontWeight: 600,
          color: 'color-mix(in oklab, var(--bg) 60%, transparent)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          alignSelf: 'center',
        }}
      >
        Prototipo
      </span>
      {DOCK_ITEMS.map((it) => {
        const active = route.name === it.id
        return (
          <button
            key={it.id}
            onClick={() => onNav(it.id)}
            style={{
              padding: '7px 12px',
              borderRadius: 999,
              border: 'none',
              background: active ? 'var(--bg)' : 'transparent',
              color: active ? 'var(--ink)' : 'color-mix(in oklab, var(--bg) 80%, transparent)',
              fontSize: 12,
              fontWeight: 500,
              transition: 'all .15s ease',
            }}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
