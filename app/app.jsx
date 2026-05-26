// Excel to Sky — app shell + router

const { useState: useS, useEffect: useE } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dataset": "personas",
  "palette": "default",
  "density": "cozy",
  "theme": "light"
}/*EDITMODE-END*/;

const PALETTES = {
  default: { sky: '#2E6BFF', mint: '#14B8A6', coral: '#FF7159', plum: '#8B5CF6', amber: '#F5B100', rose: '#EC4D7B', lime: '#84CC16' },
  candy:   { sky: '#5B8DEF', mint: '#22C7B3', coral: '#FF8FA3', plum: '#C77DFF', amber: '#FFC857', rose: '#FF6B9D', lime: '#A8E10C' },
  earth:   { sky: '#2F6F8A', mint: '#5C9E7E', coral: '#D9744A', plum: '#7A5C8E', amber: '#C99A2E', rose: '#B85068', lime: '#86A03E' },
  mono:    { sky: '#1F2937', mint: '#4B5563', coral: '#6B7280', plum: '#374151', amber: '#9CA3AF', rose: '#0F172A', lime: '#475569' },
};

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useS({ name: 'upload', columnKey: null });

  // Apply density / theme class
  useE(() => {
    document.body.classList.remove('density-compact','density-cozy','density-airy');
    document.body.classList.add(`density-${tweaks.density || 'cozy'}`);
    document.documentElement.classList.toggle('theme-dark', tweaks.theme === 'dark');
  }, [tweaks.density, tweaks.theme]);

  // Apply palette
  useE(() => {
    const p = PALETTES[tweaks.palette] || PALETTES.default;
    const root = document.documentElement.style;
    Object.entries(p).forEach(([k, v]) => root.setProperty(`--${k}`, v));
  }, [tweaks.palette]);

  const dataset = DATASETS[tweaks.dataset] || DATASETS.personas;

  function nav(name, extras = {}) {
    setRoute({ name, ...extras });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Auto-pick first column for detail if not chosen
  useE(() => {
    if (route.name === 'detail' && !route.columnKey) {
      setRoute(r => ({ ...r, columnKey: dataset.columns[0].key }));
    }
  }, [route.name, dataset]);

  const isUpload = route.name === 'upload';
  const isPublic = route.name === 'public';

  return (
    <div className={tweaks.theme === 'dark' ? 'theme-dark' : ''}>
      {isUpload ? (
        <>
          <TopBar current={null} onNav={() => {}} dataset={null} hideNav />
          <UploadScreen onLoad={(dsId) => { setTweak('dataset', dsId); nav('dashboard'); }} />
        </>
      ) : isPublic ? (
        <PublicScreen
          dataset={dataset}
          onColumnClick={(c) => nav('detail', { columnKey: c.key })}
          onExit={() => nav('dashboard')}
        />
      ) : (
        <>
          <TopBar
            current={route.name}
            onNav={(id) => nav(id)}
            dataset={dataset}
            onShare={() => nav('share')}
          />
          {route.name === 'dashboard' && (
            <DashboardScreen
              dataset={dataset}
              onColumnClick={(c) => nav('detail', { columnKey: c.key })}
              onCompare={() => nav('compare')}
              onShare={() => nav('share')}
            />
          )}
          {route.name === 'detail' && route.columnKey && (
            <DetailScreen
              dataset={dataset}
              columnKey={route.columnKey}
              onPickColumn={(k) => nav('detail', { columnKey: k })}
              onBack={() => nav('dashboard')}
            />
          )}
          {route.name === 'compare' && (
            <CompareScreen dataset={dataset} onBack={() => nav('dashboard')} />
          )}
          {route.name === 'share' && (
            <ShareScreen
              dataset={dataset}
              onBack={() => nav('dashboard')}
              onOpenPublic={() => nav('public')}
            />
          )}
        </>
      )}

      {/* Bottom dock — quick screen jump for prototype testing */}
      {!isUpload && (
        <FloatingDock route={route} onNav={nav} />
      )}

      <TweaksPanel title="Tweaks · Excel to Sky">
        <TweakSection label="Dataset" />
        <TweakSelect
          label="Excel cargado"
          value={tweaks.dataset}
          onChange={(v) => setTweak('dataset', v)}
          options={Object.values(DATASETS).map(d => ({ value: d.id, label: `${d.label} · ${d.rows.length} filas` }))}
        />

        <TweakSection label="Apariencia" />
        <TweakRadio
          label="Tema"
          value={tweaks.theme}
          onChange={(v) => setTweak('theme', v)}
          options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]}
        />
        <TweakRadio
          label="Densidad"
          value={tweaks.density}
          onChange={(v) => setTweak('density', v)}
          options={[{ value:'compact', label:'Denso'},{value:'cozy',label:'Cómodo'},{value:'airy',label:'Aireado'}]}
        />
        <TweakSelect
          label="Paleta"
          value={tweaks.palette}
          onChange={(v) => setTweak('palette', v)}
          options={[
            { value:'default', label:'Sky (default)' },
            { value:'candy',   label:'Candy' },
            { value:'earth',   label:'Tierra' },
            { value:'mono',    label:'Mono' },
          ]}
        />

        <TweakSection label="Navegar" />
        <TweakButton label="Ir a la pantalla de subida" onClick={() => nav('upload')} />
        <TweakButton label="Abrir vista pública" onClick={() => nav('public')} />
      </TweaksPanel>
    </div>
  );
}

// Small floating screen-picker so reviewers can jump quickly
function FloatingDock({ route, onNav }) {
  const items = [
    { id:'upload',    label:'Subida' },
    { id:'dashboard', label:'Dashboard' },
    { id:'detail',    label:'Detalle' },
    { id:'compare',   label:'Comparar' },
    { id:'share',     label:'Compartir' },
    { id:'public',    label:'Pública' },
  ];
  return (
    <div style={{
      position:'fixed', bottom: 18, left:'50%', transform:'translateX(-50%)',
      background:'color-mix(in oklab, var(--ink) 96%, transparent)',
      color:'var(--bg)',
      borderRadius: 999, padding: 5,
      display:'inline-flex', gap: 2, zIndex: 50,
      boxShadow:'0 18px 50px -18px rgba(0,0,0,.4)',
      backdropFilter:'blur(10px)',
    }}>
      <span style={{ padding:'6px 10px 6px 12px', fontSize: 10, fontWeight: 600, color:'color-mix(in oklab, var(--bg) 60%, transparent)', textTransform:'uppercase', letterSpacing:'0.08em', alignSelf:'center' }}>Prototipo</span>
      {items.map(it => (
        <button key={it.id} onClick={() => onNav(it.id)} style={{
          padding:'7px 12px',
          borderRadius: 999,
          border:'none',
          background: route.name === it.id ? 'var(--bg)' : 'transparent',
          color: route.name === it.id ? 'var(--ink)' : 'color-mix(in oklab, var(--bg) 80%, transparent)',
          fontSize: 12, fontWeight: 500,
          transition:'all .15s ease',
        }}>{it.label}</button>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
