interface LandingPageProps {
  onNav: (route: string) => void
}

export function LandingPage({ onNav }: LandingPageProps): JSX.Element {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--canvas)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          padding: '20px 32px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          className="font-display"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
          }}
        >
          Excel<span style={{ color: '#2E6BFF' }}>→</span>Sky
        </div>
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
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            Abrir app
          </button>
        </nav>
      </header>

      {/* HERO */}
      <section
        style={{
          padding: '80px 24px 60px',
          textAlign: 'center',
          maxWidth: 880,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink-2)',
            marginBottom: 18,
          }}
        >
          Sin registro · Tus datos en tu navegador
        </div>
        <h1
          className="font-display"
          style={{
            fontSize: 'clamp(40px, 6vw, 80px)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            margin: 0,
          }}
        >
          Convierte tu Excel{' '}
          <span
            style={{
              background:
                'linear-gradient(120deg, #2E6BFF 0%, #8B5CF6 50%, #FF7159 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            en un dashboard
          </span>
        </h1>
        <p
          style={{
            fontSize: 18,
            color: 'var(--ink-2)',
            lineHeight: 1.55,
            maxWidth: 620,
            margin: '24px auto 32px',
          }}
        >
          Sube una hoja de cálculo y obtén estadísticas, gráficos y una página
          compartible en segundos. Sin instalar nada. Sin crear cuenta.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => onNav('upload')}
            style={{
              background: '#2E6BFF',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px 28px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 8px 24px -8px rgba(46,107,255,0.45)',
            }}
          >
            Empezar gratis
          </button>
          <button
            onClick={() => onNav('faq')}
            style={{
              background: 'transparent',
              color: 'var(--ink)',
              border: '1px solid var(--border-strong)',
              borderRadius: 12,
              padding: '14px 28px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cómo funciona
          </button>
        </div>
      </section>

      {/* FEATURE CARDS */}
      <section
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '40px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
        }}
      >
        {[
          {
            num: '01',
            title: 'Sube tu Excel',
            desc: 'Arrastra un .xlsx o .csv. Lo procesamos en tu navegador, sin enviarlo a ningún servidor.',
          },
          {
            num: '02',
            title: 'Genera tu dashboard',
            desc: 'Detectamos tipos de columna, calculamos estadísticas y elegimos el gráfico adecuado.',
          },
          {
            num: '03',
            title: 'Compártelo',
            desc: 'Un enlace público para enviar por email o redes. Sin pedir registro a quien lo abra.',
          },
        ].map((card) => (
          <div
            key={card.num}
            style={{
              padding: 24,
              border: '1px solid var(--border)',
              borderRadius: 16,
              background: 'var(--surface)',
            }}
          >
            <div
              className="font-mono"
              style={{
                fontSize: 11,
                color: '#2E6BFF',
                fontWeight: 700,
                letterSpacing: '0.1em',
                marginBottom: 10,
              }}
            >
              {card.num}
            </div>
            <h3
              className="font-display"
              style={{
                fontSize: 22,
                fontWeight: 700,
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
              }}
            >
              {card.title}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>
              {card.desc}
            </p>
          </div>
        ))}
      </section>

      {/* SCREENSHOTS */}
      <section
        style={{
          maxWidth: 1080,
          margin: '40px auto',
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
        }}
      >
        {[
          { label: 'Vista general', emoji: '📊', sub: 'Tarjetas con MAX, MIN, MEDIA y MODA' },
          { label: 'Detalle de columna', emoji: '📈', sub: 'Histograma, outliers y top valores' },
          { label: 'Comparador', emoji: '🔀', sub: 'Cruza dos columnas en un scatter o barras' },
        ].map((shot) => (
          <div
            key={shot.label}
            style={{
              aspectRatio: '4/3',
              borderRadius: 16,
              background:
                'linear-gradient(135deg, rgba(46,107,255,0.08) 0%, rgba(139,92,246,0.08) 100%)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 20,
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 12 }}>{shot.emoji}</div>
            <div
              className="font-display"
              style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}
            >
              {shot.label}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--ink-2)',
                marginTop: 6,
                maxWidth: 220,
              }}
            >
              {shot.sub}
            </div>
          </div>
        ))}
      </section>

      {/* FAQ TEASER */}
      <section
        style={{
          maxWidth: 760,
          margin: '40px auto',
          padding: '40px 24px',
        }}
      >
        <h2
          className="font-display"
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            margin: '0 0 18px',
          }}
        >
          Preguntas frecuentes
        </h2>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {[
            ['¿Tengo que registrarme?', 'No. Puedes usar la app sin crear ninguna cuenta.'],
            ['¿Mis datos son privados?', 'El procesado es local. Sólo se sube a la nube si pulsas “Compartir”.'],
            ['¿Cuánto cuesta?', 'Es gratis. Mostramos publicidad para mantener el servicio.'],
          ].map(([q, a]) => (
            <li
              key={q}
              style={{
                padding: 18,
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{q}</div>
              <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>{a}</div>
            </li>
          ))}
        </ul>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={() => onNav('faq')}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
          >
            Ver todas las preguntas →
          </button>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ textAlign: 'center', padding: '40px 24px 80px' }}>
        <button
          onClick={() => onNav('upload')}
          style={{
            background: '#2E6BFF',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '16px 36px',
            fontSize: 17,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 10px 30px -10px rgba(46,107,255,0.55)',
          }}
        >
          Subir mi primer Excel
        </button>
      </section>

      {/* FOOTER */}
      <footer
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
