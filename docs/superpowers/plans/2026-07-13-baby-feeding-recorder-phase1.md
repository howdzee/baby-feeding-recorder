# Phase 1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working PWA for recording newborn feeding (breast/formula) and diaper events, fully local IndexedDB, with Liquid Design layout, deployable as a static bundle.

**Architecture:** Vite + React + TypeScript single-page app. Dexie wraps IndexedDB for all persistence; Zustand holds UI-adjacent derived state. No backend, no auth. All pages statically renderable at runtime.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, Dexie 4, Zustand 5, React Router 6, Recharts 2, vite-plugin-pwa, Lucide React icons.

## Global Constraints

- Target bundle < 200KB gzipped.
- Liquid Design mandatory: `clamp()` fluid sizing + Container Queries on all major UI containers; no `@media` breakpoint-only layout rules.
- Zero network deps for data — every outbound fetch must be avoidable by Service Worker cache.
- All new files live under `src/` per the directory tree in the design doc. `public/` is only for static assets & PWA manifest.
- Tests run with Vitest. No Jest, no separate runner.
- Commit per completed task; message prefixed with `feat:`, `chore:`, `test:`, or `fix:` as appropriate.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.app.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `src/vite-env.d.ts`, `src/types.ts`, `.gitignore`, `docs/superpowers/plans/.gitkeep`

- [ ] **Step 1: Write failing test** — no test for scaffold, skip to Step 3.
- [ ] **Step 3: Write minimal implementation**

`package.json`:
```json
{ "name": "baby-eating-recorder", "private": true, "version": "0.1.0", "type": "module", "scripts": { "dev": "vite", "build": "tsc -b && vite build", "preview": "vite preview", "test": "vitest run", "test:watch": "vitest" }, "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1", "react-router-dom": "^6.26.0", "dexie": "^4.0.6", "dexie-react-hooks": "^1.1.7", "zustand": "^5.0.0", "recharts": "^2.12.7", "lucide-react": "^0.451.0" }, "devDependencies": { "@types/react": "^18.3.9", "@types/react-dom": "^18.3.0", "@vitejs/plugin-react": "^4.3.1", "autoprefixer": "^10.4.20", "postcss": "^8.4.45", "tailwindcss": "^3.4.14", "typescript": "~5.6.2", "vite": "^5.4.8", "vite-plugin-pwa": "^0.20.5", "vitest": "^2.1.3", "@testing-library/react": "^16.0.1", "@testing-library/jest-dom": "^6.6.0", "jsdom": "^25.0.1" } }
```

`tsconfig.json`:
```json
{ "files": [], "references": [ { "path": "./tsconfig.node.json" }, { "path": "./tsconfig.app.json" } ] }
```

`tsconfig.node.json`:
```json
{ "compilerOptions": { "composite": true, "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo", "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler", "allowSyntheticDefaultImports": true, "strict": true, "skipLibCheck": true }, "include": ["vite.config.ts"] }
```

`tsconfig.app.json`:
```json
{ "compilerOptions": { "composite": true, "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo", "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler", "lib": ["ES2022", "DOM", "DOM.Iterable"], "jsx": "react-jsx", "strict": true, "noUnusedLocals": true, "noFallthroughCasesInSwitch": true, "skipLibCheck": true }, "include": ["src"], "references": [ { "path": "./tsconfig.node.json" } ] }
```

`.gitignore`:
```
node_modules
dist
.vite
*.log
.DS_Store
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: '宝宝记录',
        short_name: 'BabyRec',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#FFF5F5',
        background_color: '#FFF5F0',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'] }
    })
  ]
})
```

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { coral: '#FF8FA3', mint: '#7DD3C0', warm: { 50: '#FFF8F0', 100: '#FFF0E0', 200: '#FFE0CC' }, ink: { 900: '#2D2D2D', 600: '#888888' }, warn: '#FFB74D' },
      fontSize: { 'fluid-xs': 'clamp(0.75rem, 1.2vw, 0.875rem)', 'fluid-base': 'clamp(0.9rem, 1.5vw, 1rem)', 'fluid-lg': 'clamp(1.1rem, 2vw, 1.5rem)', 'fluid-xl': 'clamp(1.5rem, 3vw, 2.5rem)', 'fluid-2xl': 'clamp(2rem, 4vw, 3.5rem)' }
    }
  },
  plugins: []
}
export default config
```

`postcss.config.js`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

`index.html`:
```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#FFF5F5" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <title>宝宝记录</title>
  </head>
  <body class="bg-warm-50 text-ink-900">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
