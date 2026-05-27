# `src/lib/insights` — Statistical insights engine

The insights engine produces an `InsightReport` from a `Dataset`. The report ranks up to ~16 different kinds of findings (outliers, correlations, group disparities, distribution shapes, temporal gaps, quality scores, …) computed entirely with deterministic statistics inside a Web Worker. **No LLM, no network, no model.** See [`docs/adr/0001-no-llm.md`](../../../docs/adr/0001-no-llm.md) for the rationale.

## Public API

The whole module is reached via [`./index.ts`](./index.ts):

```ts
import { analyzeDataset } from './lib/insights'
import type { InsightReport, AnalyzeOptions } from './lib/insights'

const report: InsightReport = await analyzeDataset(dataset, {
  maxFindings: 30,
  minScore: 0.2,
  locale: 'es',
  signal: abortController.signal,
})
```

`analyzeDataset` spawns the worker, awaits the single response, and terminates it. If `signal` is aborted mid-flight, the worker is terminated and the call rejects with a `DOMException('Analysis aborted')`. If `Worker` is not available (server-side, very old browser), it falls back to running the same pipeline synchronously on the calling thread.

The shape of the result, defined in [`types.ts`](./types.ts):

```ts
interface InsightReport {
  summary: DatasetSummary // top-level metadata about the dataset
  findings: Finding[] // ranked, deduped, capped by maxFindings
  byColumn: Record<string, Finding[]>
  byType: Record<FindingType, Finding[]>
  runtimeMs: number
  degraded?: boolean // true when the runner had to skip work to stay within budget
}
```

## File layout

```
src/lib/insights/
├── index.ts             # public entry: analyzeDataset()
├── worker.ts            # worker side: receives Dataset, returns InsightReport
├── runner.ts            # pure orchestration: builds summary, iterates heuristics, scores
├── scoring.ts           # converts raw findings into ranked, severity-tagged ones
├── context.ts           # shared analysis state (caches, RNG seed, locale)
├── summary.ts           # builds the DatasetSummary upfront
├── hash.ts              # stable id helper used by every finding
├── types.ts             # Finding, FindingData, FindingType, DatasetSummary, …
├── i18n/
│   └── es.ts            # template → rendered title/body/suggestion per FindingType
└── heuristics/
    ├── _base.ts         # Heuristic interface + makeFinding/columnLabels helpers
    ├── index.ts         # HEURISTICS registry
    ├── numericOutlier.ts
    ├── categoryConcentration.ts
    ├── …                # 14 more, one per FindingType
```

The runner imports `HEURISTICS` from `./heuristics/index.ts` and calls each one. Order of registration is _not_ the order they are surfaced — the scoring stage re-ranks everything.

## The `Heuristic` interface

Every detector exports a single object that matches:

```ts
export interface Heuristic {
  type: FindingType
  applies(dataset: Dataset, summary: DatasetSummary): boolean
  detect(dataset: Dataset, summary: DatasetSummary, ctx: AnalysisContext): Finding[]
}
```

- `type` — the discriminant used by the i18n layer and by `byType`. Must be a member of the `FindingType` string union in `types.ts`.
- `applies` — fast filter. Return `false` to skip cheaply (e.g. "I need numeric columns and there are none"). Should not do significant work.
- `detect` — returns zero or more `Finding`s. Use `makeFinding(...)` from `_base.ts` so the id, title, body and suggestion are produced consistently (id = stable hash, copy = rendered from the i18n template).

A heuristic is **pure**: it takes a Dataset + Summary + Context and returns Findings. It does not mutate inputs, does not perform I/O, does not call across the worker boundary.

## How to add a new heuristic

Concrete steps to go from "I have an idea for a new finding" to "merged":

1. **Pick a `FindingType` name.** Add a new variant to the union in [`types.ts`](./types.ts), e.g. `'currency_outlier'`.
2. **Define its `FindingData` payload.** Add a `| { kind: 'currency_outlier'; … }` arm to the `FindingData` union in [`types.ts`](./types.ts). Use the simplest typed shape that lets a UI render the finding without recomputing anything.
3. **Add an i18n template.** Edit [`i18n/es.ts`](./i18n/es.ts) and add a case for the new `kind` that returns `{ title, body, suggestion? }`. Use the column-label map to refer to columns by their human-friendly name, not their key.
4. **Create the heuristic file.** Add `heuristics/currencyOutlier.ts`. Use [`heuristics/missingData.ts`](./heuristics/missingData.ts) as the cleanest template — it is short, has the right imports, and demonstrates `applies`, `detect`, `makeFinding` and `recordRefs`. Tune the thresholds against the bundled sample datasets in `/dev/insights`.
5. **Register it.** Import and append your heuristic into the `HEURISTICS` array in [`heuristics/index.ts`](./heuristics/index.ts). The array is the registry — there is no auto-discovery on purpose.
6. **Verify via the workbench.** Run `npm run dev` and open `/dev/insights`. The page runs every heuristic over three sample datasets and prints the ranked findings. You should see your finding for the cases where it applies, and not see it for the cases where it doesn't.
7. **Commit.** Use the scope `insights`: `feat(insights): add currency outlier heuristic`.

That's it. There is no scoring tweak to do — the scoring stage uses the structured payload to compute severity automatically. If your finding needs a custom scoring rule, that becomes a separate PR against [`scoring.ts`](./scoring.ts).

## Performance budget

The whole pipeline (parsing finished → report ready) targets:

- **≤ 200 ms** for 1 k rows × 20 columns
- **≤ 800 ms** for 10 k rows × 30 columns
- **≤ 2 500 ms** for 50 k rows × 50 columns (degraded mode acceptable)

A single heuristic that needs more than 100 ms on a 10 k-row dataset is a smell — split it, cache via `AnalysisContext`, or move to a less expensive algorithm. Two heuristics already share a histogram cache stored in `ctx` to avoid redundant binning passes; copy that pattern if you need it.

## What lives outside this module

- **Rendering.** This module returns structured `Finding`s. Drawing them is the responsibility of `src/pages/*` and `src/components/*`.
- **Parsing.** Done by `src/lib/parser.ts` + `src/workers/parser.worker.ts`. By the time the engine sees a Dataset, types are already inferred.
- **Storage.** This module is pure — it never persists. Caching of reports (if ever needed) belongs in the calling page or in `localDb.ts`.

## Where to read next

- [`../../../ARCHITECTURE.md`](../../../ARCHITECTURE.md) for the bigger picture.
- [`../../../docs/adr/0001-no-llm.md`](../../../docs/adr/0001-no-llm.md) for why this engine looks the way it does.
- [`../../types/dataset.ts`](../../types/dataset.ts) for the `Dataset`, `Column` and `CellValue` types every heuristic consumes.
