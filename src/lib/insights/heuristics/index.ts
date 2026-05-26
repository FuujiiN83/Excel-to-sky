// src/lib/insights/heuristics/index.ts
import type { Heuristic } from './_base'
import { numericOutlier } from './numericOutlier'

export const HEURISTICS: Heuristic[] = [
  numericOutlier,
]
