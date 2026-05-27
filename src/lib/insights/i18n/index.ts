// src/lib/insights/i18n/index.ts
import type { FindingData } from '../types'
import { render as renderEs, type RenderedText } from './es'
import { render as renderEn } from './en'

export type InsightsLocale = 'es' | 'en'

let active: InsightsLocale = 'es'

/** Module-level setter wired up by the worker entrypoint from AnalyzeOptions.locale. */
export function setInsightsLocale(locale: InsightsLocale): void {
  active = locale
}

export function render(data: FindingData, columnLabels: Record<string, string>): RenderedText {
  return active === 'en' ? renderEn(data, columnLabels) : renderEs(data, columnLabels)
}

export type { RenderedText }
