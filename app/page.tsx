'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ensureHousehold, getHouseholdId } from '@/lib/household'
import { getMonday, formatDate, getWeekLabel } from '@/lib/dates'
import type { WeeklyMenu, MenuItem } from '@/lib/types'
import { CUISINE_LABELS } from '@/lib/types'

export default function Home() {
  const router = useRouter()
  const [menu, setMenu] = useState<WeeklyMenu | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => formatDate(getMonday()))

  useEffect(() => {
    loadMenu()
  }, [weekStart])

  async function loadMenu() {
    setLoading(true)
    await ensureHousehold()
    const householdId = getHouseholdId()
    if (!householdId) return

    const { data: menus } = await supabase
      .from('weekly_menus')
      .select('*')
      .eq('household_id', householdId)
      .eq('week_start_date', weekStart)
      .order('created_at', { ascending: false })
      .limit(1)

    if (menus && menus.length > 0) {
      setMenu(menus[0])
      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('*, dish:dishes(*)')
        .eq('menu_id', menus[0].id)
        .order('day_of_week')
      setItems(menuItems || [])
    } else {
      setMenu(null)
      setItems([])
    }
    setLoading(false)
  }

  function shiftWeek(delta: number) {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(formatDate(d))
  }

  const vegCount = items.filter(i => i.dish?.is_veg).length
  const nvCount = items.filter(i => i.dish && !i.dish.is_veg).length
  const cuisines = [...new Set(items.map(i => i.dish?.cuisine).filter(Boolean))]

  return (
    <div className="py-8">
      {/* Week selector */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => shiftWeek(-1)} className="p-2 rounded-lg hover:bg-[#F5F5F5] text-[#6B6B6B]">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="text-center">
          <p className="text-sm text-[#6B6B6B]">Week of</p>
          <p className="text-lg font-semibold">{getWeekLabel(weekStart)}</p>
        </div>
        <button onClick={() => shiftWeek(1)} className="p-2 rounded-lg hover:bg-[#F5F5F5] text-[#6B6B6B]">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#6B6B6B]">Loading...</div>
      ) : menu ? (
        <div>
          {/* Quick stats */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#F5F5F5] text-sm">
              <span className="text-[#2E7D32]">{vegCount} veg</span>
              {' / '}
              <span className="text-[#C62828]">{nvCount} non-veg</span>
            </span>
            {cuisines.map(c => (
              <span key={c} className="px-3 py-1 rounded-full bg-[#F5F5F5] text-sm">
                {CUISINE_LABELS[c as keyof typeof CUISINE_LABELS]}
              </span>
            ))}
            {menu.is_finalized && (
              <span className="px-3 py-1 rounded-full bg-[#1A1A1A] text-white text-sm">Finalized</span>
            )}
          </div>

          {/* Mini calendar preview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {items.slice(0, 4).map(item => (
              <div key={item.id} className="bg-[#F5F5F5] rounded-2xl p-4">
                <p className="text-xs text-[#6B6B6B]">
                  {new Date(item.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
                <p className="font-medium text-sm mt-1 truncate">{item.dish?.name_en}</p>
              </div>
            ))}
          </div>

          <Link
            href={`/menu/${menu.id}`}
            className="block w-full text-center bg-[#1A1A1A] text-white py-3.5 rounded-xl font-medium text-base hover:bg-[#333] transition-colors"
          >
            View Full Menu
          </Link>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🍛</div>
          <h2 className="text-2xl font-semibold mb-2">No menu yet</h2>
          <p className="text-[#6B6B6B] mb-8 max-w-sm mx-auto">
            Plan this week's dinners — pick cuisines, set veg/non-veg split, and let AI build your menu.
          </p>
          <Link
            href={`/plan?week=${weekStart}`}
            className="inline-block bg-[#1A1A1A] text-white px-8 py-3.5 rounded-xl font-medium text-base hover:bg-[#333] transition-colors"
          >
            Plan This Week's Menu
          </Link>
        </div>
      )}
    </div>
  )
}
