import type { Feeding, Diaper, FeedingType, DiaperType } from '../types'

const API = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')

// ── type display maps ──────────────────────────────────────────────

export const FEEDING_TYPE_LABEL: Record<FeedingType, string> = {
  breast_left: '左乳',
  breast_right: '右乳',
  breast_both: '双侧',
  breast_bottle: '母乳瓶喂',
  formula: '配方奶粉',
}

export const FEEDING_TYPE_VALUE: Record<string, FeedingType> = {
  左乳: 'breast_left',
  右乳: 'breast_right',
  双侧: 'breast_both',
  母乳瓶喂: 'breast_bottle',
  配方奶粉: 'formula',
}

export const DIAPER_TYPE_LABEL: Record<DiaperType, string> = {
  pee: '尿尿',
  poop: '便便',
  both: '都有',
}

export const DIAPER_TYPE_VALUE: Record<string, DiaperType> = {
  尿尿: 'pee',
  便便: 'poop',
  都有: 'both',
}

export function feedingLabel(type: FeedingType): string {
  return FEEDING_TYPE_LABEL[type] ?? type
}

export function diaperLabel(type: DiaperType): string {
  return DIAPER_TYPE_LABEL[type] ?? type
}

export function formatDateTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── data conversion ────────────────────────────────────────────────

function toFeeding(r: Record<string, unknown>): Feeding {
  return {
    id: r.id as string,
    type: r.type as FeedingType,
    amount: (r.amount ?? null) as number | null,
    durationSec: (r.durationSec ?? null) as number | null,
    startedAt: new Date(r.startedAt as number),
    endedAt: r.endedAt != null ? new Date(r.endedAt as number) : null,
    note: (r.note ?? '') as string,
    createdAt: new Date(r.createdAt as number),
  }
}

function toDiaper(r: Record<string, unknown>): Diaper {
  return {
    id: r.id as string,
    type: r.type as DiaperType,
    color: (r.color ?? null) as string | null,
    consistency: (r.consistency ?? null) as string | null,
    hadRash: !!r.hadRash,
    recordedAt: new Date(r.recordedAt as number),
    note: (r.note ?? '') as string,
    createdAt: new Date(r.createdAt as number),
  }
}

// ── raw API helpers ────────────────────────────────────────────────

