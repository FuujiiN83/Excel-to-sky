import { useSettings } from '../SettingsContext'
import { lookup, type Dictionary } from './index'

/**
 * Returns a translator function bound to the user's active UI locale.
 *
 *   const t = useT()
 *   <span>{t('topbar.share')}</span>
 *
 * Falls back to the Spanish string if a key isn't translated for the active
 * locale, and to the literal key as a last resort, so a missing translation
 * is never a runtime error.
 */
export function useT(): (key: keyof Dictionary) => string {
  const { settings } = useSettings()
  return (key: keyof Dictionary): string => lookup(settings.uiLocale, key)
}
