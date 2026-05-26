// Componentes visuales: gráficos y tarjetas

const ACCENTS = ['sky','mint','coral','plum','amber','rose','lime'];
function colorVar(name) { return `var(--${name})`; }
function softVar(name) { return `var(--${name}-soft)`; }

function fmtNumber(n, opts = {}) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  if (typeof n !== 'number') return String(n);
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1).replace('.0','') + 'M';
  if (Math.abs(n) >= 10000) return (n/1000).toFixed(1).replace('.0','') + 'k';
  if (Number.isInteger(n)) return n.toLocaleString('es-ES');
  return n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}
function fmtUnit(n, unit) {
  const s = fmtNumber(n);
  if (!unit) return s;
  if (unit === '€') return `${s} €`;
  return `${s} ${unit}`;
}

// -------------- Mini sparkline / bar --------------

function MiniBars({ values, color = 'sky', height = 36 }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height, width:'100%' }}>
      {values.map((v, i) => (
        <div key={i} style={{
          flex: 1,
          height: `${Math.max(8, (v / max) * 100)}%`,
          background: colorVar(color),
          borderRadius: 3,
          opacity: 0.35 + 0.65 * (v / max),
        }} />
      ))}
    </div>
  );
}

function MiniSpark({ values, color = 'sky', height = 36 }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 100, h = 100;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - ((v - min) / range) * h * 0.9 - 5,
  ]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width:'100%', height, display:'block' }}>
      <path d={area} fill={colorVar(color)} opacity="0.15" />
      <path d={path} fill="none" stroke={colorVar(color)} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function MiniDonut({ segments, color = 'sky', size = 56, thickness = 10 }) {
  const total = segments.reduce((a, b) => a + b.count, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const palette = ['sky','mint','coral','plum','amber','rose','lime'];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, display:'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={thickness} />
      {segments.map((s, i) => {
        const len = (s.count / total) * c;
        const el = (
          <circle key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={colorVar(palette[i % palette.length])}
            strokeWidth={thickness}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            strokeLinecap="butt"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

// -------------- Full charts --------------

function Histogram({ analysis, color = 'sky' }) {
  const max = Math.max(...analysis.histogram.map(b => b.count), 1);
  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:6, height: 220, padding: '0 0 8px' }}>
        {analysis.histogram.map((b, i) => (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)' }}>{b.count}</div>
            <div style={{
              width:'100%',
              height: `${Math.max(2, (b.count / max) * 100)}%`,
              background: `linear-gradient(180deg, ${colorVar(color)}, color-mix(in oklab, ${colorVar(color)} 70%, white))`,
              borderRadius: '6px 6px 2px 2px',
              transition: 'height .4s cubic-bezier(.2,.8,.2,1)',
            }} />
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)', paddingTop:4, borderTop:'1px dashed var(--border)' }}>
        <span>{fmtUnit(analysis.min, analysis.col.unit)}</span>
        <span>{fmtUnit(Math.round(analysis.mean), analysis.col.unit)}</span>
        <span>{fmtUnit(analysis.max, analysis.col.unit)}</span>
      </div>
    </div>
  );
}

function HorizontalBars({ items, color = 'sky', max, showCount = true }) {
  const mx = max || Math.max(...items.map(i => i.count), 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display:'grid', gridTemplateColumns:'120px 1fr 48px', gap:12, alignItems:'center' }}>
          <div style={{ fontSize:13, color:'var(--ink-2)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.key}</div>
          <div style={{ position:'relative', height:22, background:'var(--surface-2)', borderRadius:6, overflow:'hidden' }}>
            <div style={{
              position:'absolute', inset:0, width: `${(it.count / mx) * 100}%`,
              background: `linear-gradient(90deg, ${colorVar(color)}, color-mix(in oklab, ${colorVar(color)} 50%, white))`,
              borderRadius:6,
              transition:'width .5s cubic-bezier(.2,.8,.2,1)',
            }} />
          </div>
          {showCount && <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--ink-2)', textAlign:'right' }}>{fmtNumber(it.count)}</div>}
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, color = 'sky', height = 200 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const w = 600;
  const pts = data.map((d, i) => [
    (i / Math.max(1, data.length - 1)) * w,
    height - (d.count / max) * (height - 30) - 18,
  ]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${path} L ${w} ${height} L 0 ${height} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width:'100%', height, display:'block' }}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colorVar(color)} stopOpacity="0.30" />
            <stop offset="100%" stopColor={colorVar(color)} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[0.25, 0.5, 0.75].map((p, i) => (
          <line key={i} x1="0" x2={w} y1={height * p} y2={height * p} stroke="var(--border)" strokeDasharray="2 4" />
        ))}
        <path d={area} fill={`url(#grad-${color})`} />
        <path d={path} fill="none" stroke={colorVar(color)} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="var(--surface)" stroke={colorVar(color)} strokeWidth="2" />
        ))}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontFamily:'var(--font-mono)', fontSize:10, color:'var(--muted)' }}>
        {data.map((d, i) => <span key={i}>{d.key}</span>)}
      </div>
    </div>
  );
}

