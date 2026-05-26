# Excel to Sky Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable PWA that parses Excel files into shareable dashboards, monetized with AdSense, backed by Supabase, hosted on a Hostinger VPS.

**Architecture:** Vite + React 18 + TypeScript SPA, Tailwind for styling. Excel parsing runs in a Web Worker (SheetJS). Local dashboard index in IndexedDB (`idb`). Sharing via Supabase Postgres (RLS-protected, written through Deno Edge Functions, read through a `SECURITY DEFINER` RPC). Static hosting on nginx behind Certbot TLS.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind 3, SheetJS (xlsx), idb 8, @supabase/supabase-js 2, Vitest, Playwright, nanoid.

**Spec:** `docs/superpowers/specs/2026-05-26-excel-to-sky-design.md`

---

## File structure (target)

```
src/
├── main.tsx                  # entry
├── App.tsx                   # router shell
├── routes.tsx                # route table
├── pages/                    # one component per screen
│   ├── UploadPage.tsx
│   ├── DashboardPage.tsx
│   ├── ColumnDetailPage.tsx
│   ├── ComparePage.tsx
│   ├── SharePage.tsx
│   ├── PublicViewPage.tsx
│   └── LandingPage.tsx       # SEO + AdSense content
├── components/
│   ├── TopBar.tsx
│   ├── StatCard.tsx
│   ├── ChartLine.tsx
│   ├── ChartBar.tsx
│   ├── ChartScatter.tsx
│   ├── ChartMap.tsx
│   ├── UploadDropzone.tsx
│   ├── ColumnTypeBadge.tsx
│   └── ShareModal.tsx
├── lib/
│   ├── supabase.ts           # client init
│   ├── localDb.ts            # idb wrapper
│   ├── shareApi.ts           # Edge Function client
│   ├── typeDetection.ts      # column type heuristic
│   ├── stats.ts              # MAX/MIN/MODA/MEDIA
│   └── adsense.ts            # AdSense init helper
├── workers/
│   └── parser.worker.ts      # SheetJS in worker
├── types/
│   ├── dataset.ts            # Dataset, Column, ColumnType
│   └── api.ts                # API request/response shapes
├── samples/
│   ├── personas.ts
│   ├── viajes.ts
│   └── ventas.ts
└── styles/
    └── tokens.css            # design tokens
supabase/
├── migrations/
│   ├── 001_dashboards.sql
│   ├── 002_rate_limits.sql
│   └── 003_view_dashboard_rpc.sql
└── functions/
    ├── create/index.ts
    └── delete/index.ts
public/
├── manifest.webmanifest
├── icons/{icon-192.png, icon-512.png, favicon.svg}
└── robots.txt
deploy/
├── nginx.conf
└── DEPLOY.md
tests/
├── lib/{typeDetection,stats,localDb}.test.ts
└── e2e/upload-flow.spec.ts
```

---

# Phase 1 — Vite scaffolding & TS migration

End state: prototype identical to `app/` but running on Vite + TS + Tailwind, with sample datasets typed.

## Task 1: Scaffold Vite + React + TS project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `.gitignore`

- [ ] **Step 1: Init project**

```bash
cd C:/Users/Usuario/Desktop/Exceltosky
npm create vite@latest . -- --template react-ts
# If prompted about non-empty directory, choose "Ignore files and continue"
```

- [ ] **Step 2: Install runtime deps**

```bash
npm install react@^18.3.1 react-dom@^18.3.1
npm install -D typescript@^5.4 vite@^5.2 @vitejs/plugin-react@^4.3 @types/react@^18.3 @types/react-dom@^18.3
```

- [ ] **Step 3: Add scripts to package.json**

Edit `package.json` `scripts` to:
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview --port 5173",
  "test": "vitest",
  "test:e2e": "playwright test",
  "lint": "tsc --noEmit"
}
```

- [ ] **Step 4: Verify dev server boots**

```bash
npm run dev
```
Expected: server at `http://localhost:5173` showing default Vite template. Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold vite + react + typescript"
```

## Task 2: Install Tailwind and port design tokens

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`, `src/styles/tokens.css`, `src/index.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Install Tailwind**

```bash
npm install -D tailwindcss@^3.4 postcss@^8.4 autoprefixer@^10.4
npx tailwindcss init -p
```

- [ ] **Step 2: Configure tailwind.config.ts**

Replace `tailwind.config.js` with `tailwind.config.ts` containing:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'sans-serif'],
        ui: ['Geist', 'ui-sans-serif', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        sky: { DEFAULT: 'var(--sky)', soft: 'var(--sky-soft)' },
        mint: { DEFAULT: 'var(--mint)', soft: 'var(--mint-soft)' },
        coral: { DEFAULT: 'var(--coral)', soft: 'var(--coral-soft)' },
        plum: { DEFAULT: 'var(--plum)', soft: 'var(--plum-soft)' },
        amber: { DEFAULT: 'var(--amber)', soft: 'var(--amber-soft)' },
        rose: { DEFAULT: 'var(--rose)', soft: 'var(--rose-soft)' },
        lime: { DEFAULT: 'var(--lime)', soft: 'var(--lime-soft)' },
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        border: 'var(--border)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
}

export default config
```
Delete the old `tailwind.config.js`.

- [ ] **Step 3: Create tokens.css**

Create `src/styles/tokens.css` and copy the `:root { ... }`, `.theme-dark { ... }`, density rules, and font imports from `app/index.html` lines 7-93. Wrap font imports in `@import` at the top:
```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');

:root { /* ... entire palette ... */ }
.theme-dark { /* ... */ }
.density-compact { --pad: 14px; --pad-lg: 18px; --gap: 10px; }
.density-cozy    { --pad: 20px; --pad-lg: 28px; --gap: 16px; }
.density-airy    { --pad: 28px; --pad-lg: 40px; --gap: 22px; }
```

- [ ] **Step 4: Set up src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
@import './styles/tokens.css';

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--font-ui);
  background: var(--bg);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 5: Import in main.tsx and verify**

`src/main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```
Run `npm run dev` and confirm fonts/colors load (background `#F7F6F2`, no console errors).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: install tailwind and port design tokens"
```

## Task 3: Define dataset types

**Files:**
- Create: `src/types/dataset.ts`

- [ ] **Step 1: Write the type definitions**

```typescript
export type ColumnType =
  | 'boolean'
  | 'date'
  | 'number'
  | 'currency'
  | 'geo'
  | 'category'
  | 'text'

export interface Column {
  key: string
  label: string
  type: ColumnType
  /** Original sheet header before normalization */
  originalLabel?: string
}

export type CellValue = string | number | boolean | null

