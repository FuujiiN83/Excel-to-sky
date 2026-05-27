import { useEffect, useState } from 'react'
import { TopBar } from './components/TopBar'
import { FloatingDock } from './components/FloatingDock'
import { CookieBanner } from './components/CookieBanner'
import { NetworkErrorBanner } from './components/NetworkErrorBanner'
import { ShortcutCheatsheet } from './components/ShortcutCheatsheet'
import { ChangelogModal } from './components/ChangelogModal'
import { SAMPLE_DATASETS } from './samples'
import type { Dataset } from './types/dataset'
import { UploadPage } from './pages/UploadPage'
import { DashboardPage } from './pages/DashboardPage'
import { ColumnDetailPage } from './pages/ColumnDetailPage'
import { ComparePage } from './pages/ComparePage'
import { SharePage } from './pages/SharePage'
import { PublicViewPage } from './pages/PublicViewPage'
import { LandingPage } from './pages/LandingPage'
import { FaqPage } from './pages/FaqPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { TermsPage } from './pages/TermsPage'
import { BugReportPage } from './pages/BugReportPage'
import { SettingsPage } from './pages/SettingsPage'
import { loadSharedDashboard } from './lib/shareApi'
import { saveLocalDashboard, touchLocalDashboard } from './lib/localDb'
import { isSupabaseConfigured } from './lib/supabase'
import { InsightsWorkbench } from './dev/InsightsWorkbench'
import { analyzeDataset } from './lib/insights'
import { useSettings } from './lib/SettingsContext'

type RouteName =
  | 'upload'
  | 'dashboard'
  | 'detail'
  | 'compare'
  | 'share'
  | 'public'
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

  // Detect /d/<slug> URL on mount and load the shared dashboard from Supabase.
  useEffect(() => {
    const match = /^\/d\/([A-Za-z0-9]{12})$/.exec(window.location.pathname)
    if (!match) return
    if (!isSupabaseConfigured()) {
      console.warn('Slug detectado pero Supabase no configurado')
      return
    }
    const slug = match[1]
    void loadSharedDashboard(slug)
      .then(async (ds) => {
        await saveLocalDashboard({ slug, name: ds.label, deleteToken: '', owner: 'visited' })
        await touchLocalDashboard(slug)
        setDataset(ds)
        setHasUploaded(true)
        setRoute({ name: 'public' })
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
    void analyzeDataset(dataset)
      .then((report) => {
        // eslint-disable-next-line no-console
        console.log('[insights]', report)
      })
      .catch((e: unknown) => {
        console.error('[insights] failed:', e)
      })
  }, [dataset, hasUploaded, settings.autoAnalyze])

  const isUpload = route.name === 'upload'
  const isPublic = route.name === 'public'
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
          {route.name === 'landing' && <LandingPage onNav={(n) => nav(n as RouteName)} />}
          {route.name === 'faq' && <FaqPage onNav={(n) => nav(n as RouteName)} />}
          {route.name === 'privacy' && <PrivacyPage onNav={(n) => nav(n as RouteName)} />}
          {route.name === 'terms' && <TermsPage onNav={(n) => nav(n as RouteName)} />}
          {route.name === 'report' && <BugReportPage onNav={(n) => nav(n as RouteName)} />}
          {route.name === 'settings' && <SettingsPage onNav={(n) => nav(n as RouteName)} />}
          {route.name === 'dev_insights' && <InsightsWorkbench />}
        </div>
        <CookieBanner onLearnMore={() => nav('privacy')} />
        <NetworkErrorBanner />
        <ShortcutCheatsheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <ChangelogModal />
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
            <UploadPage
              onParsed={(ds) => {
                loadDataset(ds)
                nav('dashboard')
              }}
              onUseSample={(id) => {
                const next = SAMPLE_DATASETS[id]
                if (next) {
                  loadDataset(next)
                  nav('dashboard')
                }
              }}
              hasActiveDashboard={hasUploaded}
              onReturnToDashboard={() => nav('dashboard')}
            />
          </main>
        </>
      ) : isPublic ? (
        <main id="main-content">
          <PublicViewPage
            dataset={dataset}
            onColumnClick={(c) => nav('detail', { columnKey: c.key })}
            onExit={() => nav('dashboard')}
          />
        </main>
      ) : (
        <>
          <TopBar
            current={route.name}
            onNav={(n) => nav(n as RouteName)}
            dataset={dataset}
            onShare={() => nav('share')}
          />
          <main id="main-content">
            {route.name === 'dashboard' && (
              <DashboardPage
                dataset={dataset}
                onColumnClick={(c) => nav('detail', { columnKey: c.key })}
                onCompare={() => nav('compare')}
                onShare={() => nav('share')}
              />
            )}
            {route.name === 'detail' && route.columnKey && (
              <ColumnDetailPage
                dataset={dataset}
                columnKey={route.columnKey}
                onPickColumn={(k) => nav('detail', { columnKey: k })}
                onBack={() => nav('dashboard')}
              />
            )}
            {route.name === 'compare' && (
              <ComparePage dataset={dataset} onBack={() => nav('dashboard')} />
            )}
            {route.name === 'share' && (
              <SharePage
                dataset={dataset}
                onBack={() => nav('dashboard')}
                onOpenPublic={() => nav('public')}
              />
            )}
          </main>
        </>
      )}

      {(!isUpload || hasUploaded) && (
        <FloatingDock route={route} onNav={(n) => nav(n as RouteName)} />
      )}
      <CookieBanner onLearnMore={() => nav('privacy')} />
      <NetworkErrorBanner />
      <ShortcutCheatsheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ChangelogModal />
    </div>
  )
}
