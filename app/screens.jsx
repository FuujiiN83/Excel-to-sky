// Pantallas del prototipo

const { useState, useEffect, useMemo, useRef } = React;

// ------------------ Chrome / shared ------------------

function Logo({ size = 26 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
      <div style={{
        width: size, height: size, borderRadius: 8,
        background: 'linear-gradient(155deg, #2E6BFF 0%, #8B5CF6 60%, #FF7159 100%)',
        position:'relative', overflow:'hidden',
        boxShadow: '0 4px 12px -4px rgba(46,107,255,0.45)',
      }}>
        <svg viewBox="0 0 24 24" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
          <path d="M7 17 L 11 13 L 14 16 L 18 8" stroke="white" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="18" cy="8" r="1.6" fill="white" />
        </svg>
      </div>
      <div style={{ display:'flex', flexDirection:'column', lineHeight:1 }}>
        <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, letterSpacing:'-0.02em', color:'var(--ink)' }}>Excel to Sky</span>
        <span style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>Tus datos, visibles · v0.4</span>
      </div>
    </div>
  );
}

function TopBar({ current, onNav, dataset, onShare, hideNav }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'compare',   label: 'Comparar' },
    { id: 'detail',    label: 'Columnas'  },
    { id: 'share',     label: 'Compartir' },
  ];
  return (
    <header style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 28px',
      borderBottom:'1px solid var(--border)',
      background:'color-mix(in oklab, var(--bg) 88%, transparent)',
      backdropFilter:'blur(8px)',
      position:'sticky', top:0, zIndex: 10,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: 22 }}>
        <Logo />
        {!hideNav && (
          <nav style={{ display:'flex', gap: 2, marginLeft: 8, background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 999, padding: 4 }}>
            {items.map(it => (
              <button key={it.id} onClick={() => onNav(it.id)} style={{
                padding:'6px 14px',
                borderRadius: 999,
                background: current === it.id ? 'var(--ink)' : 'transparent',
                color: current === it.id ? 'var(--bg)' : 'var(--ink-2)',
                border: 'none',
                fontSize: 13, fontWeight: 500,
                transition: 'all .15s ease',
              }}>{it.label}</button>
            ))}
          </nav>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
        {dataset && (
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            background:'var(--surface)',
            border:'1px solid var(--border)',
            borderRadius: 999, padding: '6px 12px 6px 6px',
            fontSize: 13,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'var(--mint-soft)',
              display:'grid', placeItems:'center',
              fontSize: 11, fontWeight: 700, color: 'var(--mint)',
            }}>xls</div>
            <span style={{ color:'var(--ink-2)' }}>{dataset.name}</span>
            <span style={{ color:'var(--muted)', fontFamily:'var(--font-mono)', fontSize: 11 }}>
              {dataset.rows.length} filas · {dataset.columns.length} columnas
            </span>
          </div>
        )}
        {!hideNav && (
          <button onClick={onShare} style={{
            background:'var(--ink)', color:'var(--bg)', border:'none',
            borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 500,
            display:'inline-flex', alignItems:'center', gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            Compartir
          </button>
        )}
      </div>
    </header>
  );
}

// ------------------ Upload ------------------