export interface Dataset {
  id: string
  label: string
  columns: Column[]
  /** Each row is keyed by Column.key */
  rows: Record<string, CellValue>[]
  createdAt: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/dataset.ts
git commit -m "feat: add Dataset and Column type definitions"
```

## Task 4: Migrate sample datasets from data.jsx to TS

**Files:**
- Create: `src/samples/personas.ts`, `src/samples/viajes.ts`, `src/samples/ventas.ts`, `src/samples/index.ts`
- Read: `app/data.jsx`

- [ ] **Step 1: Read the existing DATASETS object**

```bash
grep -n "^const DATASETS" app/data.jsx
```
Identify the three datasets (personas, viajes, ventas) and their `columns`/`rows`.

- [ ] **Step 2: Port personas.ts**

Create `src/samples/personas.ts`:
```typescript
import type { Dataset } from '../types/dataset'

export const personas: Dataset = {
  id: 'personas',
  label: 'Personas',
  createdAt: '2026-05-21T00:00:00Z',
  columns: [
    // paste columns from data.jsx, ensuring `type` matches ColumnType union
  ],
  rows: [
    // paste rows array
  ],
}
```
For any column whose original `type` is not in the new union (e.g. `'string'`), map to `'text'` and `'cat'` to `'category'`.

- [ ] **Step 3: Port viajes.ts and ventas.ts** the same way.

- [ ] **Step 4: Create samples/index.ts barrel**

```typescript
import { personas } from './personas'
import { viajes } from './viajes'
import { ventas } from './ventas'
import type { Dataset } from '../types/dataset'

export const SAMPLE_DATASETS: Record<string, Dataset> = {
  personas,
  viajes,
  ventas,
}
```

- [ ] **Step 5: Type-check**

```bash
npm run lint
```
Expected: 0 errors. Fix any type mismatches in the porting.

- [ ] **Step 6: Commit**

```bash
git add src/samples src/types
git commit -m "feat: port sample datasets to typed modules"
```

## Task 5: Port TopBar, FloatingDock, App shell

**Files:**
- Create: `src/App.tsx`, `src/components/TopBar.tsx`, `src/components/FloatingDock.tsx`
- Read: `app/app.jsx`, `app/screens.jsx`

- [ ] **Step 1: Read TopBar source**

```bash
grep -n "function TopBar" app/screens.jsx
```
Read the TopBar function plus any sub-components it uses.

- [ ] **Step 2: Create TopBar.tsx**

Convert the TopBar component to TS with this signature:
```typescript
interface TopBarProps {
  current: string | null
  onNav: (route: string) => void
  dataset: Dataset | null
  hideNav?: boolean
  onShare?: () => void
}

export function TopBar(props: TopBarProps): JSX.Element { /* ... */ }
```
Replace inline styles with Tailwind classes where trivial; keep CSS variables (`var(--ink)` etc.) inline where Tailwind would be verbose.

- [ ] **Step 3: Create FloatingDock.tsx**

Port from `app/app.jsx` lines 152-185, signature:
```typescript
interface FloatingDockProps {
  route: { name: string }
  onNav: (route: string) => void
}
```

- [ ] **Step 4: Create App.tsx router stub**

```typescript
import { useState, useEffect } from 'react'
import { TopBar } from './components/TopBar'
import { FloatingDock } from './components/FloatingDock'
import { SAMPLE_DATASETS } from './samples'
import type { Dataset } from './types/dataset'

type RouteName = 'upload' | 'dashboard' | 'detail' | 'compare' | 'share' | 'public' | 'landing'

interface Route {
  name: RouteName
  columnKey?: string
}

export default function App(): JSX.Element {
  const [route, setRoute] = useState<Route>({ name: 'upload' })
  const [dataset, setDataset] = useState<Dataset>(SAMPLE_DATASETS.personas)

  function nav(name: RouteName, extras: Partial<Route> = {}): void {
    setRoute({ name, ...extras })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <div>
      <TopBar current={route.name} onNav={(n) => nav(n as RouteName)} dataset={dataset} onShare={() => nav('share')} />
      <main className="p-8 text-ink">
        Route: {route.name} — Dataset: {dataset.label} ({dataset.rows.length} filas)
      </main>
      <FloatingDock route={route} onNav={(n) => nav(n as RouteName)} />
    </div>
  )
}
```

- [ ] **Step 5: Run and verify**

```bash
npm run dev
```
Expected: TopBar visible at top, dock at bottom, main text "Route: upload — Dataset: Personas (N filas)". No console errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: port app shell with TopBar and FloatingDock"
```

## Task 6: Port screen components

**Files:**
- Create: `src/pages/UploadPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/ColumnDetailPage.tsx`, `src/pages/ComparePage.tsx`, `src/pages/SharePage.tsx`, `src/pages/PublicViewPage.tsx`
- Read: `app/screens.jsx`

- [ ] **Step 1: Inventory screens in screens.jsx**

```bash
grep -n "^function .*Screen" app/screens.jsx
```
Note the export names (UploadScreen, DashboardScreen, etc).

- [ ] **Step 2: Port UploadPage.tsx**

```typescript
import type { Dataset } from '../types/dataset'

interface UploadPageProps {
  onLoad: (datasetId: string) => void
}

export function UploadPage({ onLoad }: UploadPageProps): JSX.Element {
  // Port body of UploadScreen from screens.jsx, converting jsx to tsx and typing props
}
```

- [ ] **Step 3: Port DashboardPage.tsx**

```typescript
interface DashboardPageProps {
  dataset: Dataset
  onColumnClick: (column: Column) => void
  onCompare: () => void
  onShare: () => void
}
```
Use `StatCard` and chart components — create stubs that just render the column name and type. Real charts come in Task 7.

- [ ] **Step 4: Port ColumnDetailPage, ComparePage, SharePage, PublicViewPage**

Same pattern. Where the original uses inline charts, leave a `<div className="rounded border border-border p-4">Chart placeholder: {chartType}</div>` placeholder.

- [ ] **Step 5: Wire pages into App.tsx**

Replace the placeholder `<main>` content in `App.tsx`:
```typescript
{route.name === 'upload' && <UploadPage onLoad={(id) => { setDataset(SAMPLE_DATASETS[id]); nav('dashboard') }} />}
{route.name === 'dashboard' && <DashboardPage dataset={dataset} onColumnClick={(c) => nav('detail', { columnKey: c.key })} onCompare={() => nav('compare')} onShare={() => nav('share')} />}
{route.name === 'detail' && route.columnKey && <ColumnDetailPage dataset={dataset} columnKey={route.columnKey} onPickColumn={(k) => nav('detail', { columnKey: k })} onBack={() => nav('dashboard')} />}
{route.name === 'compare' && <ComparePage dataset={dataset} onBack={() => nav('dashboard')} />}
{route.name === 'share' && <SharePage dataset={dataset} onBack={() => nav('dashboard')} onOpenPublic={() => nav('public')} />}
{route.name === 'public' && <PublicViewPage dataset={dataset} onColumnClick={(c) => nav('detail', { columnKey: c.key })} onExit={() => nav('dashboard')} />}
```

- [ ] **Step 6: Verify all routes render**

```bash
npm run dev
```
Click each tab in FloatingDock. Each should render its placeholder without errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: port screen components as page modules"
```

## Task 7: Port chart components

**Files:**
- Create: `src/components/StatCard.tsx`, `src/components/ChartLine.tsx`, `src/components/ChartBar.tsx`, `src/components/ChartScatter.tsx`, `src/components/ChartMap.tsx`
- Read: `app/charts.jsx`

- [ ] **Step 1: Read chart sources**

```bash
grep -n "^function " app/charts.jsx
```
List the chart components and their props.

- [ ] **Step 2: Port StatCard.tsx**

```typescript
interface StatCardProps {
  label: string
  value: string | number
  accent?: 'sky' | 'mint' | 'coral' | 'plum' | 'amber' | 'rose' | 'lime'
  caption?: string
}

export function StatCard({ label, value, accent = 'sky', caption }: StatCardProps): JSX.Element {
  // Port from charts.jsx, convert inline styles to className combinations
}
```

- [ ] **Step 3: Port ChartLine, ChartBar, ChartScatter** (SVG-based, no library deps).

- [ ] **Step 4: Port ChartMap**

The original uses inline SVG. If it pulls from a list of city coords, keep that data inline. No external map library.

- [ ] **Step 5: Replace placeholders in DashboardPage / ColumnDetailPage / ComparePage / PublicViewPage with real chart components.

- [ ] **Step 6: Visual smoke test**

```bash
npm run dev
```
Open `http://localhost:5173`, navigate to Dashboard. Confirm stat cards and charts render with sample data and match the original prototype's look.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: port chart components"
```

## Task 8: Phase 1 gate — build and visual diff

- [ ] **Step 1: Production build**

```bash
npm run build
npm run preview
```
Expected: build completes without TS errors. Preview at `http://localhost:5173` looks identical to the old `app/` prototype.

- [ ] **Step 2: Side-by-side**

Open `app/index.html` via `python -m http.server 8080` from `app/` in one tab, and the Vite preview in another. Compare each of the 6 screens.

- [ ] **Step 3: Commit (no code change, marker only)**

```bash
git tag phase-1-complete
git commit --allow-empty -m "chore: phase 1 complete (vite + ts prototype parity)"
```

---

# Phase 2 — Excel parsing & type detection

End state: user can drag a real `.xlsx` and see a dashboard generated from it.

## Task 9: Install testing infra

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest@^1.5 @testing-library/react@^15 @testing-library/jest-dom@^6.4 jsdom@^24
```

- [ ] **Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 3: tests/setup.ts**

```typescript
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Verify**

```bash
npx vitest run --reporter=verbose
```
Expected: "No test files found" — that's OK, no tests yet.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: configure vitest"
```

## Task 10: Type detection — boolean detector (TDD)

**Files:**
- Create: `src/lib/typeDetection.ts`, `tests/lib/typeDetection.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/typeDetection.test.ts
import { describe, it, expect } from 'vitest'
import { detectBoolean } from '../../src/lib/typeDetection'

describe('detectBoolean', () => {
  it('recognises true/false strings', () => {
    expect(detectBoolean('true')).toBe(true)
    expect(detectBoolean('false')).toBe(false)
  })
  it('recognises sí/no (Spanish)', () => {
    expect(detectBoolean('sí')).toBe(true)
    expect(detectBoolean('si')).toBe(true)
    expect(detectBoolean('no')).toBe(false)
  })
  it('recognises 0/1', () => {
    expect(detectBoolean('0')).toBe(false)
    expect(detectBoolean('1')).toBe(true)
  })
  it('returns null for non-boolean', () => {
    expect(detectBoolean('hello')).toBeNull()
    expect(detectBoolean('2')).toBeNull()
  })
})
```

- [ ] **Step 2: Run — should fail**

```bash
npx vitest run tests/lib/typeDetection.test.ts
```
Expected: import error (detectBoolean not exported).

- [ ] **Step 3: Implement**

```typescript
// src/lib/typeDetection.ts
const TRUE_VALUES = new Set(['true', '1', 'sí', 'si', 'yes', 'y', 'verdadero'])
const FALSE_VALUES = new Set(['false', '0', 'no', 'n', 'falso'])

export function detectBoolean(raw: string): boolean | null {
  const v = raw.trim().toLowerCase()
  if (TRUE_VALUES.has(v)) return true
  if (FALSE_VALUES.has(v)) return false
  return null
}
```

- [ ] **Step 4: Run — should pass**

```bash
npx vitest run tests/lib/typeDetection.test.ts
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/typeDetection.ts tests/lib/typeDetection.test.ts
git commit -m "feat(typeDetection): boolean detector"
```

## Task 11: Type detection — number detector (TDD)

**Files:**
- Modify: `src/lib/typeDetection.ts`, `tests/lib/typeDetection.test.ts`

- [ ] **Step 1: Add failing tests**

```typescript
import { detectNumber } from '../../src/lib/typeDetection'

describe('detectNumber', () => {
  it('parses plain integers', () => {
    expect(detectNumber('42')).toBe(42)
    expect(detectNumber('-7')).toBe(-7)
  })
  it('parses ES decimals with comma', () => {
    expect(detectNumber('1.234,56')).toBeCloseTo(1234.56)
    expect(detectNumber('0,5')).toBeCloseTo(0.5)
  })
  it('parses US decimals with dot', () => {
    expect(detectNumber('1234.56')).toBeCloseTo(1234.56)
  })
  it('strips currency symbols', () => {
    expect(detectNumber('€ 12,50')).toBeCloseTo(12.5)
    expect(detectNumber('$1,200.00')).toBeCloseTo(1200)
  })
  it('returns null for non-numeric', () => {
    expect(detectNumber('hello')).toBeNull()
    expect(detectNumber('')).toBeNull()
  })
})
```

- [ ] **Step 2: Run — should fail.**

- [ ] **Step 3: Implement**

```typescript
export function detectNumber(raw: string): number | null {
  if (!raw) return null
  let s = raw.trim().replace(/[€$£¥\s]/g, '')
  // Heuristic: if both "," and "." present, the last one is the decimal sep
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (lastComma !== -1) {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
```

- [ ] **Step 4: Run — should pass.**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(typeDetection): number detector with ES locale"
```

## Task 12: Type detection — date detector (TDD)

**Files:**
- Modify: `src/lib/typeDetection.ts`, `tests/lib/typeDetection.test.ts`

- [ ] **Step 1: Failing tests**

```typescript
import { detectDate } from '../../src/lib/typeDetection'

describe('detectDate', () => {
  it('parses ISO dates', () => {
    expect(detectDate('2025-03-15')).toEqual(new Date('2025-03-15T00:00:00Z'))
  })
  it('parses dd/mm/yyyy', () => {
    expect(detectDate('15/03/2025')?.getUTCFullYear()).toBe(2025)
    expect(detectDate('15/03/2025')?.getUTCMonth()).toBe(2)
    expect(detectDate('15/03/2025')?.getUTCDate()).toBe(15)
  })
  it('parses dd-mm-yyyy', () => {
    expect(detectDate('15-03-2025')?.getUTCDate()).toBe(15)
  })
  it('rejects ambiguous numbers', () => {
    expect(detectDate('42')).toBeNull()
    expect(detectDate('hello')).toBeNull()
  })
})
```

- [ ] **Step 2: Run — should fail.**

- [ ] **Step 3: Implement**

```typescript
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T.*)?$/
const DMY = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/

export function detectDate(raw: string): Date | null {
  if (!raw) return null
  const s = raw.trim()
  if (ISO_DATE.test(s)) {
    const d = new Date(s.length === 10 ? s + 'T00:00:00Z' : s)
    return isNaN(d.getTime()) ? null : d
  }
  const m = DMY.exec(s)
  if (m) {
    const [, day, month, year] = m
    const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
```

- [ ] **Step 4: Run — should pass.**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(typeDetection): date detector"
```

## Task 13: Type detection — column inference (TDD)

**Files:**
- Modify: `src/lib/typeDetection.ts`, `tests/lib/typeDetection.test.ts`

- [ ] **Step 1: Failing tests for inferColumnType**

```typescript
import { inferColumnType } from '../../src/lib/typeDetection'

describe('inferColumnType', () => {
  it('detects boolean column', () => {
    expect(inferColumnType(['sí', 'no', 'sí', 'sí', 'no'])).toBe('boolean')
  })
  it('detects number column', () => {
    expect(inferColumnType(['1.000,50', '20', '350,25', '4'])).toBe('number')
  })
  it('detects date column', () => {
    expect(inferColumnType(['2025-01-01', '2025-02-15', '01/03/2025'])).toBe('date')
  })
  it('detects category with low cardinality', () => {
    const values = Array.from({ length: 40 }, (_, i) => ['rojo', 'verde', 'azul'][i % 3])
    expect(inferColumnType(values)).toBe('category')
  })
  it('falls back to text for high cardinality strings', () => {
    const values = Array.from({ length: 30 }, (_, i) => `descripcion única ${i}`)
    expect(inferColumnType(values)).toBe('text')
  })
  it('respects 80% threshold', () => {
    const values = ['1', '2', '3', '4', '5', '6', '7', '8', 'x', 'y'] // 80% number
    expect(inferColumnType(values)).toBe('number')
  })
})
```

- [ ] **Step 2: Run — should fail.**

- [ ] **Step 3: Implement**

```typescript
import type { ColumnType } from '../types/dataset'

const THRESHOLD = 0.8
const CATEGORY_MAX_RATIO = 0.05
const CATEGORY_MIN_ROWS = 20

function sample<T>(values: T[], max = 200): T[] {
  if (values.length <= max) return values
  const head = values.slice(0, max / 2)
  const tail: T[] = []
  for (let i = 0; i < max / 2; i++) {
    tail.push(values[Math.floor(Math.random() * values.length)])
  }
  return [...head, ...tail]
}

export function inferColumnType(rawValues: (string | null | undefined)[]): ColumnType {
  const sampled = sample(rawValues.filter((v): v is string => v != null && v !== ''))
  if (sampled.length === 0) return 'text'

  const counts = { boolean: 0, date: 0, number: 0 }
  for (const v of sampled) {
    if (detectBoolean(v) !== null) counts.boolean++
    if (detectDate(v) !== null) counts.date++
    if (detectNumber(v) !== null) counts.number++
  }
  const total = sampled.length

  // Priority: boolean > date > number (most specific first)
  if (counts.boolean / total >= THRESHOLD) return 'boolean'
  if (counts.date / total >= THRESHOLD) return 'date'
  if (counts.number / total >= THRESHOLD) return 'number'

  const unique = new Set(sampled).size
  if (total >= CATEGORY_MIN_ROWS && unique / total < CATEGORY_MAX_RATIO) return 'category'

  return 'text'
}
```

- [ ] **Step 4: Run — should pass.**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(typeDetection): inferColumnType heuristic"
```

## Task 14: Stats utilities (TDD)

**Files:**
- Create: `src/lib/stats.ts`, `tests/lib/stats.test.ts`

- [ ] **Step 1: Failing tests**

```typescript
import { describe, it, expect } from 'vitest'
import { computeStats } from '../../src/lib/stats'

describe('computeStats', () => {
  it('computes min/max/mean/mode for numbers', () => {
    const s = computeStats([1, 2, 2, 3, 4])
    expect(s.min).toBe(1)
    expect(s.max).toBe(4)
    expect(s.mean).toBeCloseTo(2.4)
    expect(s.mode).toBe(2)
    expect(s.count).toBe(5)
  })
  it('handles empty', () => {
    const s = computeStats([])
    expect(s.count).toBe(0)
    expect(s.min).toBeNull()
  })
  it('ignores non-numeric', () => {
    const s = computeStats([1, NaN, null as unknown as number, 3])
    expect(s.count).toBe(2)
    expect(s.mean).toBe(2)
  })
})
```

- [ ] **Step 2: Run — should fail.**

- [ ] **Step 3: Implement**

```typescript
export interface NumericStats {
  count: number
  min: number | null
  max: number | null
  mean: number | null
  mode: number | null
}

export function computeStats(values: (number | null | undefined)[]): NumericStats {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (nums.length === 0) {
    return { count: 0, min: null, max: null, mean: null, mode: null }
  }
  let min = Infinity, max = -Infinity, sum = 0
  const freq = new Map<number, number>()
  for (const n of nums) {
    if (n < min) min = n
    if (n > max) max = n
    sum += n
    freq.set(n, (freq.get(n) ?? 0) + 1)
  }
  let mode = nums[0], best = 0
  for (const [n, c] of freq) {
    if (c > best) { best = c; mode = n }
  }
  return { count: nums.length, min, max, mean: sum / nums.length, mode }
}
```

- [ ] **Step 4: Run — should pass.**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(stats): MIN/MAX/MEAN/MODE for numeric columns"
```

## Task 15: SheetJS Web Worker

**Files:**
- Create: `src/workers/parser.worker.ts`, `src/lib/parser.ts`
- Modify: `package.json`

- [ ] **Step 1: Install SheetJS**

```bash
npm install xlsx@^0.20.3 nanoid@^5.0
npm install -D @types/node
```

- [ ] **Step 2: Create the worker**

```typescript
// src/workers/parser.worker.ts
import * as XLSX from 'xlsx'
import { inferColumnType } from '../lib/typeDetection'
import type { Dataset, Column, CellValue } from '../types/dataset'

export interface ParseRequest { fileBuffer: ArrayBuffer; fileName: string }
export interface ParseSuccess { ok: true; dataset: Dataset }
export interface ParseError { ok: false; error: string }
export type ParseResponse = ParseSuccess | ParseError

self.addEventListener('message', (event: MessageEvent<ParseRequest>) => {
  try {
    const { fileBuffer, fileName } = event.data
    const wb = XLSX.read(fileBuffer, { type: 'array', cellDates: true })
    const sheetName = wb.SheetNames[0]
    const sheet = wb.Sheets[sheetName]
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false })

    if (rawRows.length === 0) {
      const response: ParseResponse = { ok: false, error: 'El Excel no tiene filas.' }
      ;(self as DedicatedWorkerGlobalScope).postMessage(response)
      return
    }

    const headers = Object.keys(rawRows[0])
    const columns: Column[] = headers.map((h, i) => {
      const values = rawRows.map(r => (r[h] == null ? null : String(r[h])))
      return {
        key: `col_${i}`,
        label: h,
        originalLabel: h,
        type: inferColumnType(values),
      }
    })

    const rows: Record<string, CellValue>[] = rawRows.map(r => {
      const obj: Record<string, CellValue> = {}
      headers.forEach((h, i) => {
        const v = r[h]
        obj[`col_${i}`] = v == null ? null : (typeof v === 'number' || typeof v === 'boolean' ? v : String(v))
      })
      return obj
    })

    const dataset: Dataset = {
      id: 'uploaded',
      label: fileName.replace(/\.[^.]+$/, ''),
      columns,
      rows,
      createdAt: new Date().toISOString(),
    }
    const response: ParseResponse = { ok: true, dataset }
    ;(self as DedicatedWorkerGlobalScope).postMessage(response)
  } catch (err) {
    const response: ParseResponse = { ok: false, error: err instanceof Error ? err.message : 'Error desconocido al parsear el Excel.' }
    ;(self as DedicatedWorkerGlobalScope).postMessage(response)
  }
})
```

- [ ] **Step 3: Create lib/parser.ts client wrapper**

```typescript
import type { Dataset } from '../types/dataset'
import type { ParseResponse } from '../workers/parser.worker'

export const MAX_FILE_BYTES = 10 * 1024 * 1024

export class ParseError extends Error {}

export async function parseExcelFile(file: File): Promise<Dataset> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ParseError(`El archivo supera 10 MB (${(file.size / 1024 / 1024).toFixed(1)} MB). Reduce filas o conviértelo a CSV.`)
  }
  const buffer = await file.arrayBuffer()
  const worker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), { type: 'module' })
  return new Promise<Dataset>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<ParseResponse>) => {
      worker.terminate()
      if (e.data.ok) resolve(e.data.dataset)
      else reject(new ParseError(e.data.error))
    }
    worker.onerror = (e) => { worker.terminate(); reject(new ParseError(e.message)) }
    worker.postMessage({ fileBuffer: buffer, fileName: file.name }, [buffer])
  })
}
```

- [ ] **Step 4: Smoke-test in browser**

Add temporary input to `UploadPage.tsx`:
```tsx
<input type="file" accept=".xlsx,.xls,.csv,.ods" onChange={async (e) => {
  const f = e.target.files?.[0]; if (!f) return
  try { const ds = await parseExcelFile(f); console.log(ds) }
  catch (err) { console.error(err) }
}} />
```
Run `npm run dev`, drop a small `.xlsx`, check the console output shows the parsed Dataset.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(parser): SheetJS web worker with 10MB cap"
```

