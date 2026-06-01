'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ensureHousehold, getHouseholdId } from '@/lib/household'
import { getMonday, formatDate, formatDateDisplay, getWeekLabel, shiftWeekStart } from '@/lib/dates'
import type { WeeklyMenu, MenuItem } from '@/lib/types'
import { CUISINE_LABELS, DAY_NAMES } from '@/lib/types'

const CUISINE_BG: Record<string, string> = {
  tamil: '#E8D5C4', north: '#F5E6CC', marathi: '#D4E8D4', bihari: '#E8DCC8',
}

export default function Home() {
  const [menu, setMenu] = useState<WeeklyMenu | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => formatDate(getMonday()))

  const loadMenu = useCallback(async () => {
    setLoading(true)
    await ensureHousehold()
    const householdId = getHouseholdId()
    if (!householdId) { setLoading(false); return }

    const { data: menus } = await supabase
      .from('weekly_menus')
      .select('*, menu_items:menu_items(*, dish:dishes(*))')
      .eq('household_id', householdId)
      .eq('week_start_date', weekStart)
      .order('created_at', { ascending: false })
      .limit(1)

    if (menus && menus.length > 0) {
      const m = menus[0]
      setMenu(m)
      setItems(m.menu_items || [])
    } else {
      setMenu(null)
      setItems([])
    }
    setLoading(false)
  }, [weekStart])

  useEffect(() => { loadMenu() }, [loadMenu])

  function shiftWeek(delta: number) {
    setWeekStart(shiftWeekStart(weekStart, delta))
  }

  const vegCount = items.filter(i => i.dish?.is_veg).length
  const nvCount = items.filter(i => i.dish && !i.dish.is_veg).length

  return (
    <div className="py-6">
      {/* Week selector */}
      <div className="flex items-center justify-between mb-10">
        <button onClick={() => shiftWeek(-1)} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white text-[#8C8680] transition-colors" aria-label="Previous week">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="text-center">
          <p className="text-[15px] text-[#8C8680] mb-0.5">Week of</p>
          <p className="text-xl font-semibold text-[#2D2A26]">{getWeekLabel(weekStart)}</p>
        </div>
        <button onClick={() => shiftWeek(1)} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white text-[#8C8680] transition-colors" aria-label="Next week">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#F5F0EA]" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-20 rounded bg-[#F5F0EA]" />
                  <div className="h-4 w-40 rounded bg-[#F5F0EA]" />
                  <div className="h-3 w-28 rounded bg-[#F5F0EA]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : menu ? (
        <div>
          {/* Stats row */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <span className="px-4 py-1.5 rounded-full bg-white text-[15px] font-medium shadow">
              <span className="text-[#2E7D32]">{vegCount} veg</span>
              <span className="text-[#C5C0BA] mx-1.5">/</span>
              <span className="text-[#C62828]">{nvCount} non-veg</span>
            </span>
            {menu.is_finalized && (
              <span className="px-4 py-1.5 rounded-full bg-[#2D2A26] text-white text-[15px] font-medium">Finalized</span>
            )}
          </div>

          {/* Menu preview cards */}
          <div className="space-y-3 mb-8">
            {items.map(item => {
              const dish = item.dish
              if (!dish) return null
              const bg = CUISINE_BG[dish.cuisine] || '#F5F5F5'
              return (
                <Link key={item.id} href={`/menu/${menu.id}`} className="card p-4 flex gap-4 block">
                  <div className="w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: bg }}>
                    {dish.illustration_url ? (
                      <img src={dish.illustration_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-2xl font-bold opacity-20">{dish.name_en.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-[13px] text-[#8C8680]">{DAY_NAMES[item.day_of_week]}, {formatDateDisplay(item.date)}</p>
                    <p className="font-semibold text-[17px] text-[#2D2A26] truncate mt-0.5">{dish.name_en}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-full text-[12px] font-medium" style={{ backgroundColor: bg }}>
                        {CUISINE_LABELS[dish.cuisine as keyof typeof CUISINE_LABELS]}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${dish.is_veg ? 'bg-[#2E7D32]' : 'bg-[#C62828]'}`} />
                      <span className="text-[13px] text-[#8C8680] ml-auto">{dish.calories} cal</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <Link
            href={`/menu/${menu.id}`}
            className="block w-full text-center bg-[#2D2A26] text-white py-4 rounded-2xl font-semibold text-[17px] hover:bg-[#45403A] transition-colors shadow"
          >
            View Full Menu
          </Link>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-7xl mb-6">🍛</div>
          <h2 className="text-3xl font-bold text-[#2D2A26] mb-3">No menu yet</h2>
          <p className="text-[#8C8680] mb-10 max-w-sm mx-auto text-lg leading-relaxed">
            Plan this week's dinners — pick cuisines, set veg/non-veg split, and let AI build your menu.
          </p>
          <Link
            href={`/plan?week=${weekStart}`}
            className="inline-block bg-[#2D2A26] text-white px-10 py-4 rounded-2xl font-semibold text-[17px] hover:bg-[#45403A] transition-colors shadow"
          >
            Plan This Week's Menu
          </Link>
        </div>
      )}
    </div>
  )
}