function UploadScreen({ onLoad }) {
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(null);
  const [progress, setProgress] = useState(0);

  function simulateLoad(id) {
    setLoading(id);
    setProgress(0);
    let p = 0;
    const itv = setInterval(() => {
      p += 6 + Math.random() * 14;
      setProgress(Math.min(p, 100));
      if (p >= 100) { clearInterval(itv); setTimeout(() => onLoad(id), 220); }
    }, 60);
  }

  return (
    <div style={{ minHeight:'calc(100vh - 64px)', display:'grid', gridTemplateColumns: '1fr 1.1fr' }}>
      {/* Left — pitch */}
      <div style={{ padding: '80px 64px 60px', display:'flex', flexDirection:'column', justifyContent:'center', maxWidth: 640 }}>
        <div style={{ fontSize: 12, color:'var(--muted)', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom: 18 }}>
          Beta abierta · ningún dato sale de tu navegador
        </div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize: 'clamp(48px, 5.4vw, 80px)', fontWeight:700, letterSpacing:'-0.04em', lineHeight:0.96, margin:0, color:'var(--ink)' }}>
          Tu Excel,<br/>
          <span style={{ background:'linear-gradient(120deg, #2E6BFF 0%, #8B5CF6 50%, #FF7159 100%)', WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent' }}>al cielo.</span>
        </h1>
        <p style={{ fontSize: 18, color:'var(--ink-2)', lineHeight: 1.5, marginTop: 22, maxWidth: 480 }}>
          Suelta una hoja de cálculo y conviértela en un dashboard navegable.
          Detectamos cada columna, calculamos sus estadísticas y elegimos la
          visualización que mejor cuenta la historia.
        </p>
        <ul style={{ listStyle:'none', padding:0, margin: '34px 0 0', display:'flex', flexDirection:'column', gap: 10 }}>
          {[
            ['Auto', 'Detecta tipos: número, fecha, categoría, texto, geo.'],
            ['Stats', 'MAX, MIN, MODA, MEDIA, rango y outliers para cada columna.'],
            ['Share', 'Un link público y la historia queda contada en 1 clic.'],
          ].map(([k, t]) => (
            <li key={k} style={{ display:'flex', alignItems:'center', gap: 14 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, fontWeight:600, color:'var(--ink)', background:'var(--surface)', border:'1px solid var(--border)', padding:'3px 8px', borderRadius:6 }}>{k}</span>
              <span style={{ fontSize: 14, color:'var(--ink-2)' }}>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Right — drop zone + samples */}
      <div style={{ padding:'60px 64px 60px 0', display:'flex', flexDirection:'column', gap: 18, justifyContent:'center' }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); simulateLoad('personas'); }}
          style={{
            position:'relative',
            border: `2px dashed ${drag ? 'var(--sky)' : 'var(--border-strong)'}`,
            background: drag ? 'var(--sky-soft)' : 'var(--surface)',
            borderRadius: 28,
            padding: '54px 36px',
            textAlign:'center',
            transition: 'all .2s ease',
            boxShadow: drag ? '0 22px 60px -28px rgba(46,107,255,0.45)' : 'var(--shadow)',
          }}>
          <div style={{ display:'inline-flex', position:'relative', marginBottom: 18 }}>
            {/* stacked sheet icons */}
            <div style={{ width: 64, height: 80, borderRadius: 10, background:'var(--surface-2)', border:'1px solid var(--border)', transform:'rotate(-6deg) translateX(8px)' }} />
            <div style={{ width: 64, height: 80, borderRadius: 10, background:'var(--surface)', border:'1px solid var(--border-strong)', position:'absolute', left:14, top:6, display:'grid', placeItems:'center', fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--mint)', boxShadow:'var(--shadow)' }}>
              <span style={{ background:'var(--mint-soft)', padding:'3px 6px', borderRadius:4, fontSize:11 }}>.xlsx</span>
            </div>
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize: 26, fontWeight: 600, color:'var(--ink)', letterSpacing:'-0.02em' }}>
            Arrastra tu Excel aquí
          </div>
          <div style={{ fontSize: 14, color:'var(--muted)', marginTop: 6 }}>
            o <a href="#" onClick={(e) => { e.preventDefault(); simulateLoad('personas'); }} style={{ color:'var(--sky)', fontWeight: 500 }}>busca un archivo</a> en tu equipo · .xlsx, .csv, .ods · hasta 25 MB
          </div>
          {loading && (
            <div style={{ marginTop: 24, maxWidth: 400, marginLeft:'auto', marginRight:'auto', textAlign:'left' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize: 12, color:'var(--muted)', marginBottom: 6 }}>
                <span>Analizando columnas…</span>
                <span style={{ fontFamily:'var(--font-mono)' }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 6, background:'var(--border)', borderRadius: 999, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progress}%`, background:'var(--sky)', borderRadius: 999, transition:'width .12s linear' }} />
              </div>
            </div>
          )}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12, color:'var(--muted)', fontSize:12 }}>
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
          <span>o prueba con un ejemplo</span>
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 12 }}>
          {Object.values(DATASETS).map(ds => (
            <button key={ds.id} onClick={() => simulateLoad(ds.id)} style={{
              background:'var(--surface)',
              border:'1px solid var(--border)',
              borderRadius: 16,
              padding: 16,
              textAlign:'left',
              display:'flex', flexDirection:'column', gap: 6,
              transition: 'all .15s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ fontSize: 20 }}>{ds.icon}</div>
              <div style={{ fontWeight: 600, color:'var(--ink)', fontSize: 14 }}>{ds.label}</div>
              <div style={{ fontSize: 11, color:'var(--muted)', fontFamily:'var(--font-mono)' }}>
                {ds.rows.length} filas · {ds.columns.length} cols
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------ Dashboard general ------------------

function ColumnCard({ analysis, dataset, onClick }) {
  const col = analysis.col;
  const isNum = col.type === 'number';
  const isCat = col.type === 'category' || col.type === 'text';
  const isDate = col.type === 'date';

  let preview = null;
  let primary = null;

  if (isNum) {
    preview = <MiniBars values={analysis.histogram.map(b => b.count)} color={col.color} height={48} />;
    primary = (
      <div style={{ display:'flex', gap: 18 }}>
        <Stat label="media" value={fmtUnit(Math.round(analysis.mean), col.unit)} />
        <Stat label="rango" value={`${fmtNumber(analysis.min)}–${fmtNumber(analysis.max)}`} />
      </div>
    );
  } else if (isCat) {
    preview = <MiniBars values={analysis.top.map(t => t.count)} color={col.color} height={48} />;
    primary = (
      <div style={{ display:'flex', gap: 18 }}>
        <Stat label="distinct" value={analysis.distinct} />
        <Stat label="moda" value={analysis.mode} truncate />
      </div>
    );
  } else if (isDate) {
    preview = <MiniSpark values={analysis.timeline.map(t => t.count)} color={col.color} height={48} />;
    primary = (
      <div style={{ display:'flex', gap: 18 }}>
        <Stat label="desde" value={analysis.earliest} />
        <Stat label="hasta" value={analysis.latest} />
      </div>
    );
  }

  return (
    <button onClick={onClick} style={{
      background:'var(--surface)',
      border:'1px solid var(--border)',
      borderRadius:'var(--radius-lg)',
      padding:'var(--pad)',
      display:'flex', flexDirection:'column', gap: 14,
      textAlign:'left', cursor:'pointer',
      transition: 'all .2s ease',
      position:'relative', overflow:'hidden',
    }}
    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
          <span style={{
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            width: 26, height: 26, borderRadius: 7,
            background: softVar(col.color),
            color: colorVar(col.color),
            fontWeight: 700, fontFamily:'var(--font-mono)', fontSize: 11,
          }}>
            {isNum ? '#' : isDate ? '⌛' : isCat ? 'Aa' : 'Tx'}
          </span>
          <div style={{ fontWeight: 600, fontSize: 15, color:'var(--ink)' }}>{col.name}</div>
        </div>
        <div style={{ fontSize: 10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight: 600 }}>
          {col.type}
        </div>
      </div>
      {primary}
      {preview}
    </button>
  );
}

function Stat({ label, value, truncate }) {
  return (
    <div>
      <div style={{ fontSize: 10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight: 600, fontSize: 22, color:'var(--ink)', letterSpacing:'-0.02em', marginTop: 2, maxWidth: truncate ? 140 : undefined, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</div>
    </div>
  );
}

function DashboardScreen({ dataset, onColumnClick, onCompare, onShare, isPublic }) {
  const analyses = useMemo(() => dataset.columns.map(c => analyzeColumn(dataset, c)), [dataset]);

  // headline stats
  const numCols = dataset.columns.filter(c => c.type === 'number');
  const catCols = dataset.columns.filter(c => c.type === 'category' || c.type === 'text');
  const dateCols = dataset.columns.filter(c => c.type === 'date');

  return (
    <div style={{ padding: '32px 28px 60px', maxWidth: 1400, margin:'0 auto' }}>
      {/* Title bar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap: 20, marginBottom: 28 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{dataset.sheetName}</span>
            {!isPublic && <span style={{ background:'var(--mint-soft)', color:'var(--mint)', fontWeight:600, fontSize:10, padding:'2px 8px', borderRadius:999, textTransform:'uppercase', letterSpacing:'0.06em' }}>Sincronizado</span>}
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 700, letterSpacing:'-0.03em', margin:0, color:'var(--ink)' }}>
            Resumen del dataset
          </h1>
          <p style={{ color:'var(--muted)', marginTop: 8, maxWidth: 600, fontSize: 15 }}>
            Hemos detectado {dataset.columns.length} columnas en {dataset.rows.length} filas. Toca una tarjeta para ver sus estadísticas completas.
          </p>
        </div>
        {!isPublic && (
          <div style={{ display:'flex', gap: 10 }}>
            <SecondaryBtn onClick={onCompare}>Comparar columnas</SecondaryBtn>
            <PrimaryBtn onClick={onShare}>Compartir dashboard</PrimaryBtn>
          </div>
        )}
      </div>

      {/* Headline stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 'var(--gap)', marginBottom: 28 }}>
        <GiantStat label="Filas" value={fmtNumber(dataset.rows.length)} sub="todas válidas, 0 vacías" color="sky" />
        <GiantStat label="Columnas" value={dataset.columns.length} sub={`${numCols.length} num · ${catCols.length} cat · ${dateCols.length} fecha`} color="plum" />
        <GiantStat label="Calidad" value="98%" sub="3 valores atípicos detectados" color="mint" />
        <GiantStat label="Última carga" value="hoy" sub="21 may 2026 · 11:42" color="amber" />
      </div>

      {/* Column grid */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin: '4px 4px 14px' }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight: 600, fontSize: 20, letterSpacing:'-0.02em' }}>Columnas detectadas</div>
        <div style={{ display:'flex', gap: 8, fontSize: 12, color:'var(--muted)' }}>
          <LegendDot color="mint"  label={`Número (${numCols.length})`} />
          <LegendDot color="coral" label={`Categoría (${catCols.length})`} />
          <LegendDot color="amber" label={`Fecha (${dateCols.length})`} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 'var(--gap)' }}>
        {analyses.map(a => (
          <ColumnCard key={a.col.key} analysis={a} dataset={dataset} onClick={() => onColumnClick(a.col)} />
        ))}
      </div>

      {/* Geo / time strip */}
      {(() => {
        const geoCol = dataset.columns.find(c => c.type === 'category' && analyses.find(a => a.col.key === c.key).top.every(t => GEO[t.key]));
        if (!geoCol) return null;
        const a = analyses.find(x => x.col.key === geoCol.key);
        return (
          <div style={{ marginTop: 28, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'var(--pad-lg)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Distribución geográfica</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight: 600, fontSize: 22, marginTop: 4 }}>Top {geoCol.name.toLowerCase()}</div>
              </div>
              <button onClick={() => onColumnClick(geoCol)} style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:999, padding:'6px 14px', fontSize:12, color:'var(--ink-2)' }}>
                Ver detalle →
              </button>
            </div>
            <MapView items={a.top} color={geoCol.color} mode={geoCol.name === 'Ciudad' ? 'iberia' : 'world'} />
          </div>
        );
      })()}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background: colorVar(color) }} />
      <span>{label}</span>
    </div>
  );
}

function PrimaryBtn({ children, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      background:'var(--ink)', color:'var(--bg)', border:'none',
      borderRadius: 999, padding:'10px 20px', fontSize: 13, fontWeight: 500, ...style,
    }}>{children}</button>
  );
}
function SecondaryBtn({ children, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      background:'var(--surface)', color:'var(--ink-2)', border:'1px solid var(--border)',
      borderRadius: 999, padding:'10px 20px', fontSize: 13, fontWeight: 500, ...style,
    }}>{children}</button>
  );
}

// ------------------ Detalle de columna ------------------

function DetailScreen({ dataset, columnKey, onPickColumn, onBack }) {
  const col = dataset.columns.find(c => c.key === columnKey) || dataset.columns[0];
  const a = useMemo(() => analyzeColumn(dataset, col), [dataset, col]);

  const isNum  = col.type === 'number';
  const isCat  = col.type === 'category' || col.type === 'text';
  const isDate = col.type === 'date';
  const isGeo  = isCat && a.top.every(t => GEO[t.key]);

  return (
    <div style={{ padding: '32px 28px 60px', maxWidth: 1400, margin:'0 auto' }}>
      {/* Column tabs */}
      <div style={{ display:'flex', gap: 8, marginBottom: 22, flexWrap:'wrap' }}>
        <button onClick={onBack} style={{
          background:'transparent', border:'1px solid var(--border)', borderRadius: 8,
          padding:'6px 10px', fontSize: 12, color:'var(--muted)',
          display:'inline-flex', alignItems:'center', gap: 6,
        }}>← Dashboard</button>
        {dataset.columns.map(c => (
          <button key={c.key} onClick={() => onPickColumn(c.key)} style={{
            background: c.key === col.key ? 'var(--surface)' : 'transparent',
            border:'1px solid', borderColor: c.key === col.key ? 'var(--border-strong)' : 'transparent',
            borderRadius: 8, padding:'6px 12px', fontSize: 13, fontWeight: 500,
            color: c.key === col.key ? 'var(--ink)' : 'var(--muted)',
            display:'inline-flex', alignItems:'center', gap: 6,
          }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background: colorVar(c.color) }} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Title */}
      <div style={{ display:'flex', alignItems:'center', gap: 16, marginBottom: 28 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: softVar(col.color),
          color: colorVar(col.color),
          display:'grid', placeItems:'center',
          fontFamily:'var(--font-display)', fontWeight: 700, fontSize: 24,
        }}>{isNum ? '#' : isDate ? '⌛' : 'Aa'}</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Columna · {col.type} {col.unit && `· en ${col.unit}`}
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(36px, 4vw, 56px)', fontWeight: 700, letterSpacing:'-0.03em', margin:'4px 0 0' }}>{col.name}</h1>
        </div>
      </div>

      {/* Stat grids by column type */}
      {isNum && <NumberDetail a={a} col={col} />}
      {isCat && <CategoryDetail a={a} col={col} isGeo={isGeo} />}
      {isDate && <DateDetail a={a} col={col} />}
    </div>
  );
}

function NumberDetail({ a, col }) {
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:'var(--gap)', marginBottom: 22 }}>
        <GiantStat label="Máximo"  value={fmtUnit(a.max, col.unit)} color={col.color} accent />
        <GiantStat label="Mínimo"  value={fmtUnit(a.min, col.unit)} color={col.color} />
        <GiantStat label="Media"   value={fmtUnit(Math.round(a.mean * 10) / 10, col.unit)} color={col.color} />
        <GiantStat label="Mediana" value={fmtUnit(a.median, col.unit)} color={col.color} />
        <GiantStat label="Moda"    value={fmtUnit(a.mode, col.unit)} color={col.color} />
        <GiantStat label="Rango"   value={fmtUnit(a.range, col.unit)} color={col.color} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:'var(--gap)' }}>
        <Card title="Distribución" sub={`${a.histogram.length} intervalos · ${fmtNumber(a.count)} valores`}>
          <Histogram analysis={a} color={col.color} />
        </Card>
        <Card title="Más altos" sub="top 5">
          <HorizontalBars items={topValues(a, col, 5, 'desc')} color={col.color} />
          <div style={{ marginTop: 14, paddingTop: 14, borderTop:'1px dashed var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 8 }}>Más bajos</div>
            <HorizontalBars items={topValues(a, col, 5, 'asc')} color="muted" />
          </div>
        </Card>
      </div>
    </>
  );
}

function topValues(a, col, n, dir) {
  // For numbers, "top" means highest single values (bucketed nope — show top rows)
  // We approximate: bucket label → count from histogram top n
  const sorted = [...a.histogram].sort((x, y) => dir === 'desc' ? y.count - x.count : x.count - y.count).slice(0, n);
  return sorted.map(b => ({ key: `${fmtUnit(Math.round(b.lo), col.unit)}–${fmtUnit(Math.round(b.hi), col.unit)}`, count: b.count }));
}

function CategoryDetail({ a, col, isGeo }) {
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'var(--gap)', marginBottom: 22 }}>
        <GiantStat label="Predominante" value={a.mode} sub={`${a.modeCount} apariciones (${Math.round(a.modeCount / a.count * 100)}%)`} color={col.color} accent />
        <GiantStat label="Menos común"  value={a.least} sub={`${a.leastCount} aparicion${a.leastCount === 1 ? '' : 'es'}`} color={col.color} />
        <GiantStat label="Valores únicos" value={a.distinct} sub={`sobre ${fmtNumber(a.count)} entradas`} color={col.color} />
        <GiantStat label="Concentración" value={`${Math.round(a.top.slice(0,3).reduce((s,t)=>s+t.count,0) / a.count * 100)}%`} sub="top 3 / total" color={col.color} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns: isGeo ? '1.5fr 1fr' : '1.4fr 1fr', gap:'var(--gap)' }}>
        <Card title={isGeo ? 'Mapa de distribución' : 'Distribución'} sub={`top ${a.top.length} de ${a.distinct}`}>
          {isGeo
            ? <MapView items={a.top} color={col.color} mode="world" />
            : <HorizontalBars items={a.top} color={col.color} />}
        </Card>
        <Card title="Reparto" sub="proporción del total">
          <Donut items={a.top.slice(0, 6)} />
        </Card>
      </div>
    </>
  );
}

function DateDetail({ a, col }) {
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'var(--gap)', marginBottom: 22 }}>
        <GiantStat label="Más antiguo" value={a.earliest} color={col.color} />
        <GiantStat label="Más reciente" value={a.latest} color={col.color} accent />
        <GiantStat label="Días distintos" value={a.distinct} color={col.color} />
        <GiantStat label="Periodos" value={a.timeline.length} sub="meses con actividad" color={col.color} />
      </div>
      <Card title="Línea temporal" sub="conteo por mes">
        <LineChart data={a.timeline} color={col.color} />
      </Card>
    </>
  );
}

function Card({ title, sub, children, style }) {
  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:'var(--radius-lg)', padding:'var(--pad-lg)',
      ...style,
    }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{sub}</div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight: 600, fontSize: 22, marginTop: 4, letterSpacing:'-0.02em' }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

// ------------------ Compare ------------------

function CompareScreen({ dataset, onBack }) {
  const numCols = dataset.columns.filter(c => c.type === 'number');
  const catCols = dataset.columns.filter(c => c.type === 'category' || c.type === 'text');
  const dateCols = dataset.columns.filter(c => c.type === 'date');

  const defaultGroup = catCols[0] || dataset.columns[0];
  const defaultMetric = numCols[0] || dataset.columns[1];

  const [groupKey, setGroupKey] = useState(defaultGroup.key);
  const [metricKey, setMetricKey] = useState(defaultMetric.key);
  const [agg, setAgg] = useState('avg');

  const groupCol = dataset.columns.find(c => c.key === groupKey);
  const metricCol = dataset.columns.find(c => c.key === metricKey);

  // build grouped data
  const grouped = useMemo(() => {
    const map = {};
    dataset.rows.forEach(r => {
      const g = r[groupKey];
      const m = Number(r[metricKey]);
      if (!map[g]) map[g] = [];
      if (!Number.isNaN(m)) map[g].push(m);
    });
    return Object.entries(map).map(([k, arr]) => {
      const sum = arr.reduce((a, b) => a + b, 0);
      const avg = sum / arr.length;
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      return { key: k, count: arr.length, sum, avg, min, max };
    }).sort((a, b) => b[agg] - a[agg]);
  }, [dataset, groupKey, metricKey, agg]);

  const top = grouped.slice(0, 12);
  const winner = grouped[0];
  const loser = grouped[grouped.length - 1];

  return (
    <div style={{ padding: '32px 28px 60px', maxWidth: 1400, margin:'0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 6 }}>Gráficos comparativos</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(36px, 4vw, 56px)', fontWeight:700, letterSpacing:'-0.03em', margin:0 }}>
          Cruza columnas y mira qué pasa.
        </h1>
      </div>

      {/* Controls */}
      <div style={{
        display:'flex', flexWrap:'wrap', gap: 10, alignItems:'center',
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius: 999, padding: 8, marginBottom: 24, width:'fit-content',
      }}>
        <Pill label="Agrupar por" />
        <Select value={groupKey} onChange={setGroupKey} options={[...catCols, ...dateCols].map(c => ({ value: c.key, label: c.name }))} />
        <Pill label="Mostrar" />
        <Select value={agg} onChange={setAgg} options={[
          { value: 'avg', label: 'media' },
          { value: 'sum', label: 'suma' },
          { value: 'count', label: 'recuento' },
          { value: 'max', label: 'máximo' },
          { value: 'min', label: 'mínimo' },
        ]} />
        <Pill label="de" />
        <Select value={metricKey} onChange={setMetricKey} options={numCols.map(c => ({ value: c.key, label: c.name }))} />
      </div>

      {/* Headline */}
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap:'var(--gap)', marginBottom: 22 }}>
        <GiantStat
          label={`${agg === 'count' ? 'Mayor recuento' : agg === 'sum' ? 'Mayor suma' : agg === 'min' ? 'Menor valor' : agg === 'max' ? 'Mayor valor' : 'Mayor media'} de ${metricCol.name.toLowerCase()}`}
          value={winner.key}
          sub={`${fmtUnit(Math.round(winner[agg] * 10)/10, metricCol.unit)} · ${winner.count} filas`}
          color={metricCol.color}
          accent
        />
        <GiantStat label="Menor" value={loser.key} sub={`${fmtUnit(Math.round(loser[agg] * 10)/10, metricCol.unit)}`} color={groupCol.color} />
        <GiantStat label="Spread" value={`${Math.round((winner[agg] / Math.max(1, loser[agg])) * 10) / 10}×`} sub="diferencia entre top y bottom" color="amber" />
      </div>

      <Card title={`${aggLabel(agg)} de ${metricCol.name.toLowerCase()} por ${groupCol.name.toLowerCase()}`} sub={`${top.length} grupos`}>
        <HorizontalBars items={top.map(g => ({ key: g.key, count: Math.round(g[agg] * 10) / 10 }))} color={metricCol.color} />
      </Card>

      {/* Combined matrix preview */}
      <div style={{ marginTop: 22, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--gap)' }}>
        <Card title="Volumen por grupo" sub="cuántas filas tiene cada uno">
          <HorizontalBars items={top.map(g => ({ key: g.key, count: g.count }))} color={groupCol.color} />
        </Card>
        <Card title="Insight automático" sub="lo que destaca">
          <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap: 12 }}>
            <Insight color={metricCol.color}>
              <b>{winner.key}</b> tiene la {aggLabel(agg)} más alta de <b>{metricCol.name.toLowerCase()}</b>: <b>{fmtUnit(Math.round(winner[agg]*10)/10, metricCol.unit)}</b>.
            </Insight>
            <Insight color={groupCol.color}>
              El grupo con más filas es <b>{[...grouped].sort((a,b)=>b.count-a.count)[0].key}</b> con <b>{[...grouped].sort((a,b)=>b.count-a.count)[0].count}</b>.
            </Insight>
            <Insight color="amber">
              La diferencia entre el primero y el último es de <b>{Math.round((winner[agg] / Math.max(1, loser[agg])) * 10) / 10}×</b>.
            </Insight>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function aggLabel(a) {
  return { avg:'media', sum:'suma', count:'recuento', max:'máximo', min:'mínimo' }[a];
}

function Pill({ label }) {
  return <span style={{ padding:'6px 10px', fontSize: 12, color:'var(--muted)' }}>{label}</span>;
}

function Select({ value, onChange, options }) {
  return (
    <div style={{ position:'relative' }}>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        appearance:'none', background:'var(--surface-2)', border:'1px solid var(--border)',
        borderRadius: 999, padding:'7px 30px 7px 12px', fontSize: 13, fontWeight: 500,
        color:'var(--ink)', fontFamily:'inherit', cursor:'pointer',
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg style={{ position:'absolute', right: 10, top: '50%', transform:'translateY(-50%)', pointerEvents:'none' }} width="10" height="10" viewBox="0 0 10 10"><path d="M2 4 L 5 7 L 8 4" stroke="var(--muted)" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );
}

function Insight({ children, color }) {
  return (
    <li style={{ display:'flex', gap: 10, fontSize: 14, color:'var(--ink-2)', lineHeight: 1.45 }}>
      <span style={{ width:10, height:10, borderRadius:'50%', background: colorVar(color), marginTop: 6, flexShrink: 0 }} />
      <span>{children}</span>
    </li>
  );
}

// ------------------ Share ------------------

function ShareScreen({ dataset, onBack, onOpenPublic }) {
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState('public');
  const [password, setPassword] = useState('');
  const [expires, setExpires] = useState('never');
  const linkId = useMemo(() => Math.random().toString(36).slice(2, 9), [dataset.id]);
  const url = `excel-to-sky.app/v/${linkId}`;

  function copy() {
    navigator.clipboard?.writeText('https://' + url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div style={{ padding: '32px 28px 60px', maxWidth: 1080, margin:'0 auto' }}>
      <button onClick={onBack} style={{
        background:'transparent', border:'1px solid var(--border)', borderRadius: 8,
        padding:'6px 10px', fontSize: 12, color:'var(--muted)', marginBottom: 22,
      }}>← Dashboard</button>

      <div style={{ marginBottom: 30 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 6 }}>Compartir dashboard</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(36px, 4vw, 56px)', fontWeight: 700, letterSpacing:'-0.03em', margin:0 }}>
          Un link y la historia queda contada.
        </h1>
        <p style={{ color:'var(--muted)', marginTop: 12, maxWidth: 580, fontSize: 15 }}>
          Cualquiera con este enlace verá tu dashboard en modo lectura — los datos van encriptados al servidor.
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap: 'var(--gap)' }}>
        {/* Link card */}
        <div style={{
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-lg)', padding:'var(--pad-lg)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap: 12, padding:'10px 12px', border:'1px solid var(--border-strong)', borderRadius: 12, background:'var(--surface-2)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background:'linear-gradient(155deg, #2E6BFF, #8B5CF6)', display:'grid', placeItems:'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <div style={{ flex: 1, fontFamily:'var(--font-mono)', fontSize: 14, color:'var(--ink-2)', overflow:'hidden', textOverflow:'ellipsis' }}>
              <span style={{ color:'var(--muted)' }}>https://</span>{url}
            </div>
            <button onClick={copy} style={{
              background: copied ? 'var(--mint)' : 'var(--ink)',
              color:'var(--bg)', border:'none', borderRadius: 999,
              padding:'8px 16px', fontSize: 12, fontWeight: 500,
              transition:'all .2s ease',
            }}>{copied ? 'Copiado ✓' : 'Copiar link'}</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14, marginTop: 22 }}>
            <Toggle label="Quién puede ver">
              <Segment value={permission} onChange={setPermission} options={[
                { value: 'public',   label: 'Cualquiera con link' },
                { value: 'workspace', label: 'Mi workspace' },
                { value: 'password', label: 'Con contraseña' },
              ]} />
              {permission === 'password' && (
                <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="palabra clave"
                  style={{ marginTop: 10, width:'100%', padding: '8px 12px', borderRadius: 8, border:'1px solid var(--border)', background:'var(--surface-2)', fontFamily:'inherit', fontSize: 13 }} />
              )}
            </Toggle>
            <Toggle label="Expira">
              <Segment value={expires} onChange={setExpires} options={[
                { value: 'never', label: 'Nunca' },
                { value: '7',     label: '7 días' },
                { value: '30',    label: '30 días' },
              ]} />
            </Toggle>
          </div>

          <div style={{ display:'flex', gap: 8, marginTop: 22, flexWrap:'wrap' }}>
            <SmallChip icon="🔄" label="Mantener sincronizado con cambios" active />
            <SmallChip icon="👁" label="Permitir descargar PDF" />
            <SmallChip icon="💬" label="Habilitar comentarios" />
            <SmallChip icon="🔍" label="Modo presentación" />
          </div>
        </div>

        {/* Preview card */}
        <div style={{
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-lg)', padding:'var(--pad-lg)',
          display:'flex', flexDirection:'column',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 12 }}>Vista previa pública</div>
          <button onClick={onOpenPublic} style={{
            border:'1px solid var(--border)',
            background:'var(--surface-2)',
            borderRadius: 14, padding: 0, overflow:'hidden',
            cursor:'pointer', textAlign:'left',
            display:'flex', flexDirection:'column',
          }}>
            <div style={{ height: 26, background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap: 6, padding:'0 10px' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#ff5f57' }} />
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#febc2e' }} />
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#28c840' }} />
              <span style={{ marginLeft: 12, fontFamily:'var(--font-mono)', fontSize: 10, color:'var(--muted)' }}>{url}</span>
            </div>
            <div style={{ padding: 18, display:'flex', flexDirection:'column', gap: 10 }}>
              <Logo size={20} />
              <div style={{ fontFamily:'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing:'-0.02em', marginTop: 8 }}>Resumen del dataset</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 6 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 40, borderRadius: 6, background: i === 1 ? 'var(--sky-soft)' : 'var(--surface)' , border:'1px solid var(--border)' }} />)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap: 6 }}>
                {[0,1,2,3,4,5,6,7].map(i => <div key={i} style={{ height: 32, borderRadius: 6, background:'var(--surface)', border:'1px solid var(--border)' }} />)}
              </div>
            </div>
          </button>
          <button onClick={onOpenPublic} style={{
            marginTop: 14, background:'var(--ink)', color:'var(--bg)',
            border:'none', borderRadius: 999, padding:'10px 16px', fontWeight: 500,
            display:'inline-flex', alignItems:'center', justifyContent:'center', gap: 8,
          }}>
            Abrir vista pública
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
          </button>
        </div>
      </div>

      {/* QR + invites */}
      <div style={{ marginTop: 'var(--gap)', display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:'var(--gap)' }}>
        <Card title="Móvil & QR" sub="abrir el dashboard desde otro dispositivo">
          <div style={{ display:'flex', alignItems:'center', gap: 18 }}>
            <FakeQR />
            <div style={{ fontSize: 13, color:'var(--muted)', lineHeight: 1.5 }}>
              Escanea con la cámara para abrir el dashboard en cualquier móvil. La vista pública es totalmente responsive y se puede instalar como PWA.
            </div>
          </div>
        </Card>
        <Card title="Invitaciones por email" sub="opcional · notificación al abrir">
          <div style={{ display:'flex', gap: 8 }}>
            <input placeholder="alguien@empresa.com" style={{ flex: 1, padding:'10px 12px', borderRadius: 10, border:'1px solid var(--border)', background:'var(--surface-2)', fontFamily:'inherit', fontSize: 13 }} />
            <PrimaryBtn>Invitar</PrimaryBtn>
          </div>
          <div style={{ marginTop: 14, display:'flex', flexDirection:'column', gap: 8 }}>
            {[['LM','Lucía Méndez','luciam@empresa.com','vista hace 2 h'],
              ['PR','Pablo Rivas','pablo@empresa.com','aún no vista']].map(([a, n, e, s], i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap: 12, padding:'8px 4px' }}>
                <div style={{ width: 30, height: 30, borderRadius: 99, background:'var(--plum-soft)', color:'var(--plum)', display:'grid', placeItems:'center', fontWeight: 700, fontSize: 12 }}>{a}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{n}</div>
                  <div style={{ fontSize: 11, color:'var(--muted)', fontFamily:'var(--font-mono)' }}>{e}</div>
                </div>
                <div style={{ fontSize: 11, color:'var(--muted)' }}>{s}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function FakeQR() {
  const r = rng2(99);
  const cells = [];
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const corner = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    cells.push({ x, y, on: corner ? ((x === 0 || x === 6 || y === 0 || y === 6) || (x > 1 && x < 5 && y > 1 && y < 5)) : r() > 0.5 });
  }
  return (
    <svg viewBox="0 0 21 21" style={{ width: 130, height: 130, background:'var(--surface)', borderRadius: 12, padding: 4, border:'1px solid var(--border)' }}>
      {cells.map((c, i) => c.on && <rect key={i} x={c.x} y={c.y} width="1" height="1" fill="var(--ink)" />)}
    </svg>
  );
}
function rng2(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

function Toggle({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}
function Segment({ value, onChange, options }) {
  return (
    <div style={{ display:'flex', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius: 10, padding: 3 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          flex: 1, padding:'8px 10px', fontSize: 12, fontWeight: 500,
          background: value === o.value ? 'var(--surface)' : 'transparent',
          border:'none',
          borderRadius: 7,
          color: value === o.value ? 'var(--ink)' : 'var(--muted)',
          boxShadow: value === o.value ? 'var(--shadow-sm)' : 'none',
          transition:'all .15s ease',
        }}>{o.label}</button>
      ))}
    </div>
  );
}
function SmallChip({ icon, label, active }) {
  const [on, setOn] = useState(!!active);
  return (
    <button onClick={() => setOn(!on)} style={{
      background: on ? 'var(--ink)' : 'var(--surface-2)',
      color: on ? 'var(--bg)' : 'var(--ink-2)',
      border:'1px solid', borderColor: on ? 'var(--ink)' : 'var(--border)',
      borderRadius: 999, padding:'6px 12px', fontSize: 12,
      display:'inline-flex', alignItems:'center', gap: 6,
    }}><span style={{ filter: on ? 'none' : 'grayscale(0.5)' }}>{icon}</span>{label}</button>
  );
}

// ------------------ Public view ------------------

function PublicScreen({ dataset, onColumnClick, onExit }) {
  return (
    <div style={{ minHeight:'100vh' }}>
      <div style={{
        background:'linear-gradient(180deg, color-mix(in oklab, var(--sky) 18%, var(--bg)) 0%, var(--bg) 70%)',
        borderBottom:'1px solid var(--border)',
        padding:'18px 28px 22px',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', maxWidth: 1400, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
            <Logo />
            <span style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 999, padding:'4px 10px', fontSize: 11, fontWeight: 600, color:'var(--muted)' }}>VISTA PÚBLICA · SOLO LECTURA</span>
          </div>
          <div style={{ display:'flex', gap: 10 }}>
            <SecondaryBtn onClick={onExit}>← Volver al editor</SecondaryBtn>
            <PrimaryBtn>Descargar PDF</PrimaryBtn>
          </div>
        </div>
        <div style={{ maxWidth: 1400, margin:'0 auto', padding:'30px 0 6px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Compartido por Lucía Méndez · 21 may 2026
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(40px, 4.6vw, 64px)', fontWeight: 700, letterSpacing:'-0.03em', margin:'8px 0 0' }}>
            {dataset.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}
          </h1>
        </div>
      </div>
      <DashboardScreen dataset={dataset} onColumnClick={onColumnClick} onCompare={() => {}} onShare={() => {}} isPublic />
      <div style={{ textAlign:'center', padding:'20px', color:'var(--muted)', fontSize: 12, borderTop:'1px solid var(--border)' }}>
        Hecho con <span style={{ fontWeight: 600, color:'var(--ink-2)' }}>Excel to Sky</span> · convierte tus hojas de cálculo en dashboards
      </div>
    </div>
  );
}

Object.assign(window, {
  TopBar, Logo,
  UploadScreen, DashboardScreen, DetailScreen, CompareScreen, ShareScreen, PublicScreen,
  PrimaryBtn, SecondaryBtn,
});