## Task 16: Wire parser into UploadPage UI

**Files:**
- Create: `src/components/UploadDropzone.tsx`
- Modify: `src/pages/UploadPage.tsx`, `src/App.tsx`

- [ ] **Step 1: Build UploadDropzone**

```typescript
import { useState, useRef } from 'react'
import { parseExcelFile, ParseError } from '../lib/parser'
import type { Dataset } from '../types/dataset'

interface UploadDropzoneProps {
  onParsed: (dataset: Dataset) => void
}

export function UploadDropzone({ onParsed }: UploadDropzoneProps): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File): Promise<void> {
    setBusy(true); setError(null)
    try {
      const ds = await parseExcelFile(file)
      onParsed(ds)
    } catch (err) {
      setError(err instanceof ParseError ? err.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void handleFile(f) }}
      className="rounded-lg border-2 border-dashed border-border p-12 text-center cursor-pointer"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.ods"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
      />
      {busy ? 'Procesando…' : 'Arrastra un Excel aquí o haz click'}
      {error && <p className="mt-4 text-coral">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Replace UploadPage body**

Replace the existing UploadScreen content with the dropzone + the existing "datasets de ejemplo" buttons. `UploadPageProps`:
```typescript
interface UploadPageProps {
  onParsed: (dataset: Dataset) => void
  onUseSample: (sampleId: string) => void
}
```

- [ ] **Step 3: Wire in App.tsx**

```typescript
<UploadPage
  onParsed={(ds) => { setDataset(ds); nav('dashboard') }}
  onUseSample={(id) => { setDataset(SAMPLE_DATASETS[id]); nav('dashboard') }}
