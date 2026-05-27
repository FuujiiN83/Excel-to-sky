import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_SETTINGS,
  loadSettings,
  resetSettings as resetPersisted,
  saveSettings,
  type Settings,
} from './settings'

interface SettingsContextValue {
  settings: Settings
  ready: boolean
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  reset: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

interface ProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: ProviderProps): JSX.Element {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void loadSettings().then((loaded) => {
      if (cancelled) return
      setSettings(loaded)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      ready,
      update(key, val) {
        setSettings((prev) => {
          const next = { ...prev, [key]: val }
          void saveSettings(next)
          return next
        })
      },
      async reset() {
        const fresh = await resetPersisted()
        setSettings(fresh)
      },
    }),
    [settings, ready],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}