async function api(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API ${method} ${path} -> ${res.status}`)
  return res
}

// ── public CRUD API ────────────────────────────────────────────────

export function isRemoteMode(): boolean {
  return API.length > 0
}

export async function fetchSettings(): Promise<Record<string, string>> {
  const res = await api('/api/settings')
  return (await res.json()) as Record<string, string>
}

export async function saveSettingsOnServer(
  settings: Record<string, string>,
): Promise<void> {
  await api('/api/settings', 'PUT', settings)
}

export async function remoteFeedings(start: Date, end: Date): Promise<Feeding[]> {
  const res = await api(`/api/feedings?start=${start.getTime()}&end=${end.getTime()}`)
  const data = (await res.json()) as Record<string, unknown>[]
  return data.map(toFeeding)
}

export async function remoteDiapers(start: Date, end: Date): Promise<Diaper[]> {
  const res = await api(`/api/diapers?start=${start.getTime()}&end=${end.getTime()}`)
  const data = (await res.json()) as Record<string, unknown>[]
  return data.map(toDiaper)
}

export async function remoteAddFeeding(input: {
  type: FeedingType
  amount: number | null
  durationSec: number | null
  startedAt: Date
  endedAt: Date | null
  note: string
}): Promise<string> {
  const body = {
    type: input.type,
    amount: input.amount,
    durationSec: input.durationSec,
    startedAt: input.startedAt.getTime(),
    endedAt: input.endedAt?.getTime() ?? null,
    note: input.note,
  }
  const res = await api('/api/feedings', 'POST', body)
  const row = (await res.json()) as { id: string }
  return row.id
}

export async function remoteAddDiaper(input: {
  type: DiaperType
  color: string | null
  consistency: string | null
  hadRash: boolean
  recordedAt: Date
  note: string
}): Promise<string> {
  const body = {
    type: input.type,
    color: input.color,
    consistency: input.consistency,
    hadRash: input.hadRash ? 1 : 0,
    recordedAt: input.recordedAt.getTime(),
    note: input.note,
  }
  const res = await api('/api/diapers', 'POST', body)
  const row = (await res.json()) as { id: string }
  return row.id
}

export async function remoteDeleteFeeding(id: string): Promise<void> {
  await api(`/api/feedings/${encodeURIComponent(id)}`, 'DELETE')
}

export async function remoteDeleteDiaper(id: string): Promise<void> {
  await api(`/api/diapers/${encodeURIComponent(id)}`, 'DELETE')
}

// ── human-readable export payload ──────────────────────────────────

export interface FeedingRow {
  id: string
  类型: string
  奶量_ml: number | null
  时长_秒: number | null
  开始时间: string
  结束时间: string
  备注: string
}

export interface DiaperRow {
  id: string
  类型: string
  颜色: string | null
  性状: string | null
  红屁屁: string
  时间: string
  备注: string
}

export interface ExportPayload {
  版本: string
  导出时间: string
  设置: Record<string, string>
  喂养记录: FeedingRow[]
  尿便记录: DiaperRow[]
}

export async function exportData(): Promise<ExportPayload> {
  const [feedings, diapers] = await Promise.all([
    remoteFeedings(new Date(0), new Date(8640000000000000)),
    remoteDiapers(new Date(0), new Date(8640000000000000)),
  ])
  const settings = await fetchSettings()
  return {
    版本: '1.0',
    导出时间: new Date().toLocaleString('zh-CN'),
    设置: settings,
    喂养记录: feedings.map((f) => ({
      id: f.id,
      类型: feedingLabel(f.type),
      奶量_ml: f.amount,
      时长_秒: f.durationSec,
      开始时间: formatDateTime(f.startedAt.getTime()),
      结束时间: f.endedAt ? formatDateTime(f.endedAt.getTime()) : '',
      备注: f.note,
    })),
    尿便记录: diapers.map((d) => ({
      id: d.id,
      类型: diaperLabel(d.type),
      颜色: d.color,
      性状: d.consistency,
      红屁屁: d.hadRash ? '是' : '否',
      时间: formatDateTime(d.recordedAt.getTime()),
      备注: d.note,
    })),
  }
}

export async function importData(payload: ExportPayload): Promise<number> {
  let count = 0

  // Restore settings first (merge with existing)
  if (payload.设置 && Object.keys(payload.设置).length > 0) {
    const merged: Record<string, string> = { ...payload.设置 }
    try {
      const existing = await fetchSettings()
      Object.assign(merged, existing)
    } catch { /* overwrite only */ }
    await saveSettingsOnServer(merged)
  }

  // Import feedings
  const feedTypeMap: Record<string, string> = {
    左乳: 'breast_left',
    右乳: 'breast_right',
    双侧: 'breast_both',
    母乳瓶喂: 'breast_bottle',
    配方奶粉: 'formula',
    左: 'breast_left',
    右: 'breast_right',
    双: 'breast_both',
    配方: 'formula',
  }
  for (const f of payload.喂养记录) {
    const raw = String(f.类型 ?? '').trim()
    const type: FeedingType =
      (feedTypeMap[raw] as FeedingType | undefined) ??
      (raw as FeedingType)
    const startedAt = f.开始时间 ? new Date(f.开始时间).getTime() : Date.now()
    const endedAt = f.结束时间 ? new Date(f.结束时间).getTime() : null
    await remoteAddFeeding({
      type,
      amount: f.奶量_ml ?? null,
      durationSec: f.时长_秒 ?? null,
      startedAt: new Date(startedAt),
      endedAt: endedAt ? new Date(endedAt) : null,
      note: f.备注 ?? '',
    })
    count++
  }

  // Import diapers
  const diaperTypeMap: Record<string, string> = {
    尿尿: 'pee',
    便便: 'poop',
    都有: 'both',
  }
  for (const d of payload.尿便记录) {
    const raw = String(d.类型 ?? '').trim()
    const type: DiaperType =
      (diaperTypeMap[raw] as DiaperType | undefined) ??
      (raw as DiaperType)
    await remoteAddDiaper({
      type,
      color: d.颜色 ?? null,
      consistency: d.性状 ?? null,
      hadRash: String(d.红屁屁 ?? '').trim() === '是',
      recordedAt: d.时间 ? new Date(d.时间) : new Date(),
      note: d.备注 ?? '',
    })
    count++
  }

  return count
}

// ── Excel export / import ──────────────────────────────────────────

export async function exportXlsx(): Promise<void> {
  const payload = await exportData()
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const feedSheet = XLSX.utils.json_to_sheet(
    payload.喂养记录.map((r) => ({
      类型: r.类型,
      奶量_ml: r.奶量_ml,
      时长_秒: r.时长_秒,
      开始时间: r.开始时间,
      结束时间: r.结束时间,
      备注: r.备注,
    })),
  )
  XLSX.utils.book_append_sheet(wb, feedSheet, '喂养记录')

  const diaperSheet = XLSX.utils.json_to_sheet(
    payload.尿便记录.map((r) => ({
      类型: r.类型,
      颜色: r.颜色 ?? '',
      性状: r.性状 ?? '',
      红屁屁: r.红屁屁,
      时间: r.时间,
      备注: r.备注,
    })),
  )
  XLSX.utils.book_append_sheet(wb, diaperSheet, '尿便记录')

  XLSX.writeFile(
    wb,
    `baby-recorder-${new Date().toISOString().slice(0, 10)}.xlsx`,
  )
}

export async function importXlsx(arrayBuf: ArrayBuffer): Promise<number> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(arrayBuf, { type: 'array' })
  let count = 0

  const payload: ExportPayload = {
    版本: '1.0',
    导出时间: '',
    设置: {},
    喂养记录: [],
    尿便记录: [],
  }

  const feedSheet = wb.Sheets['喂养记录']
  if (feedSheet) {
    const rows: any[] = XLSX.utils.sheet_to_json(feedSheet)
    for (const row of rows) {
      const raw = String(row['类型'] ?? '').trim()
      count++
      payload.喂养记录.push({
        id: '',
        类型: raw,
        奶量_ml: row['奶量_ml'] != null ? Number(row['奶量_ml']) : null,
        时长_秒: row['时长_秒'] != null ? Number(row['时长_秒']) : null,
        开始时间: row['开始时间'] ? String(row['开始时间']) : '',
        结束时间: row['结束时间'] ? String(row['结束时间']) : '',
        备注: row['备注'] ?? '',
      })
    }
  }

  const diaperSheet = wb.Sheets['尿便记录']
  if (diaperSheet) {
    const rows: any[] = XLSX.utils.sheet_to_json(diaperSheet)
    for (const row of rows) {
      const raw = String(row['类型'] ?? '').trim()
      count++
      payload.尿便记录.push({
        id: '',
        类型: raw,
        颜色: row['颜色'] ? String(row['颜色']) : null,
        性状: row['性状'] ? String(row['性状']) : null,
        红屁屁: String(row['红屁屁'] ?? '').trim() === '是' ? '是' : '否',
        时间: row['时间'] ? String(row['时间']) : '',
        备注: row['备注'] ?? '',
      })
    }
  }

  return importData(payload)
}
