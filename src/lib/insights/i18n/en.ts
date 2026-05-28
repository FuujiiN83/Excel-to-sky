// src/lib/insights/i18n/en.ts
import type { FindingData } from '../types'
import type { RenderedText } from './es'

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function render(data: FindingData, columnLabels: Record<string, string>): RenderedText {
  const lbl = (k: string): string => columnLabels[k] ?? k
  switch (data.kind) {
    case 'numeric_outlier':
      return {
        title: `${lbl(data.column)}: value ${fmt(data.value)} is ${data.zScore.toFixed(1)}σ away from the mean`,
        body: `Mean is ${fmt(data.mean)} with standard deviation ${fmt(data.stdDev)}. This row stands out from the rest.`,
        suggestion: 'Filter outliers',
      }
    case 'category_concentration':
      return {
        title: `${lbl(data.column)}: top ${data.top.length} values account for ${pct(data.coveragePct)}`,
        body: `${data.top
          .slice(0, 3)
          .map((t) => `${t.value} (${pct(t.pct)})`)
          .join(', ')}. Distribution is concentrated.`,
        suggestion: 'Group by these values',
      }
    case 'cardinality_anomaly':
      return data.reason === 'all_unique'
        ? {
            title: `${lbl(data.column)}: all ${data.total} values are unique`,
            body: 'Probably an identifier. Not useful for grouping or aggregation.',
          }
        : {
            title: `${lbl(data.column)}: a single value across ${data.total} rows`,
            body: 'This column adds no variation. Consider removing it from the analysis.',
          }
    case 'missing_data':
      return {
        title: `${lbl(data.column)}: ${pct(data.nullPct)} of rows are empty`,
        body: `${data.nullCount} empty cells. Consider cleaning before analysis.`,
      }
    case 'distribution_shape':
      return {
        title: `${lbl(data.column)}: ${describeShape(data.shape)} distribution`,
        body: shapeInsight(data.shape),
      }
    case 'time_density_gap':
      return {
        title: `${lbl(data.column)}: ${data.gapDays}-day gap with no data`,
        body: `No records between ${data.gapStart} and ${data.gapEnd}. Possible capture failure or inactive period.`,
      }
    case 'duplicate_lookalike':
      return {
        title: `${lbl(data.column)}: ${data.groups.length} group${data.groups.length === 1 ? '' : 's'} of look-alike variants`,
        body: data.groups
          .slice(0, 2)
          .map(
            (g) =>
              `"${g.canonical}" ↔ ${g.variants
                .slice(0, 3)
                .map((v) => `"${v}"`)
                .join(', ')}`,
          )
          .join('. '),
        suggestion: 'Normalise variants',
      }
    case 'text_outlier':
      return {
        title: `${lbl(data.column)}: anomalous value (${
          data.reason === 'too_long'
            ? 'too long'
            : data.reason === 'too_short'
              ? 'too short'
              : 'unusual characters'
        })`,
        body: `"${data.value.slice(0, 60)}${data.value.length > 60 ? '…' : ''}" — possible data-entry error.`,
      }
    case 'numeric_correlation': {
      const ci =
        data.ciLow !== undefined && data.ciHigh !== undefined
          ? ` (95% CI: ${data.ciLow.toFixed(2)} to ${data.ciHigh.toFixed(2)})`
          : ''
      return {
        title: `${lbl(data.columnA)} and ${lbl(data.columnB)} move ${data.r > 0 ? 'together' : 'in opposite directions'} (r = ${data.r.toFixed(2)}${ci})`,
        body:
          data.r > 0
            ? 'When one goes up, so does the other. Strong correlation.'
            : 'When one goes up, the other goes down. Strong inverse correlation.',
        suggestion: 'Cross in a scatter plot',
      }
    }
    case 'group_disparity':
      return {
        title: `${lbl(data.topGroup)} has ${data.ratio.toFixed(1)}× more ${lbl(data.metricColumn)} than ${lbl(data.bottomGroup)}`,
        body: `Mean of ${data.topValue.toFixed(1)} vs ${data.bottomValue.toFixed(1)}. Significant gap between groups.`,
        suggestion: 'Compare groups',
      }
    case 'time_by_group':
      return {
        title: `${lbl(data.metricColumn)} by ${lbl(data.groupColumn)} shows diverging trends`,
        body: data.series
          .slice(0, 3)
          .map(
            (s) =>
              `${s.group}: ${s.trend === 'rising' ? '+' : s.trend === 'falling' ? '−' : '±'}${Math.abs(s.deltaPct).toFixed(0)}%`,
          )
          .join(', '),
      }
    case 'conditional_outlier':
      return {
        title: `Inside ${lbl(data.groupColumn)}="${data.group}", ${lbl(data.column)}=${fmt(data.value)} is atypical`,
        body: `Group local mean: ${fmt(data.localMean)}. Global mean: ${fmt(data.globalMean)}.`,
      }
    case 'quality_score':
      return {
        title: `Dataset quality: ${pct(data.score)}`,
        body: `${data.cellsValid} of ${data.cellsTotal} cells valid. ${data.duplicateRows} duplicate rows.`,
      }
    case 'schema_summary':
      return {
        title: `${data.total} columns detected`,
        body: Object.entries(data.byType)
          .filter(([, n]) => n > 0)
          .map(([t, n]) => `${n} ${t}`)
          .join(' · '),
      }
    case 'temporal_coverage':
      return {
        title: `Data spanning ${data.from} to ${data.to}`,
        body: `${data.days} days covered, ~${data.densityPerDay.toFixed(1)} records per day.`,
      }
    case 'volume_context':
      return {
        title: `${fmt(data.rows)} rows × ${data.columns} columns`,
        body: `${fmt(data.cells)} cells total.`,
      }
    case 'iqr_outlier':
      return {
        title: `${lbl(data.column)}: ${fmt(data.value)} sits outside the interquartile range`,
        body: `Q1=${fmt(data.q1)}, Q3=${fmt(data.q3)} (IQR ${fmt(data.iqr)}). Value falls ${data.side === 'above' ? 'above' : 'below'} the 1.5 × IQR fence.`,
        suggestion: 'Inspect record',
      }
    case 'mad_outlier':
      return {
        title: `${lbl(data.column)}: ${fmt(data.value)} is atypical (modified z ${data.modifiedZ.toFixed(1)})`,
        body: `Median ${fmt(data.median)}, MAD ${fmt(data.mad)}. Robust detector — the outlier itself does not skew the threshold.`,
        suggestion: 'Compare with z-score',
      }
    case 'rank_correlation': {
      const method = data.method === 'spearman' ? 'Spearman ρ' : 'Kendall τ'
      return {
        title: `${lbl(data.columnA)} and ${lbl(data.columnB)} are rank-correlated (${method} = ${data.coefficient.toFixed(2)})`,
        body: `Captures monotonic — not necessarily linear — relationships across ${data.n} pairs. Useful when the link between columns curves.`,
      }
    }
    case 'effect_size': {
      const mag = data.magnitude
      return {
        title: `${lbl(data.metricColumn)} between "${data.groupA}" and "${data.groupB}" has a ${mag} effect (d=${data.d.toFixed(2)})`,
        body: `Means ${fmt(data.meanA)} vs ${fmt(data.meanB)} (n=${data.nA}/${data.nB}). Effect size discounts sample noise.`,
      }
    }
    case 'pareto':
      return {
        title: `${lbl(data.column)} follows a Pareto pattern: top 20% holds ${pct(data.share80)}`,
        body: `${data.topCount} of ${data.totalCount} records account for ${pct(data.topShare)} of the total.`,
        suggestion: 'Prioritise the head',
      }
    case 'gini':
      return {
        title: `${lbl(data.column)}: Gini index ${data.gini.toFixed(2)}`,
        body: `Top quintile holds ${pct(data.topQuintileShare)} across ${data.n} records. 0 = perfect equality, 1 = maximum inequality.`,
      }
    case 'benford':
      return {
        title: `${lbl(data.column)}: first-digit distribution drifts from Benford (χ²=${data.chiSquared.toFixed(1)})`,
        body: `Across ${data.n} values. Largest per-digit deviation: ${pct(data.maxDeviation)}. Can signal fabrication or aggressive rounding.`,
        suggestion: 'Audit records',
      }
    case 'chi_square_independence':
      return {
        title: `${lbl(data.columnA)} and ${lbl(data.columnB)} are not independent (Cramér's V ${data.cramersV.toFixed(2)})`,
        body: `χ²=${data.chiSquared.toFixed(1)} with ${data.degreesOfFreedom} degrees of freedom across ${data.n} records.`,
      }
    case 'mann_kendall_trend':
      return {
        title: `${lbl(data.metricColumn)} trends ${data.direction === 'rising' ? 'up' : data.direction === 'falling' ? 'down' : 'flat'} over time (τ=${data.tau.toFixed(2)})`,
        body: `Non-parametric Mann-Kendall test over ${data.n} points. Robust to outliers and noise.`,
      }
  }
}

function describeShape(s: string): string {
  switch (s) {
    case 'normal':
      return 'roughly normal'
    case 'bimodal':
      return 'bimodal (two peaks)'
    case 'right_skewed':
      return 'right-skewed (long upper tail)'
    case 'left_skewed':
      return 'left-skewed (long lower tail)'
    case 'uniform':
      return 'uniform'
    case 'sparse':
      return 'sparse (few unique values)'
  }
  return s
}

function shapeInsight(s: string): string {
  switch (s) {
    case 'normal':
      return 'Values cluster around the mean. Mean ≈ median.'
    case 'bimodal':
      return 'Probably two distinct populations mixed together. Consider segmenting.'
    case 'right_skewed':
      return 'A few very high values pull the mean up. Median is more representative.'
    case 'left_skewed':
      return 'A few very low values pull the mean down. Median is more representative.'
    case 'uniform':
      return 'Values are spread without a clear centre. Maybe a category disguised as a number.'
    case 'sparse':
      return 'Few unique values. Probably better treated as a category.'
  }
  return ''
}
