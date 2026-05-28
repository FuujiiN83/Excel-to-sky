# Visual Amplification (Ambiente + Datos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Exceltosky dashboard more striking within the existing dark "Ethereal Glass" identity by animating the background mesh (aurora drift), giving data bars a gradient + glow + grow-in animation, and giving sparklines a gradient fill + glowing, self-drawing line.

**Architecture:** Pure CSS + SVG, additive and reversible. Animations live as keyframes/classes in `src/index.css`; two components consume them (`LabeledBars` in `DashboardPage.tsx`, `MiniSpark` in `StatCard.tsx`). The background aurora is a single fixed pseudo-element layer. Every animation is disabled under `prefers-reduced-motion: reduce`, matching the codebase's existing pattern. Only existing accent CSS variables are used; no new colors, no border-radius, no DOM structure changes.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest (jsdom), plain CSS (no CSS-in-JS framework). Spec: `docs/superpowers/specs/2026-05-28-visual-amplify-ambiente-datos-design.md`.

**Testing note:** This project deliberately ships with manual/visual verification for UI (see `vitest.config.ts` header). Pure-CSS animation cannot be meaningfully unit-tested, so those tasks verify via `npm run typecheck`, `npx eslint`, and a manual browser check. The one piece with real logic worth pinning — `MiniSpark`'s per-instance unique gradient id — gets a genuine unit test using `react-dom/server` (already a dependency; no new packages).

---

## File Structure

- `src/index.css` — add the aurora layer (`body::before` + `ets-aurora` keyframes), the `.ets-bar-grow` class + keyframes, and the `.ets-spark-draw` class + keyframes; add reduced-motion overrides for each. Modify the `body` rule to drop the inline mesh.
- `src/pages/DashboardPage.tsx` — modify the `LabeledBars` fill `<div>` only (gradient background, glow, grow class).
- `src/components/StatCard.tsx` — modify `MiniSpark` (gradient `<defs>`, gradient area fill, glowing + drawing stroke, `useId` import).
- `src/components/StatCard.test.tsx` — new test file for the `MiniSpark` gradient-id behavior.

---

## Task 1: Aurora — animated background mesh

**Files:**

- Modify: `src/index.css` (the `body` rule near lines 15-25; the `prefers-reduced-motion` block near lines 412-439)

- [ ] **Step 1: Move the mesh off `body` onto an animated fixed layer**

In `src/index.css`, the current `body` rule is:

```css
body {
  font-family: var(--font-ui);
  background: var(--bg);
  background-image: var(--bg-mesh);
  background-attachment: fixed;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'ss01', 'cv11';
  min-height: 100vh;
}
```

Replace it with (drop `background-image` and `background-attachment` from `body`; the solid color stays):

```css
body {
  font-family: var(--font-ui);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-feature-settings: 'ss01', 'cv11';
  min-height: 100vh;
}

/* Aurora: the colored mesh lives on a fixed, oversized layer behind all
 * content so it can drift via a cheap GPU-composited transform. Animating
 * `background-position` on radial gradients positioned with `at X% Y%`
 * does not move the blobs the way we want — transforming the carrier layer
 * does. Oversized inset (-20%) guarantees no edge is ever exposed by drift. */
body::before {
  content: '';
  position: fixed;
  inset: -20%;
  z-index: -1;
  pointer-events: none;
  background-image: var(--bg-mesh);
  will-change: transform;
  animation: ets-aurora 26s ease-in-out infinite alternate;
}

@keyframes ets-aurora {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(2%, -2%, 0) scale(1.08);
  }
}
```

- [ ] **Step 2: Add the reduced-motion override**

In the existing `@media (prefers-reduced-motion: reduce)` block (the one near lines 412-439 that already pins `.ee-fade-in`, `.ee-hero-*`), add a rule that freezes the aurora layer. Find this part of that block:

```css
  .ee-hero-overlay {
    opacity: 0;
  }
  .ee-hero-dashboard {
    opacity: 1;
    filter: none;
  }
}
```

Change it to add the aurora rule before the closing brace:

```css
  .ee-hero-overlay {
    opacity: 0;
  }
  .ee-hero-dashboard {
    opacity: 1;
    filter: none;
  }
  body::before {
    animation: none;
    transform: none;
  }
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck`
Expected: PASS (no output errors). CSS changes don't affect TS, but this confirms nothing else broke.

Run: `npx eslint src/`
Expected: PASS (no errors). ESLint does not lint CSS; this just confirms no JS/TS regressions.

- [ ] **Step 4: Manual browser verification**