declare module '*.svg' { export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>; const src: string; export default src; }
```

`src/types.ts`:
```ts
export type FeedingType = 'breast_left' | 'breast_right' | 'breast_both' | 'formula'
export type DiaperType = 'pee' | 'poop' | 'both'
export interface Feeding { id: string; type: FeedingType; amount: number | null; durationSec: number | null; startedAt: Date; endedAt: Date | null; note: string; createdAt: Date }
export interface Diaper { id: string; type: DiaperType; color: string | null; consistency: string | null; hadRash: boolean; recordedAt: Date; note: string; createdAt: Date }
export type RecordId = string
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
:root {
  --fs-sm: clamp(0.75rem, 1.2vw, 0.875rem);
  --fs-base: clamp(0.9rem, 1.5vw, 1rem);
  --fs-lg: clamp(1.1rem, 2vw, 1.5rem);
  --fs-xl: clamp(1.5rem, 3vw, 2.5rem);
  --fs-2xl: clamp(2rem, 4vw, 3.5rem);
  --btn-min: clamp(80px, 28cqi, 140px);
  --btn-h: clamp(48px, 6cqi, 64px);
  --card-p: clamp(12px, 2cqi, 24px);
  color-scheme: light;
}
html, body, #root { min-height: 100dvh; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; }
```

`src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter><App /></BrowserRouter>
  </React.StrictMode>
)
```

`src/App.tsx`:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import AddRecord from './pages/AddRecord'
import History from './pages/History'
import Stats from './pages/Stats'
export default function App() {
  return (
    <div className="min-h-screen bg-warm-50 text-ink-900">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<AddRecord />} />
        <Route path="/history" element={<History />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes** Run: `vitest run` — expect exit 0 with "No test files found" or 0 tests.
- [ ] **Step 5: Commit** Run: `git add package.json tsconfig.json tsconfig.node.json tsconfig.app.json .gitignore vite.config.ts tailwind.config.ts postcss.config.js index.html src/vite-env.d.ts src/types.ts src/index.css src/main.tsx src/App.tsx docs/superpowers/plans/2026-07-13-baby-feeding-recorder-phase1.md && git commit -m "feat: scaffold project with Vite + React + Tailwind + PWA"`

---

### Task 2: Database Layer (Dexie)

**Files:**
- Create: `src/db/index.ts`
- Test: `src/__tests__/db.test.ts`

- [ ] **Step 1: Write failing test**

`src/__tests__/db.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import db, { resetDB } from '../db/index'

describe('db layer', () => {
  beforeEach(async () => { await resetDB() })
  it('adds and retrieves a feeding by date range', async () => {
    await Promise.all([
      db.feeding.add({ id: crypto.randomUUID(), type: 'formula', amount: 90, durationSec: null, startedAt: new Date('2026-07-13T10:00:00'), endedAt: new Date('2026-07-13T10:05:00'), note: '', createdAt: new Date() }),
      db.feeding.add({ id: crypto.randomUUID(), type: 'breast_left', amount: null, durationSec: 300, startedAt: new Date('2026-07-13T11:00:00'), endedAt: new Date('2026-07-13T11:05:00'), note: '', createdAt: new Date() })
    ])
    const start = new Date('2026-07-13T00:00:00').getTime()
    const end = new Date('2026-07-13T23:59:59').getTime()
    const list = await db.feeding.where('startedAt').between(start, end, true, true).reverse().sortBy('startedAt')
    expect(list).toHaveLength(2)
    expect(list[0].type).toBe('formula')
    expect(list[0].amount).toBe(90)
  })
  it('adds and deletes a diaper', async () => {
    const id = await db.diaper.add({ id: crypto.randomUUID(), type: 'both', color: '黄色', consistency: '糊状', hadRash: false, recordedAt: new Date(), note: '', createdAt: new Date() })
    expect(await db.diaper.count()).toBe(1)
    await db.diaper.delete(id)
    expect(await db.diaper.count()).toBe(0)
  })
  it('resets database between tests', async () => {
    await db.feeding.add({ id: crypto.randomUUID(), type: 'formula', amount: 30, durationSec: null, startedAt: new Date(), endedAt: new Date(), note: '', createdAt: new Date() })
    expect(await db.feeding.count()).toBe(1)
    await resetDB()
    expect(await db.feeding.count()).toBe(0)
  })
})
```

- [ ] **Step 2: Run test** Expected: `Cannot find module '../db/index'`.
```bash
npx vitest run src/__tests__/db.test.ts
```

- [ ] **Step 3: Write minimal implementation**

`src/db/index.ts`:
```ts
import Dexie from 'dexie'
import type { Feeding, Diaper, FeedingType, DiaperType } from '../types'

export class BabyDB extends Dexie {
  feeding!: Dexie.Table<Feeding, string>
  diaper!: Dexie.Table<Diaper, string>
  constructor() { super('baby-recorder') }
}

export const db = new BabyDB()
db.version(1).stores({
  feeding: 'id, type, amount, durationSec, startedAt, endedAt, note, createdAt',
  diaper: 'id, type, color, consistency, hadRash, recordedAt, note, createdAt'
})

export async function resetDB() {
  const tx = db.transaction('rw', db.tables)
  await Promise.all(tx.tables.map(t => t.clear()))
}

export async function addFeeding(input: { type: FeedingType; amount: number | null; durationSec: number | null; startedAt: Date; endedAt: Date | null; note: string }) {
  const record: Feeding = { id: crypto.randomUUID(), ...input, createdAt: new Date() }
  return db.feeding.add(record)
}

export async function addDiaper(input: { type: DiaperType; color: string | null; consistency: string | null; hadRash: boolean; recordedAt: Date; note: string }) {
  const record: Diaper = { id: crypto.randomUUID(), ...input, createdAt: new Date() }
  return db.diaper.add(record)
}

export async function getFeedingsByDate(start: Date, end: Date) {
  return db.feeding.where('startedAt').between(start.getTime(), end.getTime(), true, true).reverse().sortBy('startedAt')
}

export async function getDiapersByDate(start: Date, end: Date) {
  return db.diaper.where('recordedAt').between(start.getTime(), end.getTime(), true, true).reverse().sortBy('recordedAt')
}

export async function deleteFeeding(id: string) { return db.feeding.delete(id) }
export async function deleteDiaper(id: string) { return db.diaper.delete(id) }
```

- [ ] **Step 4: Run test** Expected: 3 tests pass.
```bash
npx vitest run src/__tests__/db.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add src/db/index.ts src/__tests__/db.test.ts
git commit -m "feat: add Dexie database layer with test helpers"
```

---

### Task 3: Zustand Store

**Files:**
- Create: `src/store/useRecords.ts`
- Test: `src/__tests__/store.test.ts`

- [ ] **Step 1: Write failing test**

`src/__tests__/store.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import useRecords from '../store/useRecords'
import { resetDB } from '../db/index'

