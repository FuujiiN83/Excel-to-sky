# Contributing to Excel to Sky

Thanks for taking the time to look under the hood. This is a small, opinionated codebase — these notes will save you from guessing.

## What this project is (and isn't)

Excel to Sky is a privacy-first, local-only spreadsheet → dashboard tool that aims to grow into a narrative scrollytelling engine. The README has the long pitch and the [ARCHITECTURE.md](./ARCHITECTURE.md) has the technical map. Two ground rules worth knowing before you open a PR:

- **No LLM in the analysis path.** All insights come from deterministic statistical heuristics. See [`docs/adr/0001-no-llm.md`](./docs/adr/0001-no-llm.md).
- **Datasets never leave the browser without explicit user action.** If a change ends up sending row data to a server outside the explicit "Share" flow, it will be rejected on review.

## Setting up the dev environment

Prerequisites:

- Node.js ≥ 20 LTS
- npm ≥ 10 (bundled with Node)
- A modern browser (Chrome / Edge / Firefox / Safari latest)

```bash
git clone git@github.com:FuujiiN83/Excel-to-sky.git
cd Excel-to-sky
npm install
npm run dev          # http://localhost:5173
```

Optional — to exercise the public-share flow you need a Supabase project:

1. Copy `.env.example` to `.env.local`.
2. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with your own project credentials.
3. Apply migrations from `supabase/migrations/` and deploy the edge functions in `supabase/functions/`.

Without `.env.local` the app still works fully — the "Share" UI just stays disabled.

### Common commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on `http://localhost:5173`. |
| `npm run build` | Type-check (`tsc -b`) and produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally on `:5173`. |
| `npm run lint` | Type-check with `tsc --noEmit` (no separate linter step yet). |
| `npm run test` | Run unit tests via Vitest. The suite is small — see the [testing decision in ARCHITECTURE.md](./ARCHITECTURE.md). |

### Developer-only routes

- `/dev/insights` — interactive workbench to run the insights engine against three bundled sample datasets and inspect the ranked findings.

## Project layout

A short overview is in the README under *Repository layout*. The deeper map (data flow, module boundaries, why a worker) lives in [ARCHITECTURE.md](./ARCHITECTURE.md). If you are adding a new statistical heuristic, read [`src/lib/insights/README.md`](./src/lib/insights/README.md) first — there is a concrete checklist there.

## Branching and commits

- **`main`** is the only long-lived branch. We do not maintain release branches yet.
- **Feature branches:** prefix with the change kind, then a short kebab-case description.
  - `feat/<scope>-<short-description>` — new feature
  - `fix/<scope>-<short-description>` — bug fix
  - `chore/<scope>-<short-description>` — tooling, refactor with no behaviour change, docs
  - Examples: `feat/landing-quick-wins`, `fix/parser-bom-handling`, `chore/docs-foundation`.
- **Commit messages:** Conventional Commits, with the scope being the affected area.
  - `feat(insights): add temporal coverage finding`
  - `fix(parser): handle BOM in CSV files`
  - `chore(docs): add ADR for the no-LLM decision`
- Reference issues in the body, not the subject. If a PR closes one or more issues, list them in the PR description with `Closes #123`.

## Pull requests

1. Open the branch against `main` once your work is at a reviewable state — small PRs are easier than big ones.
2. The PR description should answer three questions:
   - **What does this change?** (one or two sentences, not a diff summary)
   - **Why?** (the problem you are solving)
   - **How do I verify it?** (commands run, manual steps if it is a UI change)
3. Include a checklist of:
   - [ ] `npm run build` is green
   - [ ] manual smoke-test of the affected pages or flows
   - [ ] UI changes are accessible (keyboard reachable, contrast OK, screen-reader labels)
4. PR titles follow the same Conventional Commits style as commits: `feat(area): summary`.
5. Squash-merge by default unless the branch contains genuinely independent commits worth preserving.

## Code style

- **TypeScript first.** Explicit return types on exported functions, interfaces for component props, no `any` in application code — see the wider project rules in `~/.claude/rules/typescript/` if you also use Claude Code, or [TypeScript's own style guidance](https://google.github.io/styleguide/tsguide.html) otherwise.
- **No CSS frameworks at the component level.** We use Tailwind utility classes for layout primitives and inline `style={{}}` for component-specific styling. Don't introduce styled-components, emotion, or CSS Modules without a strong reason.
- **No chart libraries.** All charts are hand-rolled SVG. If you need a new chart type, add it to `src/components/Chart*.tsx` following the existing patterns.
- **Immutability.** Build new objects with the spread operator; do not mutate state in place. See [`docs/adr/0003-statistical-only-pipeline.md`](./docs/adr/) for the broader determinism rationale.
- **Workers for anything heavy.** Parsing and analysis both run in Web Workers. If you add a CPU-bound operation that takes more than ~50 ms, it should run in a worker too.

## Reporting issues

Use the GitHub issue tracker. Label your issue with the relevant area (`parser`, `dashboard`, `insights`, `landing`, `privacy`, `docs`, …) and include:

- What you tried to do
- What you expected to happen
- What actually happened (with a screenshot or recording if visual)
- Browser + OS + your build (commit SHA or version)

For security-sensitive issues (e.g. you found a way to leak another user's dashboard), **do not open a public issue.** Email the contact in the README instead.

## License

The repository is published for transparency but does not have a permissive license at the moment. Treat any contribution as proposed under the same terms — drop a note in the PR if you want to discuss it.