/>
```

- [ ] **Step 4: Manual test**

```bash
npm run dev
```
Drop a real `.xlsx`. Should navigate to dashboard showing columns from the file.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(upload): integrate parser with drag-and-drop UI"
```

## Task 17: Phase 2 gate

- [ ] **Step 1: Run all tests**

```bash
npm run test -- --run
npm run build
```
Expected: all tests pass, build succeeds.

- [ ] **Step 2: Tag**

```bash
git tag phase-2-complete
git commit --allow-empty -m "chore: phase 2 complete (real excel parsing)"
```

---

# Phase 3 — Local persistence (IndexedDB)

End state: every upload appears in "Mis dashboards" and survives page reloads.

## Task 18: Install idb and define schema

**Files:**
- Create: `src/lib/localDb.ts`, `tests/lib/localDb.test.ts`

- [ ] **Step 1: Install**

```bash
npm install idb@^8.0
npm install -D fake-indexeddb@^5.0
```

- [ ] **Step 2: Failing tests**

```typescript
// tests/lib/localDb.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { saveLocalDashboard, listLocalDashboards, removeLocalDashboard } from '../../src/lib/localDb'

describe('localDb', () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase('exceltosky')
  })
  it('saves and lists a dashboard', async () => {
    await saveLocalDashboard({ slug: 'abc', name: 'Test', deleteToken: 't1', owner: 'created' })
    const list = await listLocalDashboards()
    expect(list).toHaveLength(1)
    expect(list[0].slug).toBe('abc')
  })
  it('overwrites entry on duplicate slug', async () => {
    await saveLocalDashboard({ slug: 'abc', name: 'A', deleteToken: 't1', owner: 'created' })
    await saveLocalDashboard({ slug: 'abc', name: 'B', deleteToken: 't1', owner: 'created' })
    const list = await listLocalDashboards()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('B')
  })
  it('removes a dashboard', async () => {
    await saveLocalDashboard({ slug: 'abc', name: 'X', deleteToken: 't', owner: 'visited' })
    await removeLocalDashboard('abc')
    expect(await listLocalDashboards()).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Run — should fail.**

- [ ] **Step 4: Implement**

```typescript
// src/lib/localDb.ts
import { openDB, type IDBPDatabase } from 'idb'

