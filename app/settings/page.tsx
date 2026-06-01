'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ensureHousehold, getHouseholdId } from '@/lib/household'
import { CUISINE_LABELS, type CuisineType } from '@/lib/types'
import Link from 'next/link'

const CUISINES: CuisineType[] = ['tamil', 'north', 'marathi', 'bihari']

export default function SettingsPage() {
  const [servings, setServings] = useState(2)
  const [vegDays, setVegDays] = useState(4)
  const [cuisines, setCuisines] = useState<string[]>(['tamil', 'north'])
  const [maidLang, setMaidLang] = useState('hi')
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    setLoading(true)
    const householdId = await ensureHousehold()
    const { data } = await supabase.from('households').select('*').eq('id', householdId).single()
    if (data) {
      setServings(data.default_servings)
      setVegDays(data.default_veg_days)
      setCuisines(data.default_cuisines || ['tamil', 'north'])
      setMaidLang(data.preferred_maid_lang || 'hi')
    }
    setLoading(false)
  }

  async function saveSettings() {
    const householdId = getHouseholdId()
    if (!householdId) return
    await supabase.from('households').update({
      default_servings: servings,
      default_veg_days: vegDays,
      default_cuisines: cuisines,
      preferred_maid_lang: maidLang,
    }).eq('id', householdId)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleCuisine(c: string) {
    setCuisines(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  if (loading) return <div className="py-20 text-center text-[#8C8680]">Loading...</div>

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Default servings */}
        <div>
          <label className="text-sm font-medium block mb-2">Default servings</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setServings(Math.max(1, servings - 1))} className="w-10 h-10 rounded-xl bg-[#F5F0EA] hover:bg-[#EBEBEB] flex items-center justify-center font-medium">-</button>
            <span className="text-lg font-medium w-8 text-center">{servings}</span>
            <button onClick={() => setServings(Math.min(10, servings + 1))} className="w-10 h-10 rounded-xl bg-[#F5F0EA] hover:bg-[#EBEBEB] flex items-center justify-center font-medium">+</button>
          </div>
        </div>

        {/* Default veg days */}
        <div>
          <label className="text-sm font-medium block mb-2">Default veg days ({vegDays} veg / {7 - vegDays} non-veg)</label>
          <input
            type="range"
            min={0}
            max={7}
            value={vegDays}
            onChange={e => setVegDays(Number(e.target.value))}
            className="w-full accent-[#2D2A26]"
          />
        </div>

        {/* Default cuisines */}
        <div>
          <label className="text-sm font-medium block mb-2">Default cuisines</label>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map(c => (
              <button
                key={c}
                onClick={() => toggleCuisine(c)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  cuisines.includes(c)
                    ? 'bg-[#2D2A26] text-white'
                    : 'bg-[#F5F0EA] text-[#2D2A26] hover:bg-[#EBEBEB]'
                }`}
              >
                {CUISINE_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Maid language */}
        <div>
          <label className="text-sm font-medium block mb-2">Maid link language</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMaidLang('hi')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                maidLang === 'hi' ? 'bg-[#2D2A26] text-white' : 'bg-[#F5F0EA] hover:bg-[#EBEBEB]'
              }`}
            >
              Hindi
            </button>
            <button
              onClick={() => setMaidLang('mr')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                maidLang === 'mr' ? 'bg-[#2D2A26] text-white' : 'bg-[#F5F0EA] hover:bg-[#EBEBEB]'
              }`}
            >
              Marathi
            </button>
          </div>
        </div>

        <button
          onClick={saveSettings}
          className="w-full bg-[#2D2A26] text-white py-3.5 rounded-xl font-medium text-base hover:bg-[#333] transition-colors"
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>

        {/* Add dish link */}
        <div className="border-t border-[#E5DFD6] pt-6">
          <Link href="/add-dish" className="text-sm text-[#8C8680] hover:text-[#2D2A26]">
            + Add a custom dish to the database
          </Link>
        </div>
      </div>
    </div>
  )
}
