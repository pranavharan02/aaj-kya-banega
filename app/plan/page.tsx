'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getMonday, formatDate, getWeekLabel } from '@/lib/dates'
import { ensureHousehold } from '@/lib/household'
import { CUISINE_LABELS, type CuisineType } from '@/lib/types'

const CUISINES: CuisineType[] = ['tamil', 'north', 'marathi', 'bihari']
const CUISINE_EMOJI: Record<CuisineType, string> = {
  tamil: '🥥', north: '🫓', marathi: '🌶', bihari: '🫘',
}
const CUISINE_BG: Record<CuisineType, string> = {
  tamil: '#E8D5C4', north: '#F5E6CC', marathi: '#D4E8D4', bihari: '#E8DCC8',
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-[#8C8680] text-lg">Loading...</div>}>
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
    setSelectedCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function handleGenerate() {
    if (selectedCuisines.length === 0) { setError('Select at least one cuisine'); return }
    setError('')
    setLoading(true)
    try {
      const householdId = await ensureHousehold()
      const res = await fetch('/api/generate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ household_id: householdId, week_start_date: weekStart, veg_days: vegDays, cuisines: selectedCuisines }),
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
    <div className="py-6">
      <h1 className="text-[28px] font-bold text-[#2D2A26] mb-1">Plan your menu</h1>
      <p className="text-[#8C8680] text-[17px] mb-10">{getWeekLabel(weekStart)}</p>

      {/* Veg/Non-Veg split */}
      <div className="mb-10">
        <h2 className="text-[17px] font-semibold text-[#2D2A26] mb-4">Veg / Non-Veg split</h2>
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[17px] text-[#2E7D32] font-semibold">{vegDays} veg days</span>
            <span className="text-[17px] text-[#C62828] font-semibold">{7 - vegDays} non-veg days</span>
          </div>
          <input
            type="range" min={0} max={7} value={vegDays}
            onChange={e => setVegDays(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-[13px] text-[#8C8680] mt-2">
            <span>All non-veg</span>
            <span>All veg</span>
          </div>
        </div>
      </div>

      {/* Cuisine selection */}
      <div className="mb-10">
        <h2 className="text-[17px] font-semibold text-[#2D2A26] mb-4">Cuisines to include</h2>
        <div className="grid grid-cols-2 gap-3">
          {CUISINES.map(c => (
            <button
              key={c}
              onClick={() => toggleCuisine(c)}
              className={`card p-5 text-left transition-all border-2 ${
                selectedCuisines.includes(c)
                  ? 'border-[#2D2A26] shadow-lg'
                  : 'border-transparent hover:shadow-md'
              }`}
              style={selectedCuisines.includes(c) ? { background: CUISINE_BG[c] } : undefined}
            >
              <div className="text-2xl mb-2">{CUISINE_EMOJI[c]}</div>
              <div className="font-semibold text-[16px] text-[#2D2A26]">{CUISINE_LABELS[c]}</div>
              {selectedCuisines.includes(c) && (
                <div className="text-[12px] font-medium text-[#2D2A26] mt-1 opacity-60">Selected</div>
              )}
            </button>
          ))}
        </div>
        {selectedCuisines.length === 0 && (
          <p className="text-[15px] text-[#C62828] mt-3">Select at least one cuisine</p>
        )}
      </div>

      {error && (
        <p className="text-[15px] text-[#C62828] mb-5 bg-red-50 p-4 rounded-2xl">{error}</p>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || selectedCuisines.length === 0}
        className="w-full bg-[#2D2A26] text-white py-4 rounded-2xl font-semibold text-[17px] hover:bg-[#45403A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Generating your menu...
          </span>
        ) : (
          'Generate Menu'
        )}
      </button>
    </div>
  )
}
