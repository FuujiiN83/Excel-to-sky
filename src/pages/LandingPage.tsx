import { Footer } from '../components/Footer'

interface LandingPageProps {
  onNav: (route: string) => void
}

export function LandingPage({ onNav }: LandingPageProps): JSX.Element {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        backgroundImage: 'var(--bg-mesh)',
        backgroundAttachment: 'fixed',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          padding: '20px 40px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'color-mix(in oklab, var(--bg) 60%, transparent)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="font-display"
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
          }}
        >
          EXCEL<span style={{ color: 'var(--sky)' }}>—</span>SKY
        </div>
        <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[
            ['Producto', 'faq'],
            ['Privacidad', 'privacy'],
            ['Términos', 'terms'],
          ].map(([label, route]) => (
            <button
              key={route}
              onClick={() => onNav(route)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-2)',
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.02em',
                padding: '8px 14px',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => onNav('upload')}
            style={{
              background: 'var(--ink)',
              color: 'var(--bg)',
              border: 'none',
              padding: '10px 18px',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              marginLeft: 12,
            }}
          >
            Abrir app →
          </button>
        </nav>
      </header>

      {/* HERO — editorial split */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          borderBottom: '1px solid var(--border)',
          minHeight: 'calc(100vh - 70px)',
        }}
      >
        {/* LEFT — copy */}
        <div
          style={{
            padding: '80px 64px 60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderRight: '1px solid var(--border)',
            position: 'relative',
          }}
        >
          <CornerTicks position="tl" />
          <CornerTicks position="bl" />

          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              style={{
                width: 24,
                height: 1,
                background: 'var(--sky)',
                display: 'inline-block',
              }}
            />
            Beta abierta · sin registro
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(56px, 6vw, 92px)',
              fontWeight: 700,
              lineHeight: 0.92,
              letterSpacing: '-0.045em',
              margin: 0,
            }}
          >
            Tus hojas
            <br />
            de cálculo,
            <br />
            <span style={{ color: 'var(--sky)', fontStyle: 'italic', fontWeight: 500 }}>
              en otra liga.
            </span>
          </h1>
          <p
            style={{
              fontSize: 17,
              color: 'var(--ink-2)',
              lineHeight: 1.55,
              marginTop: 32,
              maxWidth: 480,
            }}
          >
            Sube un Excel. Te devolvemos un dashboard navegable con stats,
            gráficos y un link para compartir. Cero instalación. Cero cuenta.
          </p>

          <div style={{ display: 'flex', gap: 0, marginTop: 40, alignItems: 'stretch' }}>
            <button
              onClick={() => onNav('upload')}
              style={{
                background: 'var(--ink)',
                color: 'var(--bg)',
                border: 'none',
                padding: '18px 32px',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              Subir mi primer Excel
              <span
                style={{
                  display: 'inline-flex',
                  width: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontSize: 12,
                }}
              >
                →
              </span>
            </button>
            <button
              onClick={() => onNav('faq')}
              style={{
                background: 'transparent',
                color: 'var(--ink-2)',
                border: '1px solid var(--border-strong)',
                borderLeft: 'none',
                padding: '18px 28px',
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Cómo funciona
            </button>
          </div>

          <div style={{ marginTop: 64, display: 'flex', gap: 48 }}>
            <Stat label="Procesado" value="Local" caption="en tu navegador" />
            <Stat label="Tamaño máx" value="10 MB" caption=".xlsx · .csv · .ods" />
            <Stat label="Cuentas" value="0" caption="ninguna requerida" />
          </div>
        </div>

        {/* RIGHT — visual mockup */}
        <div
          style={{
            position: 'relative',
            padding: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.012)',
            overflow: 'hidden',
          }}
        >
          <BackgroundGrid />
          <DashboardMockup />
          <CornerTicks position="tr" />
          <CornerTicks position="br" />
        </div>
      </section>

      {/* MANIFESTO */}
      <section
        style={{
          padding: '120px 64px',
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: 80,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            paddingTop: 12,
          }}
        >
          [01] Manifiesto
        </div>
        <p
          className="font-display"
          style={{
            fontSize: 'clamp(28px, 3vw, 44px)',
            fontWeight: 500,
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            margin: 0,
            color: 'var(--ink)',
          }}
        >
          Los datos no deberían vivir en pestañas con 70 columnas.
          Deberían contarte algo en cuanto los abres.
          <span style={{ color: 'var(--muted)' }}>
            {' '}
            Por eso construimos esto: un puente entre tu hoja y la respuesta
            que ya tenía dentro.
          </span>
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%',
          padding: '120px 64px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: 80,
            marginBottom: 64,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              paddingTop: 12,
            }}
          >
            [02] Cómo
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(36px, 4vw, 56px)',
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '-0.035em',
              margin: 0,
            }}
          >
            Tres pasos.
            <br />
            <span style={{ color: 'var(--muted)' }}>Cero fricción.</span>
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderTop: '1px solid var(--border)',
          }}
        >
          {[
            {
              num: '01',
              title: 'Suelta',
              body: 'Arrastra tu .xlsx, .csv o .ods. SheetJS lo parsea en un worker — el archivo nunca sale de tu navegador hasta que tú lo decidas.',
            },
            {
              num: '02',
              title: 'Lee',
              body: 'Detectamos cada columna (número, fecha, categoría, geo, texto), calculamos estadísticas y montamos las gráficas que mejor cuentan cada serie.',
            },
            {
              num: '03',
              title: 'Comparte',
              body: 'Un click genera un link público corto. Quien lo abra ve el mismo dashboard en modo solo lectura, sin pedirle nada.',
            },
          ].map((step, i) => (
            <div
              key={step.num}
              style={{
                padding: '48px 32px',
                borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              <div
                className="font-mono"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  color: 'var(--sky)',
                  fontWeight: 600,
                }}
              >
                {step.num} —
              </div>
              <h3
                className="font-display"
                style={{
                  fontSize: 36,
                  fontWeight: 500,
                  letterSpacing: '-0.03em',
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--ink-2)',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%',
          padding: '120px 64px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: 80,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              paddingTop: 12,
            }}
          >
            [03] Preguntas
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(36px, 4vw, 56px)',
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '-0.035em',
              margin: 0,
            }}
          >
            Lo esencial.
          </h2>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {[
            ['¿Tengo que registrarme?', 'No. Cero cuentas, cero emails. Empiezas a usarlo en el segundo siguiente al click.'],
            ['¿Mis datos son privados?', 'El parseo es local en tu navegador. Sólo se sube si tú pulsas "Compartir". Caducan a los 90 días si nadie los abre.'],
            ['¿Cuánto cuesta?', 'Es gratis. La app se sostiene con publicidad mostrada solo en la portada y el dashboard, no en la vista compartida.'],
            ['¿Qué archivos acepta?', '.xlsx, .xls, .csv y .ods, hasta 10 MB. Para archivos mayores conviene exportar a CSV.'],
          ].map(([q, a]) => (
            <li
              key={q}
              style={{
                borderTop: '1px solid var(--border)',
                padding: '28px 0',
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: 80,
                alignItems: 'baseline',
              }}
            >
              <div
                className="font-display"
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                }}
              >
                {q}
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: 'var(--ink-2)',
                  lineHeight: 1.6,
                }}
              >
                {a}
              </div>
            </li>
          ))}
          <li
            style={{
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              padding: '28px 0',
              display: 'grid',
              gridTemplateColumns: '1fr 2fr',
              gap: 80,
              alignItems: 'center',
            }}
          >
            <div />
            <button
              onClick={() => onNav('faq')}
              style={{
                background: 'transparent',
                color: 'var(--sky)',
                border: 'none',
                padding: 0,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Ver todas las preguntas <span>→</span>
            </button>
          </li>
        </ul>
      </section>

      {/* FINAL CTA */}
      <section
        style={{
          padding: '160px 64px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <BackgroundGrid faint />
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: 24,
          }}
        >
          [04] Empezar
        </div>
        <h2
          className="font-display"
          style={{
            fontSize: 'clamp(48px, 7vw, 120px)',
            fontWeight: 700,
            lineHeight: 0.92,
            letterSpacing: '-0.05em',
            margin: 0,
            maxWidth: 1100,
            marginInline: 'auto',
          }}
        >
          Treinta segundos.
          <br />
          <span style={{ color: 'var(--muted)' }}>Un dashboard.</span>
        </h2>
        <div style={{ marginTop: 56, position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => onNav('upload')}
            style={{
              background: 'var(--ink)',
              color: 'var(--bg)',
              border: 'none',
              padding: '22px 44px',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            Subir un Excel
            <span
              style={{
                display: 'inline-flex',
                width: 24,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg)',
                color: 'var(--ink)',
                fontSize: 14,
              }}
            >
              →
            </span>
          </button>
        </div>
      </section>

      <Footer onNav={onNav} />
    </div>
  )
}

// ---------- Subcomponents ----------

function Stat({ label, value, caption }: { label: string; value: string; caption: string }): JSX.Element {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        {label}
      </div>
      <div
        className="font-display"
        style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em', marginTop: 6, color: 'var(--ink)' }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{caption}</div>
    </div>
  )
}

function CornerTicks({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }): JSX.Element {
  const v = position[0] === 't' ? { top: 12 } : { bottom: 12 }
  const h = position[1] === 'l' ? { left: 12 } : { right: 12 }
  const isLeft = position[1] === 'l'
  const isTop = position[0] === 't'
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        width: 14,
        height: 14,
        borderColor: 'var(--border-strong)',
        borderStyle: 'solid',
        borderWidth: 0,
        ...(isTop ? { borderTopWidth: 1 } : { borderBottomWidth: 1 }),
        ...(isLeft ? { borderLeftWidth: 1 } : { borderRightWidth: 1 }),
        ...v,
        ...h,
        pointerEvents: 'none',
      }}
    />
  )
}

