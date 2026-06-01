'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getMonday, formatDate, getWeekLabel } from '@/lib/dates'
import { ensureHousehold } from '@/lib/household'
import { CUISINE_LABELS, type CuisineType } from '@/lib/types'

const CUISINES: CuisineType[] = ['tamil', 'north', 'marathi', 'bihari']

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-[#6B6B6B]">Loading...</div>}>
      <PlanContent />
    </Suspense>
  )
}

function PlanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const weekStart = searchParams.get('week') || formatDate(getMonday())

  const [vegDays, setVegDays] = useState(4)
  const [selectedCuisines, setSelectedCuisines] = useState<CuisineType[]>(['tamil', 'north'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleCuisine(c: CuisineType) {
    setSelectedCuisines(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )
  }

  async function handleGenerate() {
    if (selectedCuisines.length === 0) {
      setError('Select at least one cuisine')
      return
    }
    setError('')
    setLoading(true)

    try {
      const householdId = await ensureHousehold()
      const res = await fetch('/api/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: householdId,
          week_start_date: weekStart,
          veg_days: vegDays,
          cuisines: selectedCuisines,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      router.push(`/menu/${data.menu_id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setLoading(false)
    }
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold mb-1">Plan your menu</h1>
      <p className="text-[#6B6B6B] mb-8">{getWeekLabel(weekStart)}</p>

      {/* Step 1: Veg/Non-Veg split */}
      <div className="mb-8">
        <h2 className="text-base font-medium mb-3">Veg / Non-Veg split</h2>
        <div className="bg-[#F5F5F5] rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-[#2E7D32] font-medium">{vegDays} veg days</span>
            <span className="text-sm text-[#C62828] font-medium">{7 - vegDays} non-veg days</span>
          </div>
          <input
            type="range"
            min={0}
            max={7}
            value={vegDays}
            onChange={e => setVegDays(Number(e.target.value))}
            className="w-full accent-[#1A1A1A]"
          />
          <div className="flex justify-between text-xs text-[#6B6B6B] mt-1">
            <span>All non-veg</span>
            <span>All veg</span>
          </div>
        </div>
      </div>

      {/* Step 2: Cuisine selection */}
      <div className="mb-8">
        <h2 className="text-base font-medium mb-3">Cuisines to include</h2>
        <div className="flex flex-wrap gap-2">
          {CUISINES.map(c => (
            <button
              key={c}
              onClick={() => toggleCuisine(c)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedCuisines.includes(c)
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-[#F5F5F5] text-[#1A1A1A] hover:bg-[#EBEBEB]'
              }`}
            >
              {CUISINE_LABELS[c]}
            </button>
          ))}
        </div>
        {selectedCuisines.length === 0 && (
          <p className="text-sm text-[#C62828] mt-2">Select at least one cuisine</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-[#C62828] mb-4 bg-red-50 p-3 rounded-xl">{error}</p>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || selectedCuisines.length === 0}
        className="w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl font-medium text-base hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Generating...
          </span>
        ) : (
          'Generate Menu'
        )}
      </button>
    </div>
  )
}
