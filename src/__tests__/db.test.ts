import { describe, it, expect, afterEach } from 'vitest'
import { resetDB, addFeeding, addDiaper, getFeedingsByDate, getDiapersByDate, deleteFeeding, deleteDiaper } from '../db'

describe('db layer', () => {
  afterEach(async () => { await resetDB() })

  it('adds and retrieves feedings by date range', async () => {
    const now = Date.now()
    const start = new Date(now)
    const end = new Date(now + 86400000)
    const f1 = await addFeeding({ type: 'formula', amount: 90, durationSec: null, startedAt: new Date(now), endedAt: new Date(now + 300000), note: '' })
    const f2 = await addFeeding({ type: 'breast_left', amount: null, durationSec: 300, startedAt: new Date(now + 60000), endedAt: new Date(now + 360000), note: '' })
    const list = await getFeedingsByDate(start, end)
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe(f1)
    expect(list[0].type).toBe('formula')
    expect(list[0].amount).toBe(90)
  })

  it('adds and deletes a diaper', async () => {
    const id = await addDiaper({ type: 'both', color: '黄色', consistency: '糊状', hadRash: false, recordedAt: new Date(), note: '' })
    const list = await getDiapersByDate(new Date(0), new Date(Date.now() + 100000))
    expect(list).toHaveLength(1)
    await deleteDiaper(id)
    const after = await getDiapersByDate(new Date(0), new Date(Date.now() + 100000))
    expect(after).toHaveLength(0)
  })
})