Start the dev server if not running: `npm run dev` (serves `http://localhost:5173/`).
Load the dashboard and watch the background for ~30s.
Expected: the colored mesh blobs drift slowly and smoothly, then ease back (alternate). No hard edges appear at the viewport borders. Content (cards, text) is unaffected and fully clickable.
Then, in DevTools, emulate reduced motion (Rendering tab → "Emulate CSS prefers-reduced-motion: reduce") and reload.
Expected: the mesh is static, looking identical to the pre-change background.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat(dashboard): animate background mesh as a slow-drifting aurora"
```

---

## Task 2: LabeledBars — gradient + glow + grow-in

**Files:**

- Modify: `src/index.css` (append a new keyframe + class near the other component animations)
- Modify: `src/pages/DashboardPage.tsx` (the `LabeledBars` fill `<div>`, currently near lines 815-822)

- [ ] **Step 1: Add the grow keyframe + class to `src/index.css`**

Append after the `.ets-card-hover` block (near line 314, before the `ee-fade-up` keyframes) — placement is not critical, but keep it with the other component animations:

```css
/* Data bars grow in from the left on first paint (#visual-amplify). The
 * fill div keeps its computed `width: pct%`; only the X scale animates, so
 * the final length is exact. transform-origin left makes it grow rightward. */