function Donut({ items, size = 200, thickness = 32 }) {
  const total = items.reduce((a, b) => a + b.count, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const palette = ['sky','mint','coral','plum','amber','rose','lime'];
  return (
    <div style={{ display:'flex', alignItems:'center', gap:24 }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, display:'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={thickness} />
        {items.map((s, i) => {
          const len = (s.count / total) * c;
          const el = (
            <circle key={i}
              cx={size/2} cy={size/2} r={r}
              fill="none"
              stroke={colorVar(palette[i % palette.length])}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size/2} ${size/2})`}
            />
          );
          offset += len;
          return el;
        })}
        <text x={size/2} y={size/2 - 4} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="28" fill="var(--ink)">{total}</text>
        <text x={size/2} y={size/2 + 16} textAnchor="middle" fontSize="11" fill="var(--muted)">total</text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {items.map((s, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
            <span style={{ width:10, height:10, borderRadius:3, background: colorVar(palette[i % palette.length]) }} />
            <span style={{ color:'var(--ink-2)', minWidth:90 }}>{s.key}</span>
            <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)', fontSize:12 }}>
              {Math.round((s.count / total) * 100)}% · {s.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// World/Iberia stylised map with dots
function MapView({ items, color = 'sky', mode = 'world', maxCount }) {
  const mx = maxCount || Math.max(...items.map(i => i.count), 1);
  return (
    <div style={{ position:'relative', width:'100%', aspectRatio: mode === 'world' ? '2 / 1' : '1 / 1', background: 'var(--surface-2)', borderRadius: 18, overflow:'hidden', border:'1px solid var(--border)' }}>
      {/* dotted backdrop */}
      <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
        <defs>
          <pattern id="dots" x="0" y="0" width="2.2" height="2.2" patternUnits="userSpaceOnUse">
            <circle cx="1.1" cy="1.1" r="0.35" fill="var(--border-strong)" opacity="0.55" />
          </pattern>
          {/* extremely rough continent shapes — just enough to feel like a map */}
          <mask id="land">
            <rect width="200" height="100" fill="black" />
            {/* North America */}
            <path d="M10 22 Q 20 14 38 16 L 58 22 L 64 36 L 56 50 L 40 56 L 26 50 L 14 38 Z" fill="white" />
            {/* South America */}
            <path d="M48 56 L 58 56 L 64 72 L 56 88 L 46 92 L 42 78 Z" fill="white" />
            {/* Europe */}
            <path d="M88 22 L 110 18 L 122 26 L 118 36 L 104 40 L 92 34 Z" fill="white" />
            {/* Africa */}
            <path d="M96 40 L 118 38 L 126 56 L 120 76 L 108 82 L 98 70 L 92 54 Z" fill="white" />
            {/* Asia */}
            <path d="M120 18 L 168 18 L 184 30 L 184 48 L 168 56 L 152 50 L 134 42 L 124 32 Z" fill="white" />
            {/* Oceania */}
            <path d="M162 70 L 180 68 L 186 78 L 176 86 L 164 82 Z" fill="white" />
          </mask>
        </defs>
        <rect width="200" height="100" fill="var(--surface-2)" />
        <g mask="url(#land)">
          <rect width="200" height="100" fill="url(#dots)" />
        </g>
      </svg>
      {/* dots */}
      {items.map((it, i) => {
        const g = GEO[it.key];
        if (!g) return null;
        const sz = 12 + (it.count / mx) * 52;
        return (
          <div key={i} style={{
            position:'absolute',
            left: `${g.x * 100}%`,
            top:  `${g.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            display:'flex', alignItems:'center', gap:6,
          }}>
            <div style={{
              width: sz, height: sz, borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, color-mix(in oklab, ${colorVar(color)} 80%, white), ${colorVar(color)})`,
              boxShadow: `0 0 0 4px color-mix(in oklab, ${colorVar(color)} 25%, transparent), 0 6px 16px -4px ${colorVar(color)}`,
              opacity: 0.9,
            }} />
            <div style={{
              background:'var(--surface)',
              border:'1px solid var(--border)',
              borderRadius: 999,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ink-2)',
              boxShadow: 'var(--shadow-sm)',
              whiteSpace:'nowrap',
            }}>{it.key} · <span style={{ fontFamily:'var(--font-mono)', color:'var(--muted)' }}>{it.count}</span></div>
          </div>
        );
      })}
    </div>
  );
}

// -------------- Stat cards --------------

function GiantStat({ label, value, sub, color = 'sky', icon, accent = false }) {
  return (
    <div style={{
      background: accent ? softVar(color) : 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--pad-lg)',
      display:'flex', flexDirection:'column', gap: 6,
      position:'relative', overflow:'hidden',
      minHeight: 138,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {icon && <div style={{
          width:22, height:22, borderRadius:6,
          background: colorVar(color),
          display:'grid', placeItems:'center', color:'white', fontSize:12, fontWeight:700,
        }}>{icon}</div>}
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
      </div>
      <div style={{
        fontFamily:'var(--font-display)',
        fontSize: 'clamp(40px, 4.4vw, 64px)',
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '-0.03em',
        color: 'var(--ink)',
        marginTop: 'auto',
        wordBreak: 'break-word',
      }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color:'var(--muted)' }}>{sub}</div>}
    </div>
  );
}

Object.assign(window, {
  ACCENTS, colorVar, softVar, fmtNumber, fmtUnit,
  MiniBars, MiniSpark, MiniDonut,
  Histogram, HorizontalBars, LineChart, Donut, MapView,
  GiantStat,
});
