// src/lib/insights/heuristics/index.ts
import type { Heuristic } from './_base'
import { numericOutlier } from './numericOutlier'
import { categoryConcentration } from './categoryConcentration'

export const HEURISTICS: Heuristic[] = [
  numericOutlier,
  categoryConcentration,
]
