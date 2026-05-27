# 0001 — No LLM in the analysis path

- **Status:** Accepted
- **Date:** 2026-05-26

## Context

Excel to Sky's promise is twofold: (a) it turns a spreadsheet into a meaningful, narrated dashboard in seconds, and (b) it does so without sending the data anywhere. Those two promises are in tension with the most obvious approach to "narrate a spreadsheet" — handing the rows to a large language model and asking it for findings.

When we started designing the analysis engine in May 2026, we had three plausible roads:

1. **LLM-driven.** Send a summary of the dataset (or the full thing) to an LLM API. Let the model surface findings in natural language.
2. **LLM-assisted.** Compute findings statistically, then call an LLM to narrate them or to choose which to show.
3. **Statistical-only.** Compute findings via deterministic heuristics. No model anywhere in the path.

We chose option (3) for the foundational engine. Option (2) is *not* permanently ruled out, but it is deferred until the narrative renderer is built, and only if it can run on hashed/redacted summaries with explicit user consent — at which point it will get its own ADR.

## Decision

The insights engine is implemented as a pluggable registry of **deterministic statistical heuristics** that run inside a Web Worker, on the user's machine. No LLM, no inference API, no model artefact is loaded by the analysis path. The user-facing narrative copy is rendered from templates in `src/lib/insights/i18n/*` using the heuristic's structured output (`FindingData`).

## Consequences

**Pros**

- **Privacy guarantee holds end-to-end.** The data never leaves the device by default. We can publish a "your data never leaves" badge without an asterisk.
- **Zero per-call inference cost.** The product can be free or ad-supported indefinitely.
- **Deterministic output.** Two visitors of the same shared dashboard always see the same findings in the same order. This is necessary for trust and for caching.
- **Inspectable.** A heuristic is a few hundred lines of TypeScript. When it gives a wrong answer on a real dataset, we read code, not poke a prompt.
- **Offline-capable.** After the first load, analysis works without network.

**Cons**

- **The narrative voice has a ceiling.** Templates don't write themselves. The phrasing of findings is constrained to what we author; the engine cannot invent a fresh, dataset-specific opening line.
- **Domain awareness is harder.** An LLM would have known that a column called `nps` is a Net Promoter Score and adjusted thresholds accordingly. Our engine does not — domain awareness is delegated to the upcoming sub-project #2 (plug-ins).
- **Some findings types are out of reach.** Anything that requires semantic understanding of free-text columns (sentiment, topic clustering) is simply not in the engine today.

## Compliance and follow-ups

- Any new dependency that performs inference (transformers.js, ONNX models, WebGPU inference, etc.) requires either a supersession ADR or a strict justification that the model runs **fully in-browser** and that the user is informed.
- An LLM-assisted narrative layer may be proposed later under a separate ADR, but it must operate on already-computed Findings, not on raw row data.
