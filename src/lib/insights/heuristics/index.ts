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
import { qualityScore } from './qualityScore'
import { schemaSummary } from './schemaSummary'
import { temporalCoverage } from './temporalCoverage'
import { volumeContext } from './volumeContext'
import { iqrOutlier } from './iqrOutlier'
import { madOutlier } from './madOutlier'
import { rankCorrelation } from './rankCorrelation'
import { effectSize } from './effectSize'
import { pareto } from './pareto'
import { gini } from './gini'
import { benford } from './benford'
import { chiSquareIndependence } from './chiSquareIndependence'
import { mannKendall } from './mannKendall'

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
  qualityScore,
  schemaSummary,
  temporalCoverage,
  volumeContext,
  iqrOutlier,
  madOutlier,
  rankCorrelation,
  effectSize,
  pareto,
  gini,
  benford,
  chiSquareIndependence,
  mannKendall,
]