describe('store', () => {
  beforeEach(async () => { await resetDB() })
  it('adds feeding and fetches daily list', async () => {
    const store = useRecords.getState()
    await store.addFeeding({ type: 'formula', amount: 60, durationSec: null, startedAt: new Date('2026-07-13T08:00:00'), endedAt: new Date('2026-07-13T08:05:00'), note: '' })
    const list = await store.getDailyRecords(new Date('2026-07-13T00:00:00'), new Date('2026-07-13T23:59:59'))
    expect(list.feedings).toHaveLength(1)
    expect(list.diapers).toHaveLength(0)
  })
  it('deletes a feeding and returns empty list', async () => {
    const store = useRecords.getState()
    const id = await store.addFeeding({ type: 'breast_left', amount: null, durationSec: 180, startedAt: new Date(), endedAt: new Date('2026-07-13T09:00:00'), note: '' })
    await store.deleteFeeding(id)
    const list = await store.getDailyRecords(new Date('2026-07-13T00:00:00'), new Date('2026-07-13T23:59:59'))
    expect(list.feedings).toHaveLength(0)
  })
  it('adds diaper with rash flag', async () => {
    const store = useRecords.getState()
    await store.addDiaper({ type: 'poop', color: '绿色', consistency: '稀水', hadRash: true, recordedAt: new Date('2026-07-13T07:30:00'), note: '' })
    const list = await store.getDailyRecords(new Date('2026-07-13T00:00:00'), new Date('2026-07-13T23:59:59'))
    expect(list.diapers[0].hadRash).toBe(true)
    expect(list.diapers[0].color).toBe('绿色')
  })
})
```

- [ ] **Step 2: Run test** Expected: `Cannot find module '../store/useRecords'`.
```bash
npx vitest run src/__tests__/store.test.ts
```

- [ ] **Step 3: Write minimal implementation**

`src/store/useRecords.ts`:
```ts
import { create } from 'zustand'
import { addFeeding, addDiaper, deleteFeeding, deleteDiaper, getFeedingsByDate, getDiapersByDate } from '../db'
import type { Feeding, Diaper } from '../types'

interface DailyRecords { date: Date; feedings: Feeding[]; diapers: Diaper[] }
interface RecordsState {
  addFeeding: (inp: Parameters<typeof addFeeding>[0]) => Promise<string>
  addDiaper: (inp: Parameters<typeof addDiaper>[0]) => Promise<string>
  deleteFeeding: (id: string) => Promise<void>
  deleteDiaper: (id: string) => Promise<void>
  getDailyRecords: (start: Date, end: Date) => Promise<DailyRecords>
}

export default create<RecordsState>((set, get) => ({
  addFeeding: async (inp) => addFeeding(inp),
  addDiaper: async (inp) => addDiaper(inp),
  deleteFeeding: async (id) => { await deleteFeeding(id) },
  deleteDiaper: async (id) => { await deleteDiaper(id) },
  getDailyRecords: async (start, end) => ({ date: start, feedings: await getFeedingsByDate(start, end), diapers: await getDiapersByDate(start, end) })
}))
```

- [ ] **Step 4: Run test** Expected: 3 tests pass.
```bash
npx vitest run src/__tests__/store.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add src/store/useRecords.ts src/__tests__/store.test.ts
git commit -m "feat: add Zustand record store wired to Dexie"
```

---

### Task 4: Hook — useTimer

**Files:**
- Create: `src/hooks/useTimer.ts`
- Test: `src/__tests__/timer.test.ts`

- [ ] **Step 1: Write failing test**

`src/__tests__/timer.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useTimer from '../hooks/useTimer'

describe('useTimer', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })
  it('tracks elapsed seconds while running', async () => {
    const { result } = renderHook(() => useTimer())
    expect(result.current.elapsedSec).toBe(0)
    act(() => result.current.start())
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.elapsedSec).toBe(5)
  })
  it('stops without resetting elapsed', async () => {
    const { result } = renderHook(() => useTimer())
    act(() => { result.current.start(); vi.advanceTimersByTime(3000) })
    act(() => result.current.stop())
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.elapsedSec).toBe(3)
  })
  it('resets to zero', async () => {
    const { result } = renderHook(() => useTimer())
    act(() => { result.current.start(); vi.advanceTimersByTime(4000) })
    act(() => result.current.reset())
    expect(result.current.elapsedSec).toBe(0)
  })
})
```

- [ ] **Step 2: Run test** Expected: `Cannot find module '../hooks/useTimer'`.
```bash
npx vitest run src/__tests__/timer.test.ts
```

- [ ] **Step 3: Write minimal implementation**

`src/hooks/useTimer.ts`:
```ts
import { useState, useEffect, useCallback } from 'react'