export interface LocalDashboard {
  slug: string
  name: string
  deleteToken: string
  owner: 'created' | 'visited'
  createdAt?: string
  lastOpenedAt?: string
}

interface Schema {
  dashboards: {
    key: string
    value: LocalDashboard
  }
}

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null

function db(): Promise<IDBPDatabase<Schema>> {
  if (!dbPromise) {
    dbPromise = openDB<Schema>('exceltosky', 1, {
      upgrade(d) {
        d.createObjectStore('dashboards', { keyPath: 'slug' })
      },
    })
  }
  return dbPromise
}

export async function saveLocalDashboard(input: LocalDashboard): Promise<void> {
  const now = new Date().toISOString()
  const value: LocalDashboard = {
    createdAt: now,
    lastOpenedAt: now,
    ...input,
  }
  const d = await db()
  await d.put('dashboards', value)
}

export async function listLocalDashboards(): Promise<LocalDashboard[]> {
  const d = await db()
  const all = await d.getAll('dashboards')
  return all.sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''))
}

export async function removeLocalDashboard(slug: string): Promise<void> {
  const d = await db()
  await d.delete('dashboards', slug)
}

export async function touchLocalDashboard(slug: string): Promise<void> {
  const d = await db()
  const existing = await d.get('dashboards', slug)
  if (existing) {
    await d.put('dashboards', { ...existing, lastOpenedAt: new Date().toISOString() })
  }
}
```

- [ ] **Step 5: Run — should pass.**

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(localDb): IndexedDB index for my dashboards"
```

## Task 19: Surface "Mis dashboards" on UploadPage

**Files:**
- Modify: `src/pages/UploadPage.tsx`

- [ ] **Step 1: Load list on mount**

