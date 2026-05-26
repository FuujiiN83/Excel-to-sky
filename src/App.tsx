import { useState } from 'react'
import { TopBar } from './components/TopBar'
import { FloatingDock } from './components/FloatingDock'
import { SAMPLE_DATASETS } from './samples'
import type { Dataset } from './types/dataset'

type RouteName = 'upload' | 'dashboard' | 'detail' | 'compare' | 'share' | 'public' | 'landing'

interface Route {
  name: RouteName
  columnKey?: string
}

export default function App(): JSX.Element {
  const [route, setRoute] = useState<Route>({ name: 'upload' })
  const [dataset] = useState<Dataset>(SAMPLE_DATASETS.personas)

  function nav(name: RouteName, extras: Partial<Route> = {}): void {
    setRoute({ name, ...extras })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <div>
      <TopBar
        current={route.name}
        onNav={(n) => nav(n as RouteName)}
        dataset={dataset}
        onShare={() => nav('share')}
      />
      <main className="p-8">
        Route: {route.name} — Dataset: {dataset.label} ({dataset.rows.length} filas)
      </main>
      <FloatingDock route={route} onNav={(n) => nav(n as RouteName)} />
    </div>
  )
}
