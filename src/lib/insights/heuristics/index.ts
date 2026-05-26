// src/lib/insights/heuristics/index.ts
import type { Heuristic } from './_base'
import { numericOutlier } from './numericOutlier'
import { categoryConcentration } from './categoryConcentration'
import { cardinalityAnomaly } from './cardinalityAnomaly'
import { missingData } from './missingData'
import { distributionShape } from './distributionShape'
import { timeDensityGap } from './timeDensityGap'
import { duplicateLookalike } from './duplicateLookalike'
import { textOutlier } from './textOutlier'
import { numericCorrelation } from './numericCorrelation'
import { groupDisparity } from './groupDisparity'
import { conditionalOutlier } from './conditionalOutlier'
import { timeByGroup } from './timeByGroup'

export const HEURISTICS: Heuristic[] = [
  numericOutlier,
  categoryConcentration,
  cardinalityAnomaly,
  missingData,
  distributionShape,
  timeDensityGap,
  duplicateLookalike,
  textOutlier,
  numericCorrelation,
  groupDisparity,
  conditionalOutlier,
  timeByGroup,
]