Add to UploadPage:
```typescript
const [mine, setMine] = useState<LocalDashboard[]>([])
useEffect(() => { void listLocalDashboards().then(setMine) }, [])
```
Render a section "Mis dashboards" below the dropzone iterating `mine`, each item linking to its slug (handler to be added in Phase 4 — for now `onClick={() => alert('Próximamente')}`).

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(upload): show local dashboards index"
```

## Task 20: Phase 3 gate

- [ ] **Step 1: Tests + build**

```bash
npm run test -- --run && npm run build
```

- [ ] **Step 2: Tag**

```bash
git tag phase-3-complete
git commit --allow-empty -m "chore: phase 3 complete (local persistence)"
```

---

# Phase 4 — Supabase backend

End state: anonymous user can create, read, and delete a dashboard via Supabase, rate-limited.

## Task 21: Supabase project setup

**Files:**
- Create: `.env.example`, `.env.local`, `supabase/config.toml`

- [ ] **Step 1: Authenticate with Supabase MCP**

In Claude session run the MCP tool `mcp__supabase__authenticate`, then `mcp__supabase__complete_authentication` per the prompts. (User has the MCP wired up.)

- [ ] **Step 2: Create project via Supabase Studio**

Manual: at `https://supabase.com/dashboard`, create a new project named `excel-to-sky`. Region: `eu-west-1` (closest to ES users). Save the `Project URL`, `anon key`, and `service_role key`.

- [ ] **Step 3: .env.example**

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

- [ ] **Step 4: .env.local (gitignored)**

Fill with real values. Confirm `.env.local` is in `.gitignore`.

- [ ] **Step 5: Install Supabase CLI locally**

```bash
npm install -D supabase@^1.165
npx supabase init
```
Then `npx supabase link --project-ref <ref>` using the project ref from the URL.

- [ ] **Step 6: Commit**

```bash
git add .env.example supabase/config.toml package.json package-lock.json .gitignore
git commit -m "chore: configure supabase project link"
```

## Task 22: Migration — dashboards table

**Files:**
- Create: `supabase/migrations/001_dashboards.sql`

- [ ] **Step 1: Write migration**

```sql
create table public.dashboards (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  data            jsonb not null,
  delete_token    text not null,
  created_at      timestamptz not null default now(),
  last_viewed_at  timestamptz not null default now(),
  view_count      int not null default 0,
  expires_at      timestamptz not null default now() + interval '90 days'
);

create index idx_dashboards_slug on public.dashboards(slug);
create index idx_dashboards_expires_at on public.dashboards(expires_at);

alter table public.dashboards enable row level security;
-- No policies: deny all by default to anon/authenticated roles.
-- Writes go through Edge Functions (service_role), reads via SECURITY DEFINER RPC.
```

- [ ] **Step 2: Apply**

```bash
npx supabase db push
```
Expected: migration applied. Verify in Supabase Studio → Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_dashboards.sql
git commit -m "feat(db): dashboards table"
```

## Task 23: Migration — rate_limits table

**Files:**
- Create: `supabase/migrations/002_rate_limits.sql`

- [ ] **Step 1: Write migration**

```sql
create table public.rate_limits (
  ip            text not null,
  window_start  timestamptz not null,
  count         int not null default 1,
  primary key (ip, window_start)
);

alter table public.rate_limits enable row level security;
-- No policies. Only service_role (Edge Functions) touches this.

create index idx_rate_limits_window on public.rate_limits(window_start);
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db push
git add supabase/migrations/002_rate_limits.sql
git commit -m "feat(db): rate_limits table"
```

## Task 24: Migration — view_dashboard RPC + cleanup cron

**Files:**
- Create: `supabase/migrations/003_view_dashboard_rpc.sql`

- [ ] **Step 1: Write migration**

```sql
create or replace function public.view_dashboard(p_slug text)
returns table (slug text, name text, data jsonb, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dashboards
     set view_count = view_count + 1,
         last_viewed_at = now(),
         expires_at = now() + interval '90 days'
   where dashboards.slug = p_slug
     and dashboards.expires_at > now();

  return query
    select d.slug, d.name, d.data, d.created_at
      from public.dashboards d
     where d.slug = p_slug
       and d.expires_at > now();
end;
$$;

revoke all on function public.view_dashboard(text) from public;
grant execute on function public.view_dashboard(text) to anon, authenticated;

-- Daily cleanup
create extension if not exists pg_cron;
select cron.schedule(
  'cleanup_expired_dashboards',
  '0 3 * * *',
  $$ delete from public.dashboards where expires_at < now(); $$
);
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db push
git add supabase/migrations/003_view_dashboard_rpc.sql
git commit -m "feat(db): view_dashboard RPC and cleanup cron"
```

## Task 25: Edge Function — create

**Files:**
- Create: `supabase/functions/create/index.ts`

- [ ] **Step 1: Generate function skeleton**

```bash
npx supabase functions new create
```
Replace `supabase/functions/create/index.ts` with:

```typescript
import { serve } from 'https://deno.land/std@0.215.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'
import { customAlphabet } from 'https://esm.sh/nanoid@5.0.0'

const SLUG = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)
const TOKEN = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32)
const MAX_BYTES = 5 * 1024 * 1024
const HOURLY_LIMIT = 10

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const windowStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString()

  // Rate limit
  const { data: limit } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('ip', ip)
    .eq('window_start', windowStart)
    .maybeSingle()
  const current = limit?.count ?? 0
  if (current >= HOURLY_LIMIT) return json({ error: 'Demasiadas creaciones esta hora. Inténtalo más tarde.' }, 429)

  const body = await req.text()
  if (body.length > MAX_BYTES) return json({ error: 'Payload excede 5 MB.' }, 413)

  let payload: { name?: unknown; data?: unknown }
  try { payload = JSON.parse(body) } catch { return json({ error: 'JSON inválido.' }, 400) }
  if (typeof payload.name !== 'string' || !payload.name.trim()) return json({ error: 'name requerido.' }, 400)
  if (typeof payload.data !== 'object' || payload.data === null) return json({ error: 'data requerido.' }, 400)

  const slug = SLUG()
  const deleteToken = TOKEN()
  const { error } = await supabase.from('dashboards').insert({
    slug,
    name: payload.name.trim().slice(0, 200),
    data: payload.data,
    delete_token: deleteToken,
  })
  if (error) return json({ error: error.message }, 500)

  await supabase
    .from('rate_limits')
    .upsert({ ip, window_start: windowStart, count: current + 1 }, { onConflict: 'ip,window_start' })

  return json({ slug, deleteToken }, 200)
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  })
}
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy create --no-verify-jwt
```
`--no-verify-jwt` because we want anonymous POSTs.

- [ ] **Step 3: Smoke-test**

```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/create" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","data":{"columns":[],"rows":[]}}'
```
Expected: `{"slug":"...","deleteToken":"..."}`. Verify row appears in Studio.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/create
git commit -m "feat(api): edge function POST /create with rate limit"
```

## Task 26: Edge Function — delete

**Files:**
- Create: `supabase/functions/delete/index.ts`

- [ ] **Step 1: Generate + implement**

```bash
npx supabase functions new delete
```

