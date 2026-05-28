# Visual amplification — Ambiente + Datos

**Date:** 2026-05-28
**Branch:** feat/unpivot-streaming
**Status:** Approved design, pending implementation plan

## Goal

Make the dashboard visually more striking ("mucho más llamativo") while keeping
the existing "Ethereal Glass" identity: dark OLED background, hairline borders,
zero border-radius, cool accent palette. We amplify the identity rather than
break it.

This spec covers the first batch the user selected: **Ambiente + Datos** —
three additive, low-risk visual upgrades.

## Scope (in)

1. **Aurora viva** — animate the background mesh so the colored blobs drift slowly.
2. **Barras con degradado + glow + crecimiento** — richer, animated `LabeledBars`.
3. **Sparklines vivas** — gradient area fill + glowing line for `MiniSpark`.

## Scope (out — deferred, not this batch)

- Accent top-line on cards
- Accent glow on card hover
- Staggered card entrance
- Giant gradient stat numbers
- Animated quality ring
- Gradient/shimmer headings

These remain candidates for a later batch and must not be implemented here.

## Constraints

- **Accessibility:** every animation must be disabled under
  `@media (prefers-reduced-motion: reduce)`, matching the project's existing
  pattern. Static fallback must look intentional (no broken/empty state).
- **Tokens only:** use existing accent CSS variables (`--sky`, `--mint`,
  `--plum`, etc. and their `-soft` variants). No new color values.
- **Identity preserved:** keep `border-radius: 0`. No rounded corners, no
  glassmorphism blur on content surfaces.
- **Additive & reversible:** no structural/DOM changes to cards; styling and
  one CSS layer only.

## Design

### 1. Aurora viva (`src/index.css`)

The mesh is currently a static `background-image: var(--bg-mesh)` on `body`
with `background-attachment: fixed`. Three radial gradients positioned at fixed
percentages.

**Change:** move the mesh onto a dedicated fixed full-viewport layer and animate
that layer with a slow drift.

- Add `body::before`:
  - `content: ''; position: fixed; inset: -20%;` (oversized so drift never
    exposes an edge).
  - `background-image: var(--bg-mesh);`
  - `z-index: -1;` so it sits behind all content.
  - `pointer-events: none;`
  - `will-change: transform;`
  - `animation: ets-aurora 26s ease-in-out infinite alternate;`
- Remove `background-image: var(--bg-mesh)` from the `body` rule (keep the solid
  `background: var(--bg)` color so the base stays vantablack). The
  `background-attachment: fixed` line on body becomes unnecessary for the mesh.
- Keyframes `ets-aurora`: drift via a subtle `transform` (e.g. `translate3d`
  of a few percent plus a tiny `scale`), from one resting position to another.
  Keep the motion small and slow so it reads as ambient, not distracting.
- Under `prefers-reduced-motion: reduce`: set `animation: none` on `body::before`
  so the mesh is static (identical to today's look).

**Why a pseudo-element:** animating `background-position` on radial gradients
positioned with `at X% Y%` does not move the blobs the way we want; animating a
`transform` on a layer that carries the gradients does, cleanly and cheaply
(GPU-composited).

### 2. Barras con degradado + glow + crecimiento (`LabeledBars` in `src/pages/DashboardPage.tsx`)

`LabeledBars` renders a track (`rgba(255,255,255,0.04)`) with an inner fill div
whose `width` is the relative percentage and whose opacity scales with
magnitude. It is used by both the compact card preview and the hover expansion
panel.

**Changes to the fill div:**

- **Gradient fill:** replace flat `background: var(--{accent})` with
  `linear-gradient(90deg, var(--{accent}-soft), var(--{accent}))` so each bar
  reads brighter toward its end.
- **Glow:** add `box-shadow: 0 0 8px var(--{accent}-soft)` (color glow, not the
  black elevation shadow) so bars feel lit.
- **Grow-on-appear:** animate the fill in via `transform: scaleX(0) -> scaleX(1)`
  with `transform-origin: left`, ~600ms with the project's standard easing
  (`cubic-bezier(0.22, 1, 0.36, 1)` or `.32,.72,0,1`). The computed `width: pct%`
  is unchanged; only the transform animates, so the final length is exact.
- Keep the existing per-bar opacity-by-magnitude behavior.

**Animation triggering:** the grow animation runs on mount of the fill node.
Re-running it on every data/filter change is not required; animating on first
appearance is sufficient. If natural node reuse suppresses the animation on
re-render, that is acceptable for this batch.

**Reduced motion:** under `prefers-reduced-motion: reduce`, skip the scaleX
animation (bars appear at full width immediately). Gradient and glow remain.

Implementation may use a small CSS class + keyframes in `index.css` (e.g.
`.ets-bar-grow`) applied to the fill, rather than inline animation, to keep the
reduced-motion override centralized.

### 3. Sparklines vivas (`MiniSpark` in `src/components/StatCard.tsx`)

`MiniSpark` is an inline SVG with an area path (flat accent fill at 0.15 opacity)
and a stroke path. Used in: the per-card header trend sparkline, the date-card
timeline preview, and StatCards.

**Changes:**

- **Gradient area:** define an SVG `<linearGradient>` (vertical, top→bottom)
  from the accent color (~0.35 opacity at top) to transparent at the bottom, and
  use it as the area `fill` instead of the flat 0.15 fill.
- **Glowing line:** apply `filter: drop-shadow(0 0 4px var(--{accent}))` to the
  stroke path so the line emits a soft glow in its accent color.
- **Draw-on-appear (optional but in scope):** animate the stroke via
  `stroke-dasharray` / `stroke-dashoffset` so the line draws itself in on mount.
- **Unique gradient id:** use React `useId()` to generate a per-instance id for
  the `<linearGradient>` so multiple sparklines on the page don't collide on a
  shared id.

**Reduced motion:** under `prefers-reduced-motion: reduce`, skip the draw
animation (line shown fully). Gradient fill and glow remain.

**Consistency note:** because `MiniSpark` is shared, this upgrade applies
everywhere it appears — that is intended and keeps the visual language uniform.

## Files touched

- `src/index.css` — aurora layer + `ets-aurora` keyframes; optional
  `.ets-bar-grow` keyframes; reduced-motion overrides for both.
- `src/pages/DashboardPage.tsx` — `LabeledBars` fill (gradient, glow, grow).
- `src/components/StatCard.tsx` — `MiniSpark` (gradient fill, glow, draw, `useId`).

## Success criteria

- Background blobs visibly drift over ~26s; motion is subtle, not distracting.
- Bars show a gradient + glow and grow in from the left on first render.
- Sparklines show a gradient area fill and a glowing, self-drawing line.
- With `prefers-reduced-motion: reduce`, no animation runs and every surface
  looks intentional and static.
- `npm run typecheck` and `npx eslint` pass on all touched files.
- No border-radius introduced; identity unchanged.

## Risk

Low. All changes are additive styling/SVG; no data flow, routing, or DOM
structure changes. Fully reversible by reverting the three files.
