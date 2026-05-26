import type { ReactNode } from 'react'

interface LegalLayoutProps {
  title: string
  onNav: (route: string) => void
  children: ReactNode
}

export function LegalLayout({ title, onNav, children }: LegalLayoutProps): JSX.Element {
  return (
    <div
      className="bg-canvas text-ink"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--canvas)',
        color: 'var(--ink)',
      }}
    >
      <header
        className="border-b border-border"
        style={{
          padding: '20px 32px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => onNav('landing')}
          className="font-display"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
          }}
        >
          Excel<span style={{ color: '#2E6BFF' }}>→</span>Sky
        </button>
        <nav style={{ display: 'flex', gap: 18, fontSize: 13 }}>
          <button onClick={() => onNav('faq')} style={navBtn}>FAQ</button>
          <button onClick={() => onNav('privacy')} style={navBtn}>Privacidad</button>
          <button onClick={() => onNav('terms')} style={navBtn}>Términos</button>
          <button
            onClick={() => onNav('upload')}
            style={{
              ...navBtn,
              background: '#2E6BFF',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: 0,
              fontWeight: 600,
            }}
          >
            Abrir app
          </button>
        </nav>
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: 760,
          width: '100%',
          margin: '0 auto',
          padding: '48px 24px 64px',
        }}
      >
        <h1
          className="font-display"
          style={{
            fontSize: 'clamp(32px, 4vw, 48px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            margin: '0 0 24px',
          }}
        >
          {title}
        </h1>
        <div style={{ fontSize: 16, lineHeight: 1.65, color: 'var(--ink-2)' }}>
          {children}
        </div>
      </main>

      <footer
        className="border-t border-border text-muted"
        style={{
          padding: '24px 32px',
          borderTop: '1px solid var(--border)',
          fontSize: 12,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          color: 'var(--ink-2)',
        }}
      >
        <div>© {new Date().getFullYear()} Excel to Sky</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => onNav('faq')} style={footerBtn}>FAQ</button>
          <button onClick={() => onNav('privacy')} style={footerBtn}>Privacidad</button>
          <button onClick={() => onNav('terms')} style={footerBtn}>Términos</button>
          <button onClick={() => onNav('upload')} style={footerBtn}>App</button>
        </div>
      </footer>
    </div>
  )
}

const navBtn = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'inherit',
  fontSize: 13,
  padding: 0,
} as const

const footerBtn = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'inherit',
  fontSize: 12,
  padding: 0,
  textDecoration: 'underline',
} as const
