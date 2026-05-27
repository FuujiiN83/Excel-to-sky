import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_SETTINGS,
  loadSettings,
  resetSettings as resetPersisted,
  saveSettings,
  type Settings,
  type Theme,
} from './settings'
import { setDateFormat, setNumberLocale } from './stats'

/** Removes existing theme classes and adds the one for the active theme. */
function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const cls = document.documentElement.classList
  cls.remove('theme-light', 'theme-high-contrast')
  if (theme === 'light') cls.add('theme-light')
  else if (theme === 'high-contrast') cls.add('theme-high-contrast')
  // 'dark' is the default, no class needed.
}

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

  // Apply theme imperatively whenever it changes (after load + on every update).
  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  // Pipe the locale into the stats module so every fmt* helper picks it up.
  useEffect(() => {
    setNumberLocale(settings.numberLocale)
  }, [settings.numberLocale])

  useEffect(() => {
    setDateFormat(settings.dateFormat)
  }, [settings.dateFormat])

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