@keyframes ets-bar-grow {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
.ets-bar-grow {
  transform-origin: left center;
  animation: ets-bar-grow 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@media (prefers-reduced-motion: reduce) {
  .ets-bar-grow {
    animation: none;
    transform: none;
  }
}
```

- [ ] **Step 2: Apply gradient, glow, and grow class to the bar fill**

In `src/pages/DashboardPage.tsx`, inside `LabeledBars`, the current fill `<div>` is:

```tsx
<div
  style={{
    flex: 1,
    height: 6,
    background: 'rgba(255,255,255,0.04)',
    position: 'relative',
  }}
>
  <div
    style={{
      width: `${pct}%`,
      height: '100%',
      background: `var(--${accent})`,
      opacity: 0.55 + 0.45 * (it.count / max),
    }}
  />
</div>
```

Replace the inner fill `<div>` (leave the outer track `<div>` exactly as is):

```tsx
<div
  style={{
    flex: 1,
    height: 6,
    background: 'rgba(255,255,255,0.04)',
    position: 'relative',
  }}
>
  <div
    className="ets-bar-grow"
    style={{
      width: `${pct}%`,
      height: '100%',
      background: `linear-gradient(90deg, var(--${accent}-soft), var(--${accent}))`,
      boxShadow: `0 0 8px var(--${accent}-soft)`,
      opacity: 0.55 + 0.45 * (it.count / max),
    }}
  />
</div>
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck`
Expected: PASS.

Run: `npx eslint src/pages/DashboardPage.tsx`
Expected: PASS.

- [ ] **Step 4: Manual browser verification**

Reload `http://localhost:5173/`.
Expected: in the column cards, the category/number bars now show a left-to-right gradient (soft → solid accent) with a subtle colored glow, and they animate growing in from the left on load. Hovering a card opens the expansion panel whose bars do the same. Clicking a category bar still filters (behavior unchanged).
With reduced motion emulated: bars appear at full width instantly (no grow), but keep the gradient + glow.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/pages/DashboardPage.tsx
git commit -m "feat(dashboard): gradient + glow + grow-in animation for data bars"
```

---

## Task 3: MiniSpark — gradient fill + glowing, self-drawing line

**Files:**

- Test: `src/components/StatCard.test.tsx` (create)
- Modify: `src/index.css` (append spark-draw keyframe + class)
- Modify: `src/components/StatCard.tsx` (`MiniSpark` function near lines 147-187; add `useId` import on line 1)

- [ ] **Step 1: Write the failing test**

Create `src/components/StatCard.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { MiniSpark } from './StatCard'

describe('MiniSpark', () => {
  it('wires a gradient area fill with a unique id per instance', () => {
    const html = renderToStaticMarkup(
      <>
        <MiniSpark values={[1, 2, 3, 2]} accent="sky" />
        <MiniSpark values={[3, 2, 1, 4]} accent="mint" />
      </>,
    )

    const ids = [...html.matchAll(/<linearGradient id="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])

    // Each spark's area path must reference its own gradient by id.
    for (const id of ids) {
      expect(html).toContain(`fill="url(#${id})"`)
    }
  })

  it('renders nothing but a spacer when there are no values', () => {
    const html = renderToStaticMarkup(<MiniSpark values={[]} accent="sky" />)
    expect(html).not.toContain('<svg')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- --run src/components/StatCard.test.tsx`
Expected: FAIL on the first test — current `MiniSpark` uses a flat `fill={stroke}` with no `<linearGradient>`, so `ids` has length 0 and `toHaveLength(2)` fails. (The second test passes already.)

- [ ] **Step 3: Add the spark-draw keyframe + class to `src/index.css`**

Append after the `.ets-bar-grow` block from Task 2:

```css
/* Sparkline stroke draws itself in on first paint (#visual-amplify).
 * pathLength="1" on the stroke normalizes the geometry so the dash math is
 * always 0..1 regardless of the actual path length. */
@keyframes ets-spark-draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}
.ets-spark-draw {
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
  animation: ets-spark-draw 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@media (prefers-reduced-motion: reduce) {
  .ets-spark-draw {
    animation: none;
    stroke-dashoffset: 0;
  }
}
```

- [ ] **Step 4: Update the `MiniSpark` implementation**

In `src/components/StatCard.tsx`, change the import on line 1 from:

```tsx
import type { ReactNode } from 'react'
```

to:

```tsx
import { useId } from 'react'
import type { ReactNode } from 'react'
```

Then replace the entire `MiniSpark` function (currently lines ~153-187):

```tsx
export function MiniSpark({ values, accent = 'sky', height = 36 }: MiniSparkProps): JSX.Element {
  if (values.length === 0) {
    return <div style={{ height }} />
  }
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const w = 100
  const h = 100
  const pts = values.map((v, i) => [
    (i / Math.max(1, values.length - 1)) * w,
    h - ((v - min) / range) * h * 0.9 - 5,
  ])
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const area = `${path} L ${w} ${h} L 0 ${h} Z`
  const stroke = `var(--${accent})`
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
    >
      <path d={area} fill={stroke} opacity="0.15" />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
```

with:

```tsx
export function MiniSpark({ values, accent = 'sky', height = 36 }: MiniSparkProps): JSX.Element {
  // useId must run unconditionally (Rules of Hooks), so it precedes the
  // empty-values early return. Colons from the generated id are stripped so
  // the value is safe inside an SVG url(#...) reference.
  const gradId = `spark-${useId().replace(/:/g, '')}`
  if (values.length === 0) {
    return <div style={{ height }} />
  }
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const w = 100
  const h = 100
  const pts = values.map((v, i) => [
    (i / Math.max(1, values.length - 1)) * w,
    h - ((v - min) / range) * h * 0.9 - 5,
  ])
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const area = `${path} L ${w} ${h} L 0 ${h} Z`
  const stroke = `var(--${accent})`
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        className="ets-spark-draw"
        d={path}
        pathLength={1}
        fill="none"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 4px var(--${accent}))` }}
      />
    </svg>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test -- --run src/components/StatCard.test.tsx`
Expected: PASS — both tests green. Two `<linearGradient>` elements with distinct ids, each referenced by its area path's `fill="url(#...)"`.

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck`
Expected: PASS.

Run: `npx eslint src/components/StatCard.tsx src/components/StatCard.test.tsx`
Expected: PASS.

- [ ] **Step 7: Manual browser verification**

Reload `http://localhost:5173/`.
Expected: sparklines (the per-card header trend, the date card's timeline, and any StatCard sparkline) now show a vertical gradient area fill (accent at top fading to transparent) and a glowing accent line that draws itself in on load.
With reduced motion emulated: the line is shown fully (no draw animation); gradient fill + glow remain.

- [ ] **Step 8: Commit**

```bash
git add src/index.css src/components/StatCard.tsx src/components/StatCard.test.tsx
git commit -m "feat(dashboard): gradient fill + glowing self-drawing sparklines"
```

---

## Task 4: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test -- --run`
Expected: PASS (the `MiniSpark` tests; the project otherwise has none).

- [ ] **Step 2: Typecheck the whole project**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Lint the whole `src/` tree**

Run: `npx eslint src/`
Expected: PASS.

- [ ] **Step 4: Production build sanity check**

Run: `npm run build`
Expected: build completes without errors (`tsc -b && vite build`).

- [ ] **Step 5: Final manual pass**

With the dev server running, confirm all three effects together on the dashboard: drifting aurora background, gradient/glow/grow bars, gradient/glow/drawing sparklines. Toggle reduced-motion emulation once more and confirm everything degrades to a clean static state with no broken visuals.

---

## Self-Review

**Spec coverage:**

- Aurora viva → Task 1. ✓
- Bars gradient + glow + grow → Task 2. ✓
- Sparklines gradient fill + glow + draw + unique id → Task 3. ✓
- Reduced-motion override for every animation → Steps in Tasks 1, 2, 3. ✓
- Tokens only / no border-radius / additive → enforced in each task's code (only `var(--accent)`/`-soft`, no radius, no DOM changes). ✓
- typecheck + eslint pass → Task 4. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command shows expected output. ✓

**Type/name consistency:** Class names match between CSS and consumers — `ets-aurora`, `ets-bar-grow` (Task 2 CSS ↔ DashboardPage `className`), `ets-spark-draw` (Task 3 CSS ↔ StatCard `className`). Gradient id variable `gradId` is defined and referenced consistently in Task 3. `MiniSpark` props unchanged, so all existing call sites stay valid. ✓
