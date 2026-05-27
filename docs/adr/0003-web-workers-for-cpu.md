# 0003 — Web Workers for parsing and analysis

- **Status:** Accepted
- **Date:** 2026-05-26

## Context

Two stages of the pipeline are CPU-bound on real spreadsheets:

- **Parsing.** SheetJS reading an `.xlsx` file with 10⁴ rows and 30 columns can spend 300–800 ms turning bytes into a typed Dataset.
- **Insights analysis.** Running 16 heuristics over the same dataset spends 100–400 ms doing matrix-shaped passes (histograms, correlations, group aggregations).

Both stages happen in response to user input ("drop a file" → upload, "open a dashboard" → analyse). If they run on the main thread, every animation in flight stutters: the dashboard reveal in the hero, the floating dock entrance, the upload page's progress bar, scroll. On low-end laptops the freeze is visible to the user.

We had three options:

1. **Run on the main thread and rely on requestIdleCallback / time-slicing.** Cheap, but unpredictable — long tasks can't always be sliced cleanly, especially in third-party code like SheetJS.
2. **Run on a Web Worker, spawned per call.** Pay for one `structuredClone` of the input and one of the output, gain back the main thread immediately.
3. **Run on a SharedWorker.** Strictly more complex, with the tab-coordination surface that we don't need.

## Decision

Parsing and insights analysis each run in their own dedicated Web Worker:

- `src/workers/parser.worker.ts` for spreadsheet parsing.
- `src/lib/insights/worker.ts` for the analysis pipeline.

Both are spawned ad-hoc with `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`, receive a single request via `postMessage`, return a single response, and are then terminated. There is no long-lived worker pool, no shared worker.

## Consequences

**Pros**

- **The UI never blocks.** Hero animation, page transitions and dock interactions stay smooth while a 5 MB Excel is being parsed.
- **Clean termination semantics.** When the user cancels (e.g. `AbortSignal`), we call `worker.terminate()` and the JS engine reclaims the memory. No half-finished computation lingering.
- **Mental model is simple.** Pages call an async function from `lib/`; the worker boundary is invisible to the UI layer.
- **Future bundle splitting comes for free.** Vite emits the worker as a separate chunk; the main bundle does not pay for SheetJS until a file is dropped.

**Cons**

- **`structuredClone` is not free.** Sending a 500 k-cell Dataset between threads has a measurable cost. So far it has been dominated by parsing time itself, but we should profile if the cost ratio inverts.
- **Workers cannot use the DOM.** Anything that ends up touching the DOM (rendering progress, drawing intermediate states) has to be communicated back via messages. We already do this — workers post structured updates, the page renders.
- **Each spawn has a startup cost.** Roughly 5–15 ms. Negligible vs the work they do, but it adds up if we ever needed sub-50 ms response times (we don't).

## Compliance and follow-ups

- **Any new CPU operation that exceeds ~50 ms on production data should be written as a Web Worker.** The two existing workers are short — copy the pattern.
- **Do not introduce a worker pool yet.** Premature. Revisit if we start spawning more than ~1 worker per user gesture.
- **Profile, do not assume.** If you suspect the message-passing cost is dominant, add timing logs around `postMessage` and the response handler. Currently both stages spend >95% of their time inside the worker.