```typescript
import { serve } from 'https://deno.land/std@0.215.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let body: { slug?: unknown; deleteToken?: unknown }
  try { body = await req.json() } catch { return json({ error: 'JSON inválido.' }, 400) }
  if (typeof body.slug !== 'string' || typeof body.deleteToken !== 'string') {
    return json({ error: 'slug y deleteToken requeridos.' }, 400)
  }

  const { data: row } = await supabase
    .from('dashboards')
    .select('delete_token')
    .eq('slug', body.slug)
    .maybeSingle()
  if (!row) return json({ error: 'No existe.' }, 404)
  if (row.delete_token !== body.deleteToken) return json({ error: 'Token inválido.' }, 403)

  const { error } = await supabase.from('dashboards').delete().eq('slug', body.slug)
  if (error) return json({ error: error.message }, 500)
  return json({ ok: true }, 200)
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  })
}
```

- [ ] **Step 2: Deploy + smoke-test**

```bash
npx supabase functions deploy delete --no-verify-jwt
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/delete" \
  -H "Content-Type: application/json" \
  -d '{"slug":"<slug from Task 25>","deleteToken":"<token from Task 25>"}'
```
Expected: `{"ok":true}`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/delete
git commit -m "feat(api): edge function POST /delete with token check"
```

## Task 27: Frontend Supabase client

**Files:**
- Create: `src/lib/supabase.ts`, `src/lib/shareApi.ts`

- [ ] **Step 1: Install supabase-js**

```bash
npm install @supabase/supabase-js@^2.43
```

- [ ] **Step 2: src/lib/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
if (!url || !anon) throw new Error('Supabase env vars not configured')

export const supabase = createClient(url, anon)
```

- [ ] **Step 3: src/lib/shareApi.ts**

```typescript
import { supabase } from './supabase'
import type { Dataset } from '../types/dataset'

export interface CreatedDashboard { slug: string; deleteToken: string }

export async function createSharedDashboard(dataset: Dataset): Promise<CreatedDashboard> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: dataset.label, data: dataset }),
  })
  const body = await res.json() as { slug?: string; deleteToken?: string; error?: string }
  if (!res.ok || !body.slug || !body.deleteToken) {
    throw new Error(body.error ?? `Error ${res.status}`)
  }
  return { slug: body.slug, deleteToken: body.deleteToken }
}

export async function deleteSharedDashboard(slug: string, deleteToken: string): Promise<void> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, deleteToken }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `${res.status}` }))
    throw new Error((body as { error?: string }).error ?? `Error ${res.status}`)
  }
}

export async function loadSharedDashboard(slug: string): Promise<Dataset> {
  const { data, error } = await supabase.rpc('view_dashboard', { p_slug: slug })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Dashboard no encontrado o caducado.')
  return row.data as Dataset
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(api): frontend client for share endpoints"
```

## Task 28: Wire share flow in SharePage

**Files:**
- Modify: `src/pages/SharePage.tsx`
- Create: `src/components/ShareModal.tsx`

- [ ] **Step 1: Replace SharePage body**

