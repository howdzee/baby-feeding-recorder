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
