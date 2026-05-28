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
import { isRTL } from './i18n'

/** Removes existing theme classes and adds the one for the active theme. */
function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const cls = document.documentElement.classList
  cls.remove('theme-light', 'theme-high-contrast')
  const resolved = theme === 'system' ? resolveSystemTheme() : theme
  if (resolved === 'light') cls.add('theme-light')
  else if (resolved === 'high-contrast') cls.add('theme-high-contrast')
  // 'dark' is the default, no class needed.
}

/**
 * Resolve 'system' to the OS preference at call time. Falls back to 'dark' when
 * the platform exposes no matchMedia (older browsers, headless test runs).
 */
function resolveSystemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
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
  // For 'system', also listen to OS-level prefers-color-scheme changes so the
  // app re-themes live when the user flips their OS appearance.
  useEffect(() => {
    applyTheme(settings.theme)
    if (settings.theme !== 'system') return
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = (): void => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings.theme])

  // Pipe the locale into the stats module so every fmt* helper picks it up.
  useEffect(() => {
    setNumberLocale(settings.numberLocale)
  }, [settings.numberLocale])

  useEffect(() => {
    setDateFormat(settings.dateFormat)
  }, [settings.dateFormat])

  // Reflect the UI locale on the document so screen readers and CSS that
  // depends on :lang() / [dir] react correctly (#205). Direction switches
  // to RTL automatically when an RTL locale lands in the registry; until
  // then it stays LTR.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = settings.uiLocale
    document.documentElement.dir = isRTL(settings.uiLocale) ? 'rtl' : 'ltr'
  }, [settings.uiLocale])

  // Apply the large-text class on <html>. The actual scaling lives in index.css.
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('large-text', settings.largeText)
  }, [settings.largeText])

  // Apply the density class on <html> so the existing density-* tokens in
  // tokens.css drive the spacing variables (--pad, --gap) across the app.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const cls = document.documentElement.classList
    cls.remove('density-compact', 'density-cozy', 'density-airy')
    cls.add(`density-${settings.density}`)
  }, [settings.density])

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