function BackgroundGrid({ faint = false }: { faint?: boolean }): JSX.Element {
  const stroke = faint ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)'
  return (
    <svg
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <pattern id="ee-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke={stroke} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ee-grid)" />
    </svg>
  )
}

// ---------- Hero visual: SVG dashboard mockup ----------

function DashboardMockup(): JSX.Element {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 560,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        zIndex: 1,
      }}
    >
      {/* "Window" header */}
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          boxShadow: '0 0 0 1px var(--border)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--muted)',
          letterSpacing: '0.06em',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, background: 'var(--muted-2)' }} />
          <span style={{ width: 8, height: 8, background: 'var(--muted-2)' }} />
          <span style={{ width: 8, height: 8, background: 'var(--muted-2)' }} />
        </div>
        <div>VENTAS_2026_Q1.XLSX</div>
        <div>· · ·</div>
      </div>

      {/* 4 stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <MockStat label="MEDIA" value="€1.2K" accent="sky" />
        <MockStat label="MÁXIMO" value="€8.4K" accent="plum" />
        <MockStat label="MÍNIMO" value="€42" accent="mint" />
        <MockStat label="FILAS" value="1.024" accent="sky" />
      </div>

      {/* Large chart */}
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          boxShadow: '0 0 0 1px var(--border)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 180,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Tendencia Q1
        </div>
        <div
          className="font-display"
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            marginTop: 4,
            marginBottom: 12,
          }}
        >
          Ingresos por semana
        </div>
        <svg viewBox="0 0 320 140" style={{ width: '100%', height: 120 }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="ee-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--sky)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--sky)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[28, 56, 84, 112].map((y) => (
            <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          ))}
          <path
            d="M 0 100 L 32 86 L 64 92 L 96 70 L 128 78 L 160 58 L 192 64 L 224 40 L 256 48 L 288 28 L 320 36 L 320 140 L 0 140 Z"
            fill="url(#ee-area)"
          />
          <path
            d="M 0 100 L 32 86 L 64 92 L 96 70 L 128 78 L 160 58 L 192 64 L 224 40 L 256 48 L 288 28 L 320 36"
            fill="none"
            stroke="var(--sky)"
            strokeWidth="1.8"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </div>

      {/* Bars + spark */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            boxShadow: '0 0 0 1px var(--border)',
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 12,
            }}
          >
            Top categorías
          </div>
          {([
            ['Madrid', 92, 'sky'],
            ['Barcelona', 74, 'plum'],
            ['Valencia', 51, 'mint'],
            ['Sevilla', 36, 'sky'],
          ] as const).map(([name, pct, accent]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--ink-2)', width: 64 }}>{name}</div>
              <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.04)' }}>
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: `var(--${accent})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            boxShadow: '0 0 0 1px var(--border)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            Spread
          </div>
          <div
            className="font-display"
            style={{ fontSize: 32, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1 }}
          >
            32.4×
          </div>
          <svg viewBox="0 0 80 24" preserveAspectRatio="none" style={{ width: '100%', height: 24 }}>
            <polyline
              points="0,18 10,14 20,16 30,10 40,12 50,8 60,4 70,6 80,2"
              stroke="var(--mint)"
              strokeWidth="1.4"
              fill="none"
              strokeLinejoin="miter"
              strokeLinecap="square"
            />
          </svg>
        </div>
      </div>

      {/* Floating callouts */}
      <div
        style={{
          position: 'absolute',
          top: -16,
          right: -28,
          background: 'var(--surface)',
          boxShadow: '0 0 0 1px var(--border-strong), 0 18px 40px -16px rgba(0,0,0,0.6)',
          padding: '8px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.1em',
          color: 'var(--sky)',
          transform: 'rotate(2deg)',
        }}
      >
        AUTO-DETECTADO · 12 COL
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: -36,
          background: 'var(--surface)',
          boxShadow: '0 0 0 1px var(--border-strong), 0 18px 40px -16px rgba(0,0,0,0.6)',
          padding: '8px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.1em',
          color: 'var(--mint)',
          transform: 'rotate(-2deg)',
        }}
      >
        LINK PÚBLICO LISTO
      </div>
    </div>
  )
}

function MockStat({ label, value, accent }: { label: string; value: string; accent: string }): JSX.Element {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        boxShadow: '0 0 0 1px var(--border)',
        padding: 10,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.16em',
          color: `var(--${accent})`,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {label}
      </div>
      <div
        className="font-display"
        style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.025em', marginTop: 4 }}
      >
        {value}
      </div>
    </div>
  )
}
