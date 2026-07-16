import type { Feeding, Diaper, FeedingType, DiaperType } from '../types'

// ---- sql.js (kept for tests / offline fallback) ----

import initSqlJs, { type SqlJsStatic } from 'sql.js'

const WASM_PATH = '/sql-wasm.wasm'
let modulePromise: Promise<SqlJsStatic> | null = null
let cachedModule: SqlJsStatic | null = null
let localDb: any = null

async function getLocalModule(): Promise<SqlJsStatic> {
	if (cachedModule) return cachedModule
	if (!modulePromise) {
		modulePromise = (async () => {
			try {
				const SQL = await initSqlJs({ locateFile: () => WASM_PATH })
				cachedModule = SQL
				return SQL
			} catch (err) {
				modulePromise = null
				throw new Error(
					`无法加载数据库引擎: ${err instanceof Error ? err.message : String(err)}`,
				)
			}
		})()
	}
	return modulePromise
}

async function getLocalDb() {
	if (localDb) return localDb
	const SQL = await getLocalModule()
	localDb = new SQL.Database()
	localDb.run(
		'CREATE TABLE IF NOT EXISTS feeding (id TEXT PRIMARY KEY, type TEXT, amount INTEGER, durationSec INTEGER, startedAt INTEGER, endedAt INTEGER, note TEXT, createdAt INTEGER)',
	)
	localDb.run('CREATE INDEX IF NOT EXISTS idx_f_start ON feeding(startedAt)')
	localDb.run(
		'CREATE TABLE IF NOT EXISTS diaper (id TEXT PRIMARY KEY, type TEXT, color TEXT, consistency TEXT, hadRash INTEGER, recordedAt INTEGER, note TEXT, createdAt INTEGER)',
	)
	localDb.run('CREATE INDEX IF NOT EXISTS idx_d_recorded ON diaper(recordedAt)')
	return localDb
}

// ---- CRUD: always remote-first ----

export async function addFeeding(input: {
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
		createdAt: Date.now(),
		updatedAt: Date.now(),
	}
	const res = await fetch('/api/feedings', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!res.ok) throw new Error(`POST /api/feedings -> ${res.status}`)
	const row = (await res.json()) as { id: string }
	return row.id
}

export async function addDiaper(input: {
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
		createdAt: Date.now(),
		updatedAt: Date.now(),
	}
	const res = await fetch('/api/diapers', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!res.ok) throw new Error(`POST /api/diapers -> ${res.status}`)
	const row = (await res.json()) as { id: string }
	return row.id
}

export async function getFeedingsByDate(
	start: Date,
	end: Date,
): Promise<Feeding[]> {
	const res = await fetch(
		`/api/feedings?start=${start.getTime()}&end=${end.getTime()}`,
	)
	if (!res.ok) throw new Error(`GET /api/feedings -> ${res.status}`)
	const data = (await res.json()) as Record<string, unknown>[]
	return data.map((r) => ({
		id: r.id as string,
		type: r.type as FeedingType,
		amount: (r.amount ?? null) as number | null,
		durationSec: (r.durationSec ?? null) as number | null,
		startedAt: new Date(r.startedAt as number),
		endedAt: r.endedAt != null ? new Date(r.endedAt as number) : null,
		note: (r.note ?? '') as string,
		createdAt: new Date(r.createdAt as number),
	}))
}

export async function getDiapersByDate(
	start: Date,
	end: Date,
): Promise<Diaper[]> {
	const res = await fetch(
		`/api/diapers?start=${start.getTime()}&end=${end.getTime()}`,
	)
	if (!res.ok) throw new Error(`GET /api/diapers -> ${res.status}`)
	const data = (await res.json()) as Record<string, unknown>[]
	return data.map((r) => ({
		id: r.id as string,
		type: r.type as DiaperType,
		color: (r.color ?? null) as string | null,
		consistency: (r.consistency ?? null) as string | null,
		hadRash: !!r.hadRash,
		recordedAt: new Date(r.recordedAt as number),
		note: (r.note ?? '') as string,
		createdAt: new Date(r.createdAt as number),
	}))
}

export async function deleteFeeding(id: string) {
	const res = await fetch(`/api/feedings/${encodeURIComponent(id)}`, {
		method: 'DELETE',
	})
	if (!res.ok) throw new Error(`DELETE /api/feedings/${id} -> ${res.status}`)
}

