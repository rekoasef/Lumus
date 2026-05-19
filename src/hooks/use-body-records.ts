'use client'

import { useState } from 'react'
import type { BodyRecord } from '@/types/fit.types'
import type { CreateBodyRecordInput } from '@/lib/validations/fit'

export function useBodyRecords(initialRecords: BodyRecord[]) {
  const [records, setRecords] = useState<BodyRecord[]>(initialRecords)

  const latestWeight = records.find(r => r.weight_kg != null)?.weight_kg ?? null
  const previousWeight = records.filter(r => r.weight_kg != null)[1]?.weight_kg ?? null

  const weightTrend: 'up' | 'down' | 'stable' =
    latestWeight && previousWeight
      ? latestWeight > previousWeight ? 'up' : latestWeight < previousWeight ? 'down' : 'stable'
      : 'stable'

  async function addRecord(input: CreateBodyRecordInput): Promise<boolean> {
    const res = await fetch('/api/fit/body-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return false
    const { record } = await res.json() as { record: BodyRecord }
    setRecords(prev => [record, ...prev])
    return true
  }

  const chartData = records
    .filter(r => r.weight_kg != null)
    .slice(0, 30)
    .reverse()
    .map(r => ({ date: r.date, peso: r.weight_kg as number }))

  return { records, latestWeight, previousWeight, weightTrend, chartData, addRecord }
}
