import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ets:cookie-banner-dismissed'

interface CookieBannerProps {
  onLearnMore: () => void
}

export function CookieBanner({ onLearnMore }: CookieBannerProps): JSX.Element | null {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [])

  function dismiss(): void {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Ignore: private mode / storage disabled. Banner just reappears next reload.
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Aviso de privacidad sobre cookies"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 100,
        maxWidth: 720,
        marginInline: 'auto',
        background: 'var(--surface, rgba(20,22,28,0.92))',
        color: 'var(--ink)',
        border: '1px solid var(--border-strong, rgba(255,255,255,0.18))',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        fontSize: 13,
        lineHeight: 1.4,
        boxShadow: '0 18px 40px -16px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ flex: 1, color: 'var(--ink-2)' }}>
        <strong style={{ color: 'var(--ink)' }}>Excel to Sky no usa cookies.</strong>{' '}
        Tu archivo se procesa en tu navegador y nada se envía al servidor por defecto.{' '}
        <button
          onClick={onLearnMore}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--sky)',
            cursor: 'pointer',
            padding: 0,
            fontSize: 13,
            fontFamily: 'inherit',
            textDecoration: 'underline',
          }}
        >
          Por qué.
        </button>
      </div>
      <button
        onClick={dismiss}
        aria-label="Cerrar aviso"
        style={{
          background: 'var(--ink)',
          color: 'var(--bg)',
          border: 'none',
          padding: '8px 14px',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Entendido
      </button>
    </div>
  )
}
