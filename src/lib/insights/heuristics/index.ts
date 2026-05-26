// src/lib/insights/heuristics/index.ts
import type { Heuristic } from './_base'
import { numericOutlier } from './numericOutlier'
import { categoryConcentration } from './categoryConcentration'
import { cardinalityAnomaly } from './cardinalityAnomaly'
import { missingData } from './missingData'
import { distributionShape } from './distributionShape'

export const HEURISTICS: Heuristic[] = [
  numericOutlier,
  categoryConcentration,
  cardinalityAnomaly,
  missingData,
  distributionShape,
]
