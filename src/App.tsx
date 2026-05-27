import { Suspense, lazy, useEffect, useState } from 'react'
import { TopBar } from './components/TopBar'
import { FloatingDock } from './components/FloatingDock'
import { CookieBanner } from './components/CookieBanner'
import { NetworkErrorBanner } from './components/NetworkErrorBanner'
import { ShortcutCheatsheet } from './components/ShortcutCheatsheet'
import { ChangelogModal } from './components/ChangelogModal'
import { Toaster } from './components/Toaster'
import { confirm, ConfirmModalHost } from './components/ConfirmModal'
import { Skeleton } from './components/Skeleton'
import { PrivacyBadge } from './components/PrivacyBadge'
import { NetworkAuditPanel } from './components/NetworkAuditPanel'
import { SAMPLE_DATASETS } from './samples'
import type { Dataset } from './types/dataset'
import { loadSharedDashboard } from './lib/shareApi'
import { saveLocalDashboard, touchLocalDashboard } from './lib/localDb'
import { isSupabaseConfigured } from './lib/supabase'
import { analyzeDataset } from './lib/insights'
import { useSettings } from './lib/SettingsContext'
import { runWhenIdle } from './lib/idle'

// Route-level code splitting (#176). Each page ships as its own chunk; the
// main bundle now only contains the shell + the route registration.
const UploadPage = lazy(() => import('./pages/UploadPage').then((m) => ({ default: m.UploadPage })))
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const ColumnDetailPage = lazy(() =>
  import('./pages/ColumnDetailPage').then((m) => ({ default: m.ColumnDetailPage })),
)
const ComparePage = lazy(() =>
  import('./pages/ComparePage').then((m) => ({ default: m.ComparePage })),
)
const SharePage = lazy(() => import('./pages/SharePage').then((m) => ({ default: m.SharePage })))
const PublicViewPage = lazy(() =>
  import('./pages/PublicViewPage').then((m) => ({ default: m.PublicViewPage })),
)
const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const FaqPage = lazy(() => import('./pages/FaqPage').then((m) => ({ default: m.FaqPage })))
const PrivacyPage = lazy(() =>
  import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
)
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })))
const BugReportPage = lazy(() =>
  import('./pages/BugReportPage').then((m) => ({ default: m.BugReportPage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const InsightsWorkbench = lazy(() =>
  import('./dev/InsightsWorkbench').then((m) => ({ default: m.InsightsWorkbench })),
)

function RouteFallback(): JSX.Element {
  return (
    <div style={{ padding: '64px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <Skeleton width="40%" height={28} style={{ marginBottom: 18 }} />
      <Skeleton width="70%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="60%" height={14} style={{ marginBottom: 28 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              border: '1px solid var(--border)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <Skeleton height={10} width="50%" />
            <Skeleton height={28} />
          </div>
        ))}
      </div>
    </div>
  )
}

type RouteName =
  | 'upload'
  | 'dashboard'
  | 'detail'
  | 'compare'
  | 'share'
  | 'public'
  | 'embed'
  | 'landing'
  | 'faq'
  | 'privacy'
  | 'terms'
  | 'report'
  | 'settings'
  | 'dev_insights'

interface Route {
  name: RouteName
  columnKey?: string
}

export default function App(): JSX.Element {
  const { settings } = useSettings()
  const [route, setRoute] = useState<Route>({ name: 'landing' })
  const [dataset, setDataset] = useState<Dataset>(SAMPLE_DATASETS.personas)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [hasUploaded, setHasUploaded] = useState(false)

  function nav(name: RouteName, extras: Partial<Route> = {}): void {
    setRoute({ name, ...extras })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  function loadDataset(ds: Dataset): void {
    setDataset(ds)
    setHasUploaded(true)
  }

  function updateColumn(columnKey: string, patch: Partial<Dataset['columns'][number]>): void {
    setDataset((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.key === columnKey ? { ...c, ...patch } : c)),
    }))
  }

  // Pathname-based initial route (e.g. /app, /faq, /privacy, /terms). /d/<slug>
  // is handled by the dedicated effect below.
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/app') setRoute({ name: 'upload' })
    else if (path === '/faq') setRoute({ name: 'faq' })
    else if (path === '/privacy') setRoute({ name: 'privacy' })
    else if (path === '/terms') setRoute({ name: 'terms' })
    else if (path === '/report') setRoute({ name: 'report' })
    else if (path === '/settings') setRoute({ name: 'settings' })
    else if (path === '/dev/insights') setRoute({ name: 'dev_insights' })
  }, [])

  // Detect /d/<slug> or /embed/<slug> URLs on mount and load from Supabase.
  // The embed variant strips chrome (#158) — same data, no FloatingDock /
  // PrivacyBadge / Cookie banner so it can be iframed cleanly.
  useEffect(() => {
    const path = window.location.pathname
    const slugMatch = /^\/(d|embed)\/([A-Za-z0-9]{12})$/.exec(path)
    if (!slugMatch) return
    if (!isSupabaseConfigured()) {
      console.warn('Slug detectado pero Supabase no configurado')
      return
    }
    const isEmbed = slugMatch[1] === 'embed'
    const slug = slugMatch[2]
    void loadSharedDashboard(slug)
      .then(async (ds) => {
        await saveLocalDashboard({ slug, name: ds.label, deleteToken: '', owner: 'visited' })
        await touchLocalDashboard(slug)
        setDataset(ds)
        setHasUploaded(true)
        setRoute({ name: isEmbed ? 'embed' : 'public' })
      })
      .catch((err) => {
        console.error(err)
      })
  }, [])

  // Global "?" shortcut to open the keyboard cheatsheet. Ignored while the user
  // is typing into an input / textarea / contenteditable so we don't hijack text.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key !== '?') return
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return
      e.preventDefault()
      setShortcutsOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Auto-pick first column for detail if not chosen — mirrors legacy app.jsx behaviour.
  useEffect(() => {
    if (route.name === 'detail' && !route.columnKey) {
      const firstKey = dataset.columns[0]?.key
      if (firstKey) {
        setRoute((r) => ({ ...r, columnKey: firstKey }))
      }
    }
  }, [route.name, route.columnKey, dataset])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (!hasUploaded) return
    if (!settings.autoAnalyze) return
    // Defer the heavy insights run until the browser is idle so the dashboard
    // mount completes first (#179). Up to 2 s wait before falling back to
    // running anyway so we never starve the analysis indefinitely.
    const idle = runWhenIdle(() => {
      void analyzeDataset(dataset, { locale: settings.uiLocale })
        .then((report) => {
          // eslint-disable-next-line no-console
          console.log('[insights]', report)
        })
        .catch((e: unknown) => {
          console.error('[insights] failed:', e)
        })
    }, 2000)
    return () => idle.cancel()
  }, [dataset, hasUploaded, settings.autoAnalyze, settings.uiLocale])

  const isUpload = route.name === 'upload'
  const isPublic = route.name === 'public'
  const isEmbed = route.name === 'embed'

  // Embed mode (#158) — minimal-chrome view for iframed dashboards. Skip the
  // standalone path AND every floating helper (banner, badge, toaster) so the
  // host page is responsible for its own UI.
  if (isEmbed) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <main id="main-content">
          <Suspense fallback={<RouteFallback />}>
            <PublicViewPage dataset={dataset} onColumnClick={() => {}} onExit={() => {}} />
          </Suspense>
        </main>
      </div>
    )
  }
  const isStandalone =
    route.name === 'landing' ||
    route.name === 'faq' ||
    route.name === 'privacy' ||
    route.name === 'terms' ||
    route.name === 'report' ||
    route.name === 'settings' ||
    route.name === 'dev_insights'

  if (isStandalone) {
    return (
      <div>
        <a href="#main-content" className="ets-skip-link">
          Saltar al contenido
        </a>
        <div id="main-content">
          <Suspense fallback={<RouteFallback />}>
            {route.name === 'landing' && <LandingPage onNav={(n) => nav(n as RouteName)} />}
            {route.name === 'faq' && <FaqPage onNav={(n) => nav(n as RouteName)} />}
            {route.name === 'privacy' && <PrivacyPage onNav={(n) => nav(n as RouteName)} />}
            {route.name === 'terms' && <TermsPage onNav={(n) => nav(n as RouteName)} />}
            {route.name === 'report' && <BugReportPage onNav={(n) => nav(n as RouteName)} />}
            {route.name === 'settings' && <SettingsPage onNav={(n) => nav(n as RouteName)} />}
            {route.name === 'dev_insights' && <InsightsWorkbench />}
          </Suspense>
        </div>
        <CookieBanner onLearnMore={() => nav('privacy')} />
        <NetworkErrorBanner />
        <ShortcutCheatsheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <ChangelogModal />
        <Toaster />
        <ConfirmModalHost />
      </div>
    )
  }

  return (
    <div>
      <a href="#main-content" className="ets-skip-link">
        Saltar al contenido
      </a>
      {isUpload ? (
        <>
          <TopBar current={null} onNav={() => {}} dataset={null} hideNav />
          <main id="main-content">
            <Suspense fallback={<RouteFallback />}>
              <UploadPage
                onParsed={async (ds) => {
                  // Re-upload guard (#20). If the user already has a dashboard
                  // loaded, confirm before replacing it so they don't lose the
                  // current state to a fat-fingered drop.
                  if (hasUploaded && dataset.id !== 'uploaded-empty') {
                    const ok = await confirm({
                      title: '¿Reemplazar dashboard actual?',
                      body: `Vas a sustituir "${dataset.label}" por "${ds.label}". Los filtros y la vista actual se perderán; el link compartido (si lo creaste) se mantiene.`,
                      confirmLabel: 'Reemplazar',
                      cancelLabel: 'Mantener actual',
                    })
                    if (!ok) return
                  }
                  loadDataset(ds)
                  nav('dashboard')
                }}
                onUseSample={async (id) => {
                  const next = SAMPLE_DATASETS[id]
                  if (!next) return
                  if (hasUploaded && dataset.id !== 'uploaded-empty') {
                    const ok = await confirm({
                      title: '¿Reemplazar dashboard actual?',
                      body: `Vas a sustituir "${dataset.label}" por el ejemplo "${next.label}".`,
                      confirmLabel: 'Reemplazar',
                      cancelLabel: 'Mantener actual',
                    })
                    if (!ok) return
                  }
                  loadDataset(next)
                  nav('dashboard')
                }}
                hasActiveDashboard={hasUploaded}
                onReturnToDashboard={() => nav('dashboard')}
              />
            </Suspense>
          </main>
        </>
      ) : isPublic ? (
        <main id="main-content">
          <Suspense fallback={<RouteFallback />}>
            <PublicViewPage
              dataset={dataset}
              onColumnClick={(c) => nav('detail', { columnKey: c.key })}
              onExit={() => nav('dashboard')}
            />
          </Suspense>
        </main>
      ) : (
        <>
          <TopBar
            current={route.name}
            onNav={(n) => nav(n as RouteName)}
            dataset={dataset}
            onShare={settings.localOnly ? undefined : () => nav('share')}
          />
          <main id="main-content">
            <Suspense fallback={<RouteFallback />}>
              {route.name === 'dashboard' && (
                <DashboardPage
                  dataset={dataset}
                  onColumnClick={(c) => nav('detail', { columnKey: c.key })}
                  onCompare={() => nav('compare')}
                  onShare={settings.localOnly ? () => {} : () => nav('share')}
                />
              )}
              {route.name === 'detail' && route.columnKey && (
                <ColumnDetailPage
                  dataset={dataset}
                  columnKey={route.columnKey}
                  onPickColumn={(k) => nav('detail', { columnKey: k })}
                  onBack={() => nav('dashboard')}
                  onUpdateColumn={updateColumn}
                />
              )}
              {route.name === 'compare' && (
                <ComparePage dataset={dataset} onBack={() => nav('dashboard')} />
              )}
              {route.name === 'share' && !settings.localOnly && (
                <SharePage
                  dataset={dataset}
                  onBack={() => nav('dashboard')}
                  onOpenPublic={() => nav('public')}
                />
              )}
              {route.name === 'share' && settings.localOnly && (
                <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)' }}>
                  <p style={{ fontSize: 15 }}>
                    El modo solo-local está activado. Desactívalo en{' '}
                    <button
                      type="button"
                      onClick={() => nav('settings')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--sky)',
                        cursor: 'pointer',
                        padding: 0,
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        textDecoration: 'underline',
                      }}
                    >
                      Configuración
                    </button>{' '}
                    para compartir.
                  </p>
                </div>
              )}
            </Suspense>
          </main>
        </>
      )}

      {(!isUpload || hasUploaded) && (
        <FloatingDock route={route} onNav={(n) => nav(n as RouteName)} />
      )}
      <PrivacyBadge localOnly={settings.localOnly} />
      {import.meta.env.DEV && <NetworkAuditPanel />}
      <CookieBanner onLearnMore={() => nav('privacy')} />
      <NetworkErrorBanner />
      <ShortcutCheatsheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ChangelogModal />
      <Toaster />
      <ConfirmModalHost />
    </div>
  )
}