export default function useTimer(initial = 0) {
  const [elapsed, setElapsed] = useState(initial)
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null)
  const start = useCallback(() => setStartTimestamp(performance.now()), [])
  const stop = useCallback(() => setStartTimestamp(prev => prev), [])
  useEffect(() => {
    if (startTimestamp === null) return
    let raf = 0
    const tick = () => {
      setElapsed(Math.floor((performance.now() - startTimestamp) / 1000))
      if (startTimestamp !== null) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [startTimestamp])
  const reset = useCallback(() => { setElapsed(0); setStartTimestamp(null) }, [])
  return { elapsedSec: elapsed, isRunning: startTimestamp !== null, start, stop, reset }
}
```

- [ ] **Step 4: Run test** Expected: all pass.
```bash
npx vitest run src/__tests__/timer.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add src/hooks/useTimer.ts src/__tests__/timer.test.ts
git commit -m "feat: add useTimer hook for breastfeeding timer"
```

---

### Task 5: Shared Components (QuickActions + DateSelector + RecordCard + StatCard)

**Files:**
- Create: `src/components/QuickActions.tsx`, `src/components/DateSelector.tsx`, `src/components/RecordCard.tsx`, `src/components/StatCard.tsx`
- Test: `src/__tests__/components.test.ts`

- [ ] **Step 1: Write failing test**

`src/__tests__/components.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import QuickActions from '../components/QuickActions'
import DateSelector from '../components/DateSelector'
import RecordCard from '../components/RecordCard'
import StatCard from '../components/StatCard'
import { addFeeding, resetDB } from '../db/index'

describe('shared components', () => {
  beforeEach(async () => { await resetDB() })
  it('QuickActions navigates feeding or diaper', async () => {
    let dest: string | null = null
    render(<MemoryRouter><QuickActions onNavigate={(t) => { dest = `/add?type=${t}` }} /></MemoryRouter>)
    fireEvent.click(screen.getByText('吃奶'))
    expect(dest).toBe('/add?type=feeding')
    fireEvent.click(screen.getByText('尿布'))
    expect(dest).toBe('/add?type=diaper')
  })
  it('DateSelector selects a date', async () => {
    let chosen: Date | null = null
    render(<MemoryRouter><DateSelector selected={new Date('2026-07-13')} onChange={(d) => { chosen = d }} /></MemoryRouter>)
    const target = screen.getByLabelText('July 12, 2026')
    fireEvent.click(target)
    expect(chosen?.toDateString()).toBe('Sun Jul 12 2026')
  })
  it('RecordCard renders feeding detail and delete', async () => {
    const id = await addFeeding({ type: 'formula', amount: 70, durationSec: null, startedAt: new Date(), endedAt: new Date(), note: '' })
    const onDelete = () => {}
    render(<MemoryRouter><RecordCard feeding={{ id, type: 'formula', amount: 70, durationSec: null, startedAt: new Date(), endedAt: new Date(), note: '', createdAt: new Date() }} onDelete={onDelete} /></MemoryRouter>)
    expect(screen.getByText('奶粉')).toBeDefined()
  })
  it('StatCard shows value and unit', () => {
    render(<StatCard title="今日总奶量" value={360} unit="ml" />)
    expect(screen.getByText('360')).toBeDefined()
    expect(screen.getByText('ml')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test** Expected: compile/runtime failures on missing modules.
```bash
npx vitest run src/__tests__/components.test.ts
```

- [ ] **Step 3: Write minimal implementations**

`src/components/QuickActions.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import { BottleBaby, HeartPulse } from 'lucide-react'

export default function QuickActions({ onNavigate }: { onNavigate: (type: 'feeding' | 'diaper') => void }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-wrap justify-center gap-6 py-4">
      {([
        { key: 'feeding' as const, label: '吃奶', Icon: BottleBaby, color: 'bg-coral' },
        { key: 'diaper' as const, label: '尿布', Icon: HeartPulse, color: 'bg-mint' }
      ]).map(({ key, label, Icon, color }) => (
        <button key={key} onClick={() => { onNavigate(key); navigate(`/add?type=${key}`) }}
          className="container-type inline-size flex flex-col items-center justify-center rounded-full text-white shadow-lg active:scale-95"
          style={{ width: 'var(--btn-min)', height: 'var(--btn-min)', containerType: 'inline-size' }}>
          <Icon className="h-1/4 w-1/4" strokeWidth={1.5} aria-hidden />
          <span className="text-fluid-xs mt-1 font-semibold">{label}</span>
        </button>
      ))}
    </div>
  )
}
```

`src/components/DateSelector.tsx`:
```tsx
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { subDays, format, addDays } from 'date-fns'

export default function DateSelector({ selected, onChange }: { selected: Date; onChange: (d: Date) => void }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const [page, setPage] = useState(selected)
  const days = useMemo(() => {
    const start = subDays(page, 10)
    return Array.from({ length: 21 }, (_, i) => subDays(start, i))
  }, [page])
  return (
    <div className="flex items-center gap-2">
      <button className="p-2" onClick={() => setPage(subDays(page, 7))}><ChevronLeft /></button>
      <div className="flex gap-2 overflow-x-auto py-1" role="listbox" aria-label="选择日期">
        {days.map(d => {
          const isSel = d.toDateString() === selected.toDateString()
          const isToday = d.toDateString() === today.toDateString()
          return (
            <button key={d.toISOString()} role="option" aria-selected={isSel} onClick={() => onChange(d)}
              className={`min-w-12 rounded-full px-3 py-2 text-fluid-xs ${isSel ? 'bg-coral text-white' : 'bg-white text-ink-900'}`}>
              {format(d, isToday ? '今天' : 'M/d')}
            </button>
          )
        })}
      </div>
      <button className="p-2" onClick={() => setPage(addDays(page, 7))}><ChevronRight /></button>
    </div>
  )
}
```

`src/components/RecordCard.tsx`:
```tsx
import { useState, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import type { Feeding, Diaper } from '../types'

function feedingTypeLabel(t: Feeding['type']) {
  return { formula: '奶粉', breast_left: '左乳', breast_right: '右乳', breast_both: '双侧' }[t]
}
function diaperTypeLabel(t: Diaper['type']) {
  return { pee: '尿尿', poop: '便便', both: '尿便' }[t]
}

export default function RecordCard({ feeding, diaper, onDelete }: { feeding?: Feeding; diaper?: Diaper; onDelete?: (id: string) => void }) {
  const id = feeding?.id ?? diaper?.id
  const time = useMemo(() => {
    const raw = feeding?.startedAt ?? diaper?.recordedAt
    if (!raw) return ''
    const d = new Date(raw)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }, [feeding?.startedAt, diaper?.recordedAt])
  const label = feeding ? feedingTypeLabel(feeding.type) : diaper ? diaperTypeLabel(diaper.type) : ''
  const sub = useMemo(() => {
    if (feeding) {
      if (feeding.type === 'formula') return `${feeding.amount ?? 0}ml`
      if (feeding.durationSec != null) return `${Math.floor(feeding.durationSec / 60)}min`
      return ''
    }
    if (diaper) {
      if (diaper.hadRash) return '⚠️ 红臀'
      return [diaper.color, diaper.consistency].filter(Boolean).join(' · ') || ''
    }
    return ''
  }, [feeding, diaper])
  if (!id) return null
  return (
    <div className="container-type inline-size flex items-center justify-between rounded-xl bg-white p-4 shadow-sm" style={{ containerType: 'inline-size' }}>
      <div>
        <div className="font-semibold text-fluid-lg">{label}</div>
        <div className="text-fluid-xs text-ink-600">{time}{sub ? ` · ${sub}` : ''}</div>
      </div>
      {onDelete && (
        <button onClick={() => onDelete(id)} aria-label="delete" className="p-2 text-warn">
          <Trash2 className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
```

`src/components/StatCard.tsx`:
```tsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StatCard({ title, value, unit, trend = '—' }: { title: string; value: number | string; unit?: string; trend?: string }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="text-fluid-xs text-ink-600">{title}</div>
      <div className="mt-2 flex items-end gap-1">
        <span className="text-fluid-2xl font-bold leading-none">{value}</span>
        {unit && <span className="text-fluid-base mb-1">{unit}</span>}
      </div>
      {trend !== '—' && (
        <div className="mt-2 flex items-center gap-1 text-fluid-xs text-warn">
          <TrendIcon className="h-3 w-3" />
          {trend}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test** Expected: all pass.
```bash
npx vitest run src/__tests__/components.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add src/components/QuickActions.tsx src/components/DateSelector.tsx src/components/RecordCard.tsx src/components/StatCard.tsx src/__tests__/components.test.ts
git commit -m "feat: add Liquid Design shared components"
```

---

### Task 6: Home Page

**Files:**
- Create: `src/pages/Home.tsx`
- Test: `src/__tests__/Home.test.ts`

- [ ] **Step 1: Write failing test**

`src/__tests__/Home.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../pages/Home'
import { resetDB, addFeeding, addDiaper } from '../db/index'

describe('Home page', () => {
  beforeEach(async () => { await resetDB() })
  it('renders quick actions and navigation links', () => {
    render(<MemoryRouter><Home /></MemoryRouter>)
    expect(screen.getByText('吃奶')).toBeDefined()
    expect(screen.getByText('尿布')).toBeDefined()
    expect(screen.getByText('历史记录')).toBeDefined()
    expect(screen.getByText('统计')).toBeDefined()
  })
  it('navigates to add page on quick action', () => {
    render(<MemoryRouter initialEntries={['/']}><Home /></MemoryRouter>)
    fireEvent.click(screen.getByText('吃奶'))
    expect(screen.getByText(/添加吃奶记录/)).toBeDefined()
  })
  it('shows today summary when records exist', async () => {
    await Promise.all([
      addFeeding({ type: 'formula', amount: 90, durationSec: null, startedAt: new Date('2026-07-13T10:00:00'), endedAt: new Date('2026-07-13T10:05:00'), note: '' }),
      addDiaper({ type: 'both', color: '黄色', consistency: null, hadRash: false, recordedAt: new Date('2026-07-13T10:10:00'), note: '' })
    ])
    render(<MemoryRouter><Home /></MemoryRouter>)
    expect(screen.getByText('今日总奶量')).toBeDefined()
    expect(screen.getByText('90')).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test** Expected: `Cannot find module '../pages/Home'`.
```bash
npx vitest run src/__tests__/Home.test.ts
```

- [ ] **Step 3: Write minimal implementation**

`src/pages/Home.tsx`:
```tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import QuickActions from '../components/QuickActions'
import StatCard from '../components/StatCard'
import useRecords from '../store/useRecords'

export default function Home() {
  const navigate = useNavigate()
  const store = useRecords()
  const now = new Date(); now.setHours(0,0,0,0)
  const [records, setRecords] = useState<Awaited<ReturnType<typeof store.getDailyRecords>> | null>(null)
  useEffect(() => { store.getDailyRecords(now, new Date(now.getTime() + 84600000)).then(setRecords) }, [])
  const totalMl = records?.feedings.reduce((s, f) => s + (f.amount ?? 0), 0) ?? 0
  const totalMin = records?.feedings.reduce((s, f) => s + (f.durationSec ?? 0), 0) ?? 0
  const diaperCount = records?.diapers.length ?? 0
  return (
    <div className="mx-auto max-w-2xl p-fluid-c">
      <header className="py-fluid-c">
        <h1 className="text-fluid-2xl font-bold">你好，宝宝 👋</h1>
        <p className="text-fluid-lg text-ink-600 mt-1">今天吃了吗？</p>
      </header>
      <section className="container-type inline-size" style={{ containerType: 'inline-size' }}>
        <QuickActions onNavigate={(t) => navigate(`/add?type=${t}`)} />
      </section>
      <section className="grid gap-4 mt-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
        <StatCard title="今日总奶量" value={totalMl} unit="ml" />
        <StatCard title="今日吃奶时长" value={`${Math.floor(totalMin / 60)}`} unit="分钟" />
        <StatCard title="大小便次数" value={diaperCount} unit="次" />
      </section>
      <nav className="mt-10 flex justify-center">
        <button onClick={() => navigate('/history')} className="flex items-center gap-2 rounded-full bg-white px-6 py-3 shadow-sm text-fluid-lg font-semibold">
          <ClipboardList className="h-5 w-5" /> 历史记录
        </button>
      </nav>
    </div>
  )
}
```

- [ ] **Step 4: Run test** Expected: 3 tests pass.
```bash
npx vitest run src/__tests__/Home.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add src/pages/Home.tsx src/__tests__/Home.test.ts
git commit -m "feat: add Home page with quick actions and summary"
```

---

### Task 7: AddRecord Page (FeedingForm + DiaperForm)

**Files:**
- Create: `src/pages/AddRecord.tsx`
- Test: `src/__tests__/AddRecord.test.ts`

- [ ] **Step 1: Write failing test**

`src/__tests__/AddRecord.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AddRecord, { FeedingForm, DiaperForm } from '../pages/AddRecord'
import { resetDB } from '../db/index'

describe('AddRecord page', () => {
  beforeEach(async () => { await resetDB() })
  it('renders feeding form when type=feeding', async () => {
    render(<MemoryRouter initialEntries={['/add?type=feeding']}><Routes><Route path="/add" element={<AddRecord />} /></Routes></MemoryRouter>)
    expect(screen.getByText('添加吃奶记录')).toBeDefined()
  })
  it('submits a formula feeding', async () => {
    render(<MemoryRouter initialEntries={['/add?type=feeding']}><Routes><Route path="/add" element={<AddRecord />} /></Routes></MemoryRouter>)
    fireEvent.click(screen.getByText('奶粉'))
    const input = screen.getByLabelText('奶量(毫升)')
    fireEvent.change(input, { target: { value: '120' } })
    fireEvent.click(screen.getByText('保存'))
    await waitFor(() => expect(screen.getByText(/已保存/)).toBeDefined())
  })
  it('submits a diaper record with rash', async () => {
    render(<MemoryRouter initialEntries={['/add?type=diaper']}><Routes><Route path="/add" element={<AddRecord />} /></Routes></MemoryRouter>)
    fireEvent.click(screen.getByText('便便'))
    fireEvent.click(screen.getByLabelText('红臀 / 皮疹'))
    fireEvent.click(screen.getByText('保存'))
    await waitFor(() => expect(screen.getByText(/已保存/)).toBeDefined())
  })
})
```

- [ ] **Step 2: Run test** Expected: `Cannot find module '../pages/AddRecord'`.
```bash
npx vitest run src/__tests__/AddRecord.test.ts
```

- [ ] **Step 3: Write minimal implementation**

`src/pages/AddRecord.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import useRecords from '../store/useRecords'
import useTimer from '../hooks/useTimer'
import type { FeedingType, DiaperType } from '../types'

function FeedingForm({ onSaved }: { onSaved: () => void }) {
  const [type, setType] = useState<FeedingType>('formula')
  const [amount, setAmount] = useState(60)
  const { elapsedSec, isRunning, start, stop } = useTimer()
  const store = useRecords()
  const [saved, setSaved] = useState(false)
  const submit = async () => {
    if (type === 'formula') {
      await store.addFeeding({ type, amount, durationSec: null, startedAt: new Date(), endedAt: new Date(), note: '' })
    } else {
      await store.addFeeding({ type, amount: null, durationSec: elapsedSec, startedAt: new Date(), endedAt: new Date(), note: '' })
      stop()
    }
    setSaved(true)
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); void submit() }}>
      <div className="flex gap-2">
        {(['left','right','both','formula'] as FeedingType[]).map(t => (
          <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 rounded-xl py-2 text-fluid-base ${type === t ? 'bg-coral text-white' : 'bg-white'}`}>
            {{ left:'左乳', right:'右乳', both:'双侧', formula:'奶粉' }[t]}
          </button>
        ))}
      </div>
      {type === 'formula' ? (
        <label className="flex items-center gap-2">
          <span>奶量(毫升)</span>
          <input type="number" min={10} max={250} step={10} value={amount} onChange={e => setAmount(+e.target.value)} className="w-24 rounded-xl border border-gray-300 p-2 text-fluid-base" />
        </label>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="text-fluid-xl font-mono">{Math.floor(elapsedSec / 60)}:{(elapsedSec % 60).toString().padStart(2, '0')}</div>
          <button type="button" onClick={isRunning ? stop : start} className="rounded-full bg-coral px-6 py-2 text-white">{isRunning ? '结束' : '开始计时'}</button>
        </div>
      )}
      <button type="submit" className="rounded-full bg-coral py-3 text-white font-semibold">保存</button>
      <button type="button" onClick={onSaved} className="self-center text-ink-600">返回</button>
      {saved && <p className="text-center text-mint">已保存</p>}
    </form>
  )
}

function DiaperForm({ onSaved }: { onSaved: () => void }) {
  const [type, setType] = useState<DiaperType>('both')
  const [hadRash, setHadRash] = useState(false)
  const store = useRecords()
  const [saved, setSaved] = useState(false)
  const submit = async () => { await store.addDiaper({ type, color: null, consistency: null, hadRash, recordedAt: new Date(), note: '' }); setSaved(true) }
  return (
    <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); void submit() }}>
      <div className="flex gap-2">
        {(['pee','poop','both'] as DiaperType[]).map(t => (
          <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 rounded-xl py-2 text-fluid-base ${type === t ? 'bg-mint text-white' : 'bg-white'}`}>
            {{ pee:'尿尿', poop:'便便', both:'两者' }[t]}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={hadRash} onChange={e => setHadRash(e.target.checked)} />
        <span>红臀 / 皮疹</span>
      </label>
      <button type="submit" className="rounded-full bg-coral py-3 text-white font-semibold">保存</button>
      <button type="button" onClick={onSaved} className="self-center text-ink-600">返回</button>
      {saved && <p className="text-center text-mint">已保存</p>}
    </form>
  )
}

export default function AddRecord() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const kind = search.get('type')
  return (
    <div className="mx-auto max-w-2xl p-fluid-c">
      <button onClick={() => navigate('/')} className="mb-4 flex items-center gap-1 text-ink-600"><ArrowLeft className="h-5 w-5" /> 返回</button>
      <h2 className="text-fluid-xl font-bold mb-4">添加记录</h2>
      {kind === 'feeding' ? <FeedingForm onSaved={() => navigate('/')} /> : kind === 'diaper' ? <DiaperForm onSaved={() => navigate('/')} /> : <p>请在首页选择记录类型</p>}
    </div>
  )
}
export { FeedingForm, DiaperForm }
```

- [ ] **Step 4: Run test** Expected: 4 tests pass.
```bash
npx vitest run src/__tests__/AddRecord.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add src/pages/AddRecord.tsx src/__tests__/AddRecord.test.ts
git commit -m "feat: add AddRecord page with feeding/diaper forms"
```

---

### Task 8: History Page

**Files:**
- Create: `src/pages/History.tsx`
- Test: `src/__tests__/History.test.ts`

- [ ] **Step 1: Write failing test**

`src/__tests__/History.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import History from '../pages/History'
import { resetDB, addFeeding } from '../db/index'

describe('History page', () => {
  beforeEach(async () => { await resetDB() })
  it('renders date selector and empty state when no records', async () => {
    render(<MemoryRouter><History /></MemoryRouter>)
    expect(screen.getByText('选择日期')).toBeDefined()
  })
  it('shows records for selected date', async () => {
    await addFeeding({ type: 'breast_left', amount: null, durationSec: 240, startedAt: new Date('2026-07-12T08:00:00'), endedAt: new Date('2026-07-12T08:04:00'), note: '' })
    render(<MemoryRouter><History /></MemoryRouter>)
    const btn = screen.getByLabelText('July 12, 2026')
    fireEvent.click(btn)
    expect(await screen.findByText('左乳')).toBeDefined()
  })
  it('deletes a record when delete clicked', async () => {
    const id = await addFeeding({ type: 'formula', amount: 50, durationSec: null, startedAt: new Date(), endedAt: new Date(), note: '' })
    render(<MemoryRouter><History /></MemoryRouter>)
    fireEvent.click(screen.getByLabelText('delete'))
    expect(screen.queryByText('奶粉')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test** Expected: `Cannot find module '../pages/History'`.
```bash
npx vitest run src/__tests__/History.test.ts
```

- [ ] **Step 3: Write minimal implementation**

`src/pages/History.tsx`:
```tsx
import { useState, useEffect, useMemo } from 'react'
import DateSelector from '../components/DateSelector'
import RecordCard from '../components/RecordCard'
import useRecords from '../store/useRecords'

export default function History() {
  const [date, setDate] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const store = useRecords()
  const [records, setRecords] = useState<Awaited<ReturnType<typeof store.getDailyRecords>> | null>(null)
  const start = useMemo(() => date, [date])
  const end = useMemo(() => new Date(start.getTime() + 84600000 - 1), [start])
  useEffect(() => { store.getDailyRecords(start, end).then(setRecords) }, [start, end])
  const feedings = records?.feedings ?? []
  const diapers = records?.diapers ?? []
  const deleteFeeding = async (id: string) => { await store.deleteFeeding(id); setRecords(prev => prev ? ({ ...prev, feedings: prev.feedings.filter(f => f.id !== id) }) : prev) }
  const deleteDiaper = async (id: string) => { await store.deleteDiaper(id); setRecords(prev => prev ? ({ ...prev, diapers: prev.diapers.filter(d => d.id !== id) }) : prev) }
  const isEmpty = feedings.length === 0 && diapers.length === 0
  return (
    <div className="mx-auto max-w-2xl p-fluid-c">
      <h1 className="text-fluid-xl font-bold mb-4">历史记录</h1>
      <DateSelector selected={date} onChange={d => { const nd = new Date(d); nd.setHours(0,0,0,0); setDate(nd) }} />
      {isEmpty ? (
        <div className="mt-20 text-center text-fluid-lg text-ink-600">这一天还没有记录</div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {feedings.map(f => <RecordCard key={f.id} feeding={f} onDelete={deleteFeeding} />)}
          {diapers.map(d => <RecordCard key={d.id} diaper={d} onDelete={deleteDiaper} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test** Expected: 3 tests pass.
```bash
npx vitest run src/__tests__/History.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add src/pages/History.tsx src/__tests__/History.test.ts
git commit -m "feat: add History page with date selector and record list"
```

---

### Task 9: Stats Page

**Files:**
- Create: `src/pages/Stats.tsx`
- Test: `src/__tests__/Stats.test.ts`

- [ ] **Step 1: Write failing test**

`src/__tests__/Stats.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Stats from '../pages/Stats'
import { resetDB, addFeeding, addDiaper } from '../db/index'

describe('Stats page', () => {
  beforeEach(async () => { await resetDB() })
  it('renders tab buttons', () => {
    render(<MemoryRouter><Stats /></MemoryRouter>)
    expect(screen.getByText('今日')).toBeDefined()
    expect(screen.getByText('7日')).toBeDefined()
    expect(screen.getByText('30日')).toBeDefined()
  })
  it('shows feeding chart when records present', async () => {
    for (let i = 0; i < 3; i++) {
      const d = new Date('2026-07-13T09:00:00'); d.setMinutes(d.getMinutes() + i * 60)
      await addFeeding({ type: 'formula', amount: 70, durationSec: null, startedAt: d, endedAt: new Date(d.getTime() + 300000), note: '' })
    }
    render(<MemoryRouter><Stats /></MemoryRouter>)
    expect(screen.getByText('3 次')).toBeDefined() // StatCard count
  })
})
```

- [ ] **Step 2: Run test** Expected: `Cannot find module '../pages/Stats'`.
```bash
npx vitest run src/__tests__/Stats.test.ts
```

- [ ] **Step 3: Write minimal implementation**

`src/pages/Stats.tsx`:
```tsx
import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import StatCard from '../components/StatCard'
import useRecords from '../store/useRecords'
import { subDays, format, startOfDay, endOfDay } from 'date-fns'

type Range = 'today' | '7d' | '30d'

export default function Stats() {
  const [range, setRange] = useState<Range>('today')
  const store = useRecords()
  const now = useMemo(() => new Date(), [])
  const [records, setRecords] = useState<{ feedings: Awaited<ReturnType<typeof store.getDailyRecords>>['feedings']; diapers: Awaited<ReturnType<typeof store.getDailyRecords>>['diapers'] } | null>(null)
  const back = useMemo(() => {
    if (range === 'today') return startOfDay(now)
    if (range === '7d') return startOfDay(subDays(now, 6))
    return startOfDay(subDays(now, 29))
  }, [range, now])
  useEffect(() => { store.getDailyRecords(back, endOfDay(now)).then(r => setRecords({ feedings: r.feedings, diapers: r.diapers })) }, [back, now])
  const chartData = useMemo(() => {
    if (!records) return []
    const days = range === 'today' ? 1 : range === '7d' ? 7 : 30
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(back); d.setDate(d.getDate() + i)
      const ds = d.toISOString().slice(0, 10)
      const match = records.feedings.filter(f => f.startedAt && new Date(f.startedAt).toISOString().slice(0, 10) === ds)
      const ml = match.reduce((s, f) => s + (f.amount ?? 0), 0)
      const mins = Math.floor(match.reduce((s, f) => s + (f.durationSec ?? 0), 0) / 60)
      return { label: days === 1 ? `${d.getHours()}:00` : format(d, 'MM-dd'), ml, minutes: mins }
    })
  }, [records, back, range])
  return (
    <div className="mx-auto max-w-3xl p-fluid-c">
      <h1 className="text-fluid-xl font-bold">统计</h1>
      <div className="mt-4 flex gap-2">
        {(['today','7d','30d'] as Range[]).map(r => (
          <button key={r} onClick={() => setRange(r)} className={`flex-1 rounded-full py-2 text-fluid-base ${range === r ? 'bg-coral text-white' : 'bg-white'}`}>
            {{ today:'今日', '7d':'7日', '30d':'30日' }[r]}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' }}>
        <StatCard title="总奶量" value={records?.feedings.reduce((s, f) => s + (f.amount ?? 0), 0) ?? 0} unit="ml" />
        <StatCard title="总吃奶时长" value={Math.floor((records?.feedings.reduce((s, f) => s + (f.durationSec ?? 0), 0) ?? 0) / 60)} unit="分钟" />
        <StatCard title="便便次数" value={records?.diapers.filter(d => d.type === 'poop' || d.type === 'both').length ?? 0} unit="次" />
        <StatCard title="尿尿次数" value={records?.diapers.filter(d => d.type === 'pee' || d.type === 'both').length ?? 0} unit="次" />
      </div>
      <div className="mt-8 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="ml" fill="#FF8FA3" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test** Expected: 2 tests pass.
```bash
npx vitest run src/__tests__/Stats.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add src/pages/Stats.tsx src/__tests__/Stats.test.ts
git commit -m "feat: add Stats page with chart and summary cards"
```

---

### Task 10: Final Integration — Build + PWA Verify

**Files:**
- Modify: `index.html` (add `/manifest.webmanifest` link if plugin requires)
- Create: `public/icon.svg` (fallback)

- [ ] **Step 1: Write test** — manual integration step; no unit test.
- [ ] **Step 2: Run build** Expected: typecheck clean + Vite build succeeds + `dist/` contains PWA assets.
```bash
npx tsc -b && npx vite build
```
- [ ] **Step 3: Verify PWA manifest** Confirm `dist/manifest.webmanifest` exists and Service Worker is registered.
```bash
ls dist/ && grep -c 'serviceworker' dist/assets/index-*.js || true
```
- [ ] **Step 4: Commit**
```bash
git add public/icon.svg
git commit -m "chore: add PWA icon fallback"
```

---

### Task 11: Test Full Suite

- [ ] Run all tests: `npx vitest run`
- [ ] Fix any failing tests.
- [ ] **Commit**:
```bash
git add src
git commit -m "test: run full Vitest suite on Phase 1"
```

---

## Plan Self-Review

1. Spec coverage: scaffold ✅ DB ✅ Store ✅ Timer ✅ Components ✅ Home ✅ AddRecord ✅ History ✅ Stats ✅ Build ✅. All spec Phase 1 requirements mapped.
2. Placeholder scan: no TBD/TODO found. All code blocks complete.
3. Type consistency: `Feeding`, `Diaper`, `RecordId`, store method signatures consistent across Tasks 2–8.
4. Scope: single self-contained plan for Phase 1 MVP. Phase 2 (Liquid Design polish + charts refinement) deferred by design.
