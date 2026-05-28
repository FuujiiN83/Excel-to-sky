/**
 * Lightweight i18n for the UI shell. The insights engine has its own per-language
 * template files under src/lib/insights/i18n/ — this module only covers the
 * static interface strings (nav, buttons, page copy).
 *
 * Each Locale ships as its own dictionary; missing keys fall through to the
 * Spanish base so an incomplete translation never crashes a render.
 */

import { es } from './es'
import { en } from './en'
import { fr } from './fr'
import { de } from './de'
import { pt } from './pt'
import { it } from './it'

export type UiLocale = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'it'

export const UI_LOCALES: ReadonlyArray<{ code: UiLocale; label: string }> = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
]

/**
 * Right-to-left locales (#205). Currently empty — Excel to Sky doesn't ship
 * Arabic or Hebrew translations yet, but the helper is wired so the shell
 * applies `dir="rtl"` on the html element as soon as one lands. Other UI
 * code (TopBar, Footer) is already direction-agnostic via flexbox + logical
 * properties so the only switch needed is the html attribute.
 */
export const RTL_LOCALES: ReadonlySet<UiLocale> = new Set([])

export function isRTL(locale: UiLocale): boolean {
  return RTL_LOCALES.has(locale)
}

/**
 * The set of translation keys we currently care about. Add a key here when
 * a new piece of UI starts going through useT — TypeScript will then require
 * every locale dictionary to provide it.
 */
export interface Dictionary {
  // TopBar
  'topbar.share': string
  'topbar.nav.dashboard': string
  'topbar.nav.compare': string
  'topbar.nav.columns': string
  'topbar.nav.share': string
  // Footer
  'footer.col.product': string
  'footer.col.legal': string
  'footer.col.contact': string
  'footer.link.app': string
  'footer.link.faq': string
  'footer.link.settings': string
  'footer.link.privacy': string
  'footer.link.terms': string
  'footer.link.email': string
  'footer.link.github': string
  'footer.link.bug': string
  'footer.madeIn': string
  // Common buttons
  'common.cancel': string
  'common.confirm': string
  'common.gotIt': string
  'common.openApp': string
  'common.close': string
}

const DICTS: Record<UiLocale, Dictionary> = { es, en, fr, de, pt, it }

export function lookup(locale: UiLocale, key: keyof Dictionary): string {
  return DICTS[locale][key] ?? DICTS.es[key] ?? String(key)
}