```typescript
import { useState } from 'react'
import { createSharedDashboard } from '../lib/shareApi'
import { saveLocalDashboard } from '../lib/localDb'

export function SharePage({ dataset, onBack }: { dataset: Dataset; onBack: () => void }): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleShare(): Promise<void> {
    setBusy(true); setError(null)
    try {
      const { slug, deleteToken } = await createSharedDashboard(dataset)
      await saveLocalDashboard({ slug, name: dataset.label, deleteToken, owner: 'created' })
      setLink(`${window.location.origin}/d/${slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button onClick={onBack} className="text-muted">← Volver</button>
      <h1 className="font-display text-3xl mt-4">Compartir dashboard</h1>
      {!link && (
        <button onClick={handleShare} disabled={busy} className="mt-6 rounded bg-ink text-bg px-6 py-3">
          {busy ? 'Generando link…' : 'Crear link público'}
        </button>
      )}
      {link && (
        <div className="mt-6 rounded border border-border p-4">
          <p className="text-muted text-sm">Tu link:</p>
          <code className="block break-all font-mono text-ink mt-2">{link}</code>
          <button onClick={() => navigator.clipboard.writeText(link)} className="mt-3 text-sky">Copiar</button>
        </div>
      )}
      {error && <p className="mt-4 text-coral">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Manual test**

`npm run dev`, upload an Excel, navigate to Share, click "Crear link público". Should show a URL. Open Studio → confirm row.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(share): wire SharePage to create endpoint"
```

## Task 29: Public view route

**Files:**
- Modify: `src/App.tsx`, `src/pages/PublicViewPage.tsx`

- [ ] **Step 1: Add slug routing in App.tsx**

Replace `useState<Route>` with URL-based routing using `window.location.pathname`:
```typescript
import { useState, useEffect } from 'react'
import { loadSharedDashboard } from './lib/shareApi'
import { saveLocalDashboard, touchLocalDashboard } from './lib/localDb'

// On mount, check pathname
useEffect(() => {
  const match = /^\/d\/([A-Za-z0-9]{12})$/.exec(window.location.pathname)
  if (match) {
    const slug = match[1]
    void loadSharedDashboard(slug).then(async (ds) => {
      await saveLocalDashboard({ slug, name: ds.label, deleteToken: '', owner: 'visited' })
      await touchLocalDashboard(slug)
      setDataset(ds)
      setRoute({ name: 'public' })
    }).catch((err) => {
      console.error(err)
      setRoute({ name: 'upload' })
    })
  }
}, [])
```

- [ ] **Step 2: Update vite.config.ts for SPA fallback**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,
  },
})
```

- [ ] **Step 3: Manual test**

Create a dashboard, copy the `/d/<slug>` URL, open in a private window → should load the public view.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(share): load shared dashboard via /d/<slug>"
```

## Task 30: Phase 4 gate

- [ ] **Step 1: Tests + build**

```bash
npm run test -- --run && npm run build
```

- [ ] **Step 2: Tag**

```bash
git tag phase-4-complete
git commit --allow-empty -m "chore: phase 4 complete (supabase backend live)"
```

---

# Phase 5 — Monetization, PWA, deploy

End state: site is live on the Hostinger VPS at the user's domain, AdSense (or Adsterra) tag loads, manifest installable.

## Task 31: AdSense + CMP integration

**Files:**
- Create: `src/lib/adsense.ts`
- Modify: `index.html`, `src/main.tsx`, `.env.example`

- [ ] **Step 1: Add env var**

`.env.example`:
```
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
```

- [ ] **Step 2: src/lib/adsense.ts**

```typescript
const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT

export function injectAdsense(): void {
  if (!CLIENT || document.querySelector(`script[data-ad-client="${CLIENT}"]`)) return
  const s = document.createElement('script')
  s.async = true
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`
  s.crossOrigin = 'anonymous'
  s.setAttribute('data-ad-client', CLIENT)
  document.head.appendChild(s)
}
```

- [ ] **Step 3: Call from main.tsx**

```typescript
import { injectAdsense } from './lib/adsense'
injectAdsense()
```

- [ ] **Step 4: Add Funding Choices (CMP) snippet to index.html**

Inside `<head>`, paste the Funding Choices snippet from Google AdSense console (placeholder for now — user will fill once approved):
```html
<!-- Funding Choices CMP: replace ca-pub-XXXX with real publisher ID -->
<script async src="https://fundingchoicesmessages.google.com/i/pub-XXXX?ers=1"></script>
<script>(function() {function signalGooglefcPresent() { /* boilerplate from Google */ } signalGooglefcPresent();})();</script>
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ads): integrate AdSense + CMP placeholder"
```

## Task 32: Landing/FAQ/Privacy pages for AdSense approval

**Files:**
- Create: `src/pages/LandingPage.tsx`, `src/pages/FaqPage.tsx`, `src/pages/PrivacyPage.tsx`, `src/pages/TermsPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write LandingPage**

A real landing with hero, 3 features, 3 example screenshots, CTA. Spanish. ≥400 words to clear AdSense thin-content checks.

- [ ] **Step 2: Write FAQ (≥10 Q&A, ≥600 words total)**

- [ ] **Step 3: Privacy policy**

Standard ES text covering: data subido se guarda en Supabase (EU); IndexedDB local; cookies de Google AdSense/Funding Choices; derecho a borrar (instrucciones); contacto.

- [ ] **Step 4: Terms of use**

Disclaimer no-warranty, prohibición de subir datos sensibles, limitación de responsabilidad.

- [ ] **Step 5: Route in App.tsx**

```typescript
{ '/': 'landing', '/app': 'upload', '/faq': 'faq', '/privacy': 'privacy', '/terms': 'terms' }
```
Add navigation links in the footer of every page.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(seo): landing, faq, privacy, terms pages"
```

## Task 33: PWA manifest

**Files:**
- Create: `public/manifest.webmanifest`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/favicon.svg`
- Modify: `index.html`

- [ ] **Step 1: Manifest**

```json
{
  "name": "Excel to Sky",
  "short_name": "Excel→Sky",
  "description": "Convierte tu Excel en un dashboard visual compartible.",
  "lang": "es",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F7F6F2",
  "theme_color": "#2E6BFF",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Generate icons**

Use any 512×512 PNG (the user can provide a logo; otherwise generate a placeholder with a tool like `https://realfavicongenerator.net` or `ImageMagick`). Resize to 192×192. Place in `public/icons/`.

- [ ] **Step 3: Wire in index.html**

Add to `<head>`:
```html
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg" />
<meta name="theme-color" content="#2E6BFF" />
```

- [ ] **Step 4: Verify**

`npm run build && npm run preview`. Open Chrome DevTools → Application → Manifest. Should show "Installable" with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(pwa): add manifest and icons"
```

## Task 34: E2E test — happy path

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/upload-flow.spec.ts`, `tests/e2e/fixtures/sample.xlsx`

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test@^1.45
npx playwright install --with-deps chromium
```

- [ ] **Step 2: playwright.config.ts**

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://localhost:5173' },
})
```

- [ ] **Step 3: Create a tiny xlsx fixture**

Run once in a Node script (or by hand) to produce `tests/e2e/fixtures/sample.xlsx` with 5 columns × 50 rows mixing numbers, dates and categories. Commit the file.

- [ ] **Step 4: Write E2E test**

```typescript
import { test, expect } from '@playwright/test'
import path from 'node:path'

test('upload xlsx → dashboard renders columns', async ({ page }) => {
  await page.goto('/app')
  await page.setInputFiles('input[type=file]', path.resolve(__dirname, 'fixtures/sample.xlsx'))
  await expect(page.getByText(/columnas/i)).toBeVisible({ timeout: 10000 })
})
```

- [ ] **Step 5: Run**

```bash
npm run build
npx playwright test
```
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test(e2e): upload happy path with Playwright"
```

## Task 35: nginx config for Hostinger VPS

**Files:**
- Create: `deploy/nginx.conf`, `deploy/DEPLOY.md`

- [ ] **Step 1: nginx.conf**

```nginx
server {
  listen 80;
  server_name exceltosky.example;  # replace with real domain
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name exceltosky.example;

  ssl_certificate     /etc/letsencrypt/live/exceltosky.example/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/exceltosky.example/privkey.pem;

  root /var/www/exceltosky/dist;
  index index.html;

  # Long-cache assets
  location ~* \.(?:css|js|woff2?|png|jpg|svg|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
  }

  # SPA fallback
  location / {
    try_files $uri /index.html;
  }

  # Gzip
  gzip on;
  gzip_types text/plain text/css application/json application/javascript application/wasm image/svg+xml;
  gzip_min_length 1024;
}
```

- [ ] **Step 2: deploy/DEPLOY.md**

Write step-by-step:
1. SSH into the Hostinger VPS.
2. `apt install nginx certbot python3-certbot-nginx`.
3. Point DNS A record to VPS IP.
4. `certbot --nginx -d exceltosky.example`.
5. Copy `deploy/nginx.conf` to `/etc/nginx/sites-available/exceltosky` and symlink to `sites-enabled/`.
6. `nginx -t && systemctl reload nginx`.
7. Local build + scp: `npm run build && scp -r dist/* user@vps:/var/www/exceltosky/dist/`.
8. Deployment script `deploy/deploy.sh` for repeatability (rsync over ssh).

- [ ] **Step 3: Commit**

```bash
git add deploy/
git commit -m "chore(deploy): nginx config + deploy instructions"
```

## Task 36: First production deploy

- [ ] **Step 1: Set env vars locally**

Edit `.env.local` to point to the production Supabase project and the real AdSense `VITE_ADSENSE_CLIENT`. (AdSense client may still be the placeholder if approval pending; that's fine.)

- [ ] **Step 2: Build**

```bash
npm run build
```
Output goes to `dist/`.

- [ ] **Step 3: rsync to VPS**

```bash
rsync -avz --delete dist/ user@vps:/var/www/exceltosky/dist/
```

- [ ] **Step 4: Smoke-test in production**

Open the domain in a browser. Upload a tiny Excel. Generate share link. Open the share link in a private window. Confirm everything works end-to-end.

- [ ] **Step 5: Commit deployment marker**

```bash
git tag v1.0.0
git commit --allow-empty -m "chore: v1.0.0 deployed to production"
```

## Task 37: Cleanup — remove prototype directory

**Files:**
- Delete: `app/`

- [ ] **Step 1: Confirm parity**

Side-by-side compare the live site with the original prototype. If anything looks worse, fix it before deleting `app/`.

- [ ] **Step 2: Delete**

```bash
git rm -r app/
git commit -m "chore: remove old CDN-based prototype"
```

---

## Self-review notes

- All 12 decisions from the spec's "Decisiones cerradas" table are covered (stack → Task 1-2; backend → Tasks 21-26; hosting → Tasks 35-36; parsing → Task 15; type detection → Tasks 10-13; sharing → Tasks 25, 28-29; persistence → Task 18; PWA → Task 33; monetization → Task 31; TTL → Task 24 cron; rate limit → Task 25; permissions → Tasks 25-26).
- Type consistency: `Dataset`, `Column`, `ColumnType`, `LocalDashboard`, `CreatedDashboard` defined once and reused throughout.
- No placeholders left except: (a) `VITE_ADSENSE_CLIENT` value (user-specific), (b) domain name in nginx config (user-specific), (c) Funding Choices snippet (filled when AdSense approves) — all explicitly called out as expected user input, not engineering TODOs.
- AdSense approval can take weeks; Tasks 31-32 produce the integration even if approval is pending. User can also wire Adsterra as a swap-in by changing one script tag.
- Each phase ends with a test+build+tag gate so partial implementations are detectable.
