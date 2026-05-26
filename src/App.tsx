import { useEffect, useState } from 'react'
import { TopBar } from './components/TopBar'
import { FloatingDock } from './components/FloatingDock'
import { SAMPLE_DATASETS } from './samples'
import type { Dataset } from './types/dataset'
import { UploadPage } from './pages/UploadPage'
import { DashboardPage } from './pages/DashboardPage'
import { ColumnDetailPage } from './pages/ColumnDetailPage'
import { ComparePage } from './pages/ComparePage'
import { SharePage } from './pages/SharePage'
import { PublicViewPage } from './pages/PublicViewPage'

type RouteName = 'upload' | 'dashboard' | 'detail' | 'compare' | 'share' | 'public' | 'landing'

interface Route {
  name: RouteName
  columnKey?: string
}

export default function App(): JSX.Element {
  const [route, setRoute] = useState<Route>({ name: 'upload' })
  const [dataset, setDataset] = useState<Dataset>(SAMPLE_DATASETS.personas)

  function nav(name: RouteName, extras: Partial<Route> = {}): void {
    setRoute({ name, ...extras })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  // Auto-pick first column for detail if not chosen — mirrors legacy app.jsx behaviour.
  useEffect(() => {
    if (route.name === 'detail' && !route.columnKey) {
      const firstKey = dataset.columns[0]?.key
      if (firstKey) {
        setRoute((r) => ({ ...r, columnKey: firstKey }))
      }
    }
  }, [route.name, route.columnKey, dataset])

  const isUpload = route.name === 'upload'
  const isPublic = route.name === 'public'

  return (
    <div>
      {isUpload ? (
        <>
          <TopBar
            current={null}
            onNav={() => {}}
            dataset={null}
            hideNav
          />
          <UploadPage
            onParsed={(ds) => {
              setDataset(ds)
              nav('dashboard')
            }}
            onUseSample={(id) => {
              const next = SAMPLE_DATASETS[id]
              if (next) {
                setDataset(next)
                nav('dashboard')
              }
            }}
          />
        </>
      ) : isPublic ? (
        <PublicViewPage
          dataset={dataset}
          onColumnClick={(c) => nav('detail', { columnKey: c.key })}
          onExit={() => nav('dashboard')}
        />
      ) : (
        <>
          <TopBar
            current={route.name}
            onNav={(n) => nav(n as RouteName)}
            dataset={dataset}
            onShare={() => nav('share')}
          />
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
        </>
      )}

      {!isUpload && (
        <FloatingDock route={route} onNav={(n) => nav(n as RouteName)} />
      )}
    </div>
  )
}