export async function deleteDiaper(id: string) {
	const res = await fetch(`/api/diapers/${encodeURIComponent(id)}`, {
		method: 'DELETE',
	})
	if (!res.ok) throw new Error(`DELETE /api/diapers/${id} -> ${res.status}`)
}

// ---- test helpers ----

export async function resetDB() {
	try {
		await getLocalDb()
	} catch {
		// ok — tests that need sql.js will fail via their own path
	}
}

export async function hasData(): Promise<boolean> {
	try {
		const data = await getFeedingsByDate(new Date(0), new Date())
		return data.length > 0
	} catch {
		return false
	}
}

export async function exportXlsx(): Promise<void> {
	const [feedRows, diaperRows] = await Promise.all([
		getFeedingsByDate(new Date(0), new Date()),
		getDiapersByDate(new Date(0), new Date()),
	])
	const XLSX = await import('xlsx')
	const wb = XLSX.utils.book_new()

	const feedSheet = XLSX.utils.json_to_sheet(
		feedRows.map((r) => ({
			ID: r.id,
			类型: r.type,
			奶量_ml: r.amount,
			时长_秒: r.durationSec,
			开始时间: r.startedAt.toLocaleString('zh-CN'),
			结束时间: r.endedAt ? r.endedAt.toLocaleString('zh-CN') : '',
			备注: r.note,
		})),
	)
	XLSX.utils.book_append_sheet(wb, feedSheet, '喂养记录')

	const diaperSheet = XLSX.utils.json_to_sheet(
		diaperRows.map((r) => ({
			ID: r.id,
			类型: r.type,
			颜色: r.color ?? '',
			性状: r.consistency ?? '',
			红屁屁: r.hadRash ? '是' : '否',
			时间: r.recordedAt.toLocaleString('zh-CN'),
			备注: r.note,
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

	const feedTypeMap: Record<string, FeedingType> = {
		左: 'breast_left',
		右: 'breast_right',
		双侧: 'breast_both',
		配方: 'formula',
	}
	const feedSheet = wb.Sheets['喂养记录']
	if (feedSheet) {
		const rows: any[] = XLSX.utils.sheet_to_json(feedSheet)
		for (const row of rows) {
			const raw = String(row['类型'] ?? '').trim()
			await addFeeding({
				type: feedTypeMap[raw] ?? (raw as FeedingType),
				amount: row['奶量_ml'] != null ? Number(row['奶量_ml']) : null,
				durationSec:
					row['时长_秒'] != null ? Number(row['时长_秒']) : null,
				startedAt: row['开始时间']
					? new Date(row['开始时间'] as string)
					: new Date(),
				endedAt: row['结束时间']
					? new Date(row['结束时间'] as string)
					: null,
				note: row['备注'] ?? '',
			})
			count++
		}
	}

	const diaperTypeMap: Record<string, DiaperType> = {
		尿尿: 'pee',
		便便: 'poop',
		都有: 'both',
	}
	const diaperSheet = wb.Sheets['尿便记录']
	if (diaperSheet) {
		const rows: any[] = XLSX.utils.sheet_to_json(diaperSheet)
		for (const row of rows) {
			const raw = String(row['类型'] ?? '').trim()
			await addDiaper({
				type: diaperTypeMap[raw] ?? (raw as DiaperType),
				color: row['颜色'] ? String(row['颜色']) : null,
				consistency: row['性状'] ? String(row['性状']) : null,
				hadRash: String(row['红屁屁'] ?? '').trim() === '是',
				recordedAt: row['时间']
					? new Date(row['时间'] as string)
					: new Date(),
				note: row['备注'] ?? '',
			})
			count++
		}
	}
	return count
}

export async function exportDB(): Promise<ArrayBuffer> {
  const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
  const res = await fetch(`${API_BASE}/api/export`)
  if (!res.ok) throw new Error(`导出失败: ${res.status}`)
  return await res.arrayBuffer()
}

export async function importDB(data: ArrayBuffer): Promise<void> {
  const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
  const res = await fetch(`${API_BASE}/api/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: new TextDecoder().decode(data),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '未知错误')
    throw new Error(`导入失败 (${res.status}): ${msg}`)
  }
}
