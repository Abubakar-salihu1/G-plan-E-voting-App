import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { adminFetch } from './adminAuth'

export type Party = {
  id: string
  electionId: string
  contest: string // e.g. "President", "Governor — Kogi State", "Councillor — Ward 3"
  name: string
  acronym: string
  candidateName: string
  logoUrl?: string | null
  candidatePhotoUrl?: string | null
  slogan?: string | null
  runningMate?: string | null
  bio?: string | null
  manifestoUrl?: string | null
  websiteUrl?: string | null
  voteCount: number
}

export type ElectionLevel = 'federal' | 'state' | 'local'

export type ElectionConfig = {
  id: string
  name: string
  level: ElectionLevel
  state: string | null
  lga: string | null
  startsAt: string
  endsAt: string
  timezone: string
  lockDate: string | null
  status: 'draft' | 'locked'
  parties: Party[]
}

type ApiResult = { ok: boolean; message?: string }

type DataContextValue = {
  elections: ElectionConfig[]
  parties: Party[] // flattened across every election, for screens that don't scope by election
  loading: boolean
  error: string
  refresh: () => Promise<void>
  addElection: (input: {
    name: string
    level: ElectionLevel
    state?: string
    lga?: string
    startsAt: string
    endsAt: string
    timezone: string
    lockDate?: string
  }) => Promise<ApiResult>
  lockElection: (id: string) => Promise<ApiResult>
  addParty: (
    electionId: string,
    input: {
      contest: string
      name: string
      acronym: string
      candidateName: string
      logoUrl?: string
      candidatePhotoUrl?: string
      slogan?: string
      runningMate?: string
      bio?: string
      manifestoUrl?: string
      websiteUrl?: string
    },
  ) => Promise<ApiResult>
  removeParty: (electionId: string, partyId: string) => Promise<ApiResult>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [elections, setElections] = useState<ElectionConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/elections')
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Could not load elections.')
        return
      }
      setElections(data.elections)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const parties: Party[] = elections.flatMap((e) => e.parties)

  async function addElection(input: Parameters<DataContextValue['addElection']>[0]): Promise<ApiResult> {
    try {
      const res = await adminFetch('/api/elections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, message: data.message }
      await refresh()
      return { ok: true }
    } catch {
      return { ok: false, message: 'Could not reach the server.' }
    }
  }

  async function lockElection(id: string): Promise<ApiResult> {
    try {
      const res = await adminFetch(`/api/elections/${id}/lock`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) return { ok: false, message: data.message }
      await refresh()
      return { ok: true }
    } catch {
      return { ok: false, message: 'Could not reach the server.' }
    }
  }

  async function addParty(
    electionId: string,
    input: Parameters<DataContextValue['addParty']>[1],
  ): Promise<ApiResult> {
    try {
      const res = await adminFetch(`/api/elections/${electionId}/parties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, message: data.message }
      await refresh()
      return { ok: true }
    } catch {
      return { ok: false, message: 'Could not reach the server.' }
    }
  }

  async function removeParty(electionId: string, partyId: string): Promise<ApiResult> {
    try {
      const res = await adminFetch(`/api/elections/${electionId}/parties/${partyId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, message: data.message }
      await refresh()
      return { ok: true }
    } catch {
      return { ok: false, message: 'Could not reach the server.' }
    }
  }

  return (
    <DataContext.Provider
      value={{ elections, parties, loading, error, refresh, addElection, lockElection, addParty, removeParty }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useElectionData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useElectionData must be used within DataProvider')
  return ctx
}

// A small, fixed palette used to give any uploaded party a consistent,
// distinct color when it has no logo yet — picked by hashing the acronym,
// not tied to any real party's actual brand colors.
const FALLBACK_PALETTE = ['#1D4ED8', '#047857', '#B45309', '#7C2D82', '#BE123C', '#0E7490', '#4D7C0F', '#A21CAF']

export function colorForAcronym(acronym: string) {
  let hash = 0
  for (let i = 0; i < acronym.length; i++) hash = (hash * 31 + acronym.charCodeAt(i)) >>> 0
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]
}
