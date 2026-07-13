export type FeedingType = 'breast_left' | 'breast_right' | 'breast_both' | 'formula'
export type DiaperType = 'pee' | 'poop' | 'both'

export interface Feeding {
  id: string
  type: FeedingType
  amount: number | null
  durationSec: number | null
  startedAt: Date
  endedAt: Date | null
  note: string
  createdAt: Date
}

export interface Diaper {
  id: string
  type: DiaperType
  color: string | null
  consistency: string | null
  hadRash: boolean
  recordedAt: Date
  note: string
  createdAt: Date
}

export type RecordId = string

export const FEEDING = 'feeding'
export const DIAPER = 'diaper'

let db: IDBDatabase | null = null

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('baby-recorder', 1)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains('feeding')) {
        const f = d.createObjectStore('feeding', { keyPath: 'id' })
        f.createIndex('startedAt', 'startedAt')
      }
      if (!d.objectStoreNames.contains('diaper')) {
        const dd = d.createObjectStore('diaper', { keyPath: 'id' })
        dd.createIndex('recordedAt', 'recordedAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db: IDBDatabase, store: string, mode: IDBTransactionMode) {
  const t = db.transaction(store, mode)
  return {
    store: t.objectStore(store),
    done: () =>
      new Promise<void>((resolve, reject) => {
        t.oncomplete = () => resolve()
        t.onerror = () => reject(t.error)
      })
  }
}

function clearStore(store: string) {
  return tx(db, store, 'readwrite').then(({ done }) => done())
}

export async function resetDB() {
  db = null
  await indexedDB.deleteDatabase('baby-recorder')
}

export async function addFeeding(item: {
  type: FeedingType
  amount: number | null
  durationSec: number | null
  startedAt: Date
  endedAt: Date | null
  note: string
}) {
  const record: Feeding = { id: crypto.randomUUID(), ...item, createdAt: new Date() }
  const d = await open()
  try {
    await tx(d, 'feeding', 'readwrite').then(async ({ store, done }) => {
      await new Promise<void>((resolve, reject) => {
        const r = store.put(record)
        r.onsuccess = () => resolve()
        r.onerror = () => reject(r.error)
      })
      await done()
    })
  } finally {
    d.close()
  }
  return record.id
}

export async function addDiaper(item: {
  type: DiaperType
  color: string | null
  consistency: string | null
  hadRash: boolean
  recordedAt: Date
  note: string
}) {
  const record: Diaper = { id: crypto.randomUUID(), ...item, createdAt: new Date() }
  const d = await open()
  try {
    await tx(d, 'diaper', 'readwrite').then(async ({ store, done }) => {
      await new Promise<void>((resolve, reject) => {
        const r = store.put(record)
        r.onsuccess = () => resolve()
        r.onerror = () => reject(r.error)
      })
      await done()
    })
  } finally {
    d.close()
  }
  return record.id
}

export async function getFeedingsByDate(start: Date, end: Date) {
  const d = await open()
  try {
    const { store, done } = tx(d, 'feeding', 'readonly')
    const range = IDBKeyRange.bound(start.getTime(), end.getTime(), false, false)
    const idx = store.index('startedAt')
    const out: Feeding[] = []
    await new Promise<void>((resolve, reject) => {
      const req = idx.openCursor(range, 'prev')
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          out.push(cursor.value as Feeding)
          cursor.continue()
        } else {
          resolve()
        }
      }
      req.onerror = () => reject(req.error)
    })
    await done()
    return out
  } finally {
    d.close()
  }
}

export async function getDiapersByDate(start: Date, end: Date) {
  const d = await open()
  try {
    const { store, done } = tx(d, 'diaper', 'readonly')
    const range = IDBKeyRange.bound(start.getTime(), end.getTime(), false, false)
    const idx = store.index('recordedAt')
    const out: Diaper[] = []
    await new Promise<void>((resolve, reject) => {
      const req = idx.openCursor(range, 'prev')
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          out.push(cursor.value as Diaper)
          cursor.continue()
        } else {
          resolve()
        }
      }
      req.onerror = () => reject(req.error)
    })
    await done()
    return out
  } finally {
    d.close()
  }
}

export async function deleteFeeding(id: string) {
  const d = await open()
  try {
    await tx(d, 'feeding', 'readwrite').then(async ({ store, done }) => {
      await new Promise<void>((resolve, reject) => {
        const r = store.delete(id)
        r.onsuccess = () => resolve()
        r.onerror = () => reject(r.error)
      })
      await done()
    })
  } finally {
    d.close()
  }
}

export async function deleteDiaper(id: string) {
  const d = await open()
  try {
    await tx(d, 'diaper', 'readwrite').then(async ({ store, done }) => {
      await new Promise<void>((resolve, reject) => {
        const r = store.delete(id)
        r.onsuccess = () => resolve()
        r.onerror = () => reject(r.error)
      })
      await done()
    })
  } finally {
    d.close()
  }
}
