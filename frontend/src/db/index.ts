import type { Feeding, Diaper, FeedingType, DiaperType } from '../types'
import {
  remoteFeedings,
  remoteDiapers,
  remoteAddFeeding,
  remoteAddDiaper,
  remoteDeleteFeeding,
  remoteDeleteDiaper,
  fetchSettings,
  saveSettingsOnServer,
  exportData,
  importData,
  exportXlsx,
  importXlsx,
} from './remoteApi'

// ── CRUD re-exports (keeping existing public API for _tests/ etc.) ──

export async function addFeeding(input: {
  type: FeedingType
  amount: number | null
  durationSec: number | null
  startedAt: Date
  endedAt: Date | null
  note: string
}): Promise<string> {
  return remoteAddFeeding(input)
}

export async function addDiaper(input: {
  type: DiaperType
  color: string | null
  consistency: string | null
  hadRash: boolean
  recordedAt: Date
  note: string
}): Promise<string> {
  return remoteAddDiaper(input)
}

export async function getFeedingsByDate(start: Date, end: Date): Promise<Feeding[]> {
  return remoteFeedings(start, end)
}

export async function getDiapersByDate(start: Date, end: Date): Promise<Diaper[]> {
  return remoteDiapers(start, end)
}

export async function deleteFeeding(id: string) {
  await remoteDeleteFeeding(id)
}

export async function deleteDiaper(id: string) {
  await remoteDeleteDiaper(id)
}

// ── JSON backup / restore ──────────────────────────────────────────

export async function exportJSON(): Promise<string> {
  const payload = await exportData()
  return JSON.stringify(payload, null, 2)
}

export async function importJSON(json: string): Promise<number> {
  const payload = JSON.parse(json)
  return importData(payload)
}

export async function exportDB(): Promise<ArrayBuffer> {
  const json = await exportJSON()
  return new TextEncoder().encode(json).buffer
}

export async function importDB(data: ArrayBuffer): Promise<void> {
  const text = new TextDecoder().decode(data)
  await importJSON(text)
  window.location.reload()
}

// ── Settings re-exports ─────────────────────────────────────────────

export { fetchSettings, saveSettingsOnServer }

// ── Excel re-exports ────────────────────────────────────────────────

export { exportXlsx, importXlsx }

// ── test helpers ───────────────────────────────────────────────────

export async function resetDB() {}

export async function hasData(): Promise<boolean> {
  try {
    const data = await remoteFeedings(new Date(0), new Date())
    return data.length > 0
  } catch {
    return false
  }
}
