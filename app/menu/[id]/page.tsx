'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getWeekLabel, formatDateDisplay } from '@/lib/dates'
import { CUISINE_LABELS, CUISINE_COLORS, ACCOMPANIMENT_LABELS, DAY_NAMES } from '@/lib/types'
import type { WeeklyMenu, MenuItem } from '@/lib/types'

export default function MenuCalendarPage() {
  const params = useParams()
  const router = useRouter()
  const menuId = params.id as string
  const [menu, setMenu] = useState<WeeklyMenu | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [swapping, setSwapping] = useState<number | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)

  useEffect(() => { loadMenu() }, [menuId])

  async function loadMenu() {
    setLoading(true)
    const { data: m } = await supabase
      .from('weekly_menus')
      .select('*')
      .eq('id', menuId)
      .single()
    setMenu(m)

    const { data: mi } = await supabase
      .from('menu_items')
      .select('*, dish:dishes(*)')
      .eq('menu_id', menuId)
      .order('day_of_week')
    setItems(mi || [])
    setLoading(false)
  }

  async function handleSwap(dayOfWeek: number) {
    setSwapping(dayOfWeek)
    const item = items.find(i => i.day_of_week === dayOfWeek)
    if (!item?.dish) return

    // Get a random alternative
    const currentSlugs = items.map(i => i.dish?.slug).filter(Boolean)
    const { data: alternatives } = await supabase
      .from('dishes')
      .select('id, slug, is_veg')
      .eq('cuisine', item.dish.cuisine)
      .eq('is_veg', item.dish.is_veg)
      .not('slug', 'in', `(${currentSlugs.join(',')})`)
      .limit(5)

    if (alternatives && alternatives.length > 0) {
      const pick = alternatives[Math.floor(Math.random() * alternatives.length)]
      await supabase
        .from('menu_items')
        .update({ dish_id: pick.id, was_swapped: true })
        .eq('id', item.id)
    }

    await loadMenu()
    setSwapping(null)
  }

  async function handleFinalize() {
    setFinalizing(true)
    await supabase
      .from('weekly_menus')
      .update({ is_finalized: true, finalized_at: new Date().toISOString() })
      .eq('id', menuId)

    // Generate shopping list
    await fetch(`/api/menus/${menuId}/finalize`, { method: 'POST' })

    await loadMenu()
    setFinalizing(false)
    setShowShareOptions(true)
  }

  async function handleUnfinalize() {
    await supabase
      .from('weekly_menus')
      .update({ is_finalized: false, finalized_at: null })
      .eq('id', menuId)
    await loadMenu()
    setShowShareOptions(false)
  }

  function getMaidLink(lang: string) {
    return `${window.location.origin}/maid/${menuId}?lang=${lang}`
  }

  async function copyMaidLink(lang: string) {
    await navigator.clipboard.writeText(getMaidLink(lang))
    alert(`Link copied! Share it with your maid.`)
  }

  if (loading) return <div className="py-20 text-center text-[#6B6B6B]">Loading menu...</div>
  if (!menu) return <div className="py-20 text-center text-[#6B6B6B]">Menu not found</div>

  const vegCount = items.filter(i => i.dish?.is_veg).length
  const nvCount = items.filter(i => i.dish && !i.dish.is_veg).length
  const avgCal = items.length > 0
    ? Math.round(items.reduce((s, i) => s + (i.dish?.calories || 0), 0) / items.length)
    : 0

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">Weekly Menu</h1>
        {menu.is_finalized && (
          <button onClick={handleUnfinalize} className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A]">
            Edit
          </button>
        )}
      </div>
      <p className="text-[#6B6B6B] mb-6">{getWeekLabel(menu.week_start_date)}</p>

      {/* Stats */}
      <div className="flex gap-2 mb-6 flex-wrap text-sm">
        <span className="px-3 py-1 rounded-full bg-[#F5F5F5]">
          <span className="text-[#2E7D32]">{vegCount}V</span> / <span className="text-[#C62828]">{nvCount}NV</span>
        </span>
        <span className="px-3 py-1 rounded-full bg-[#F5F5F5]">~{avgCal} cal/day</span>
        <span className="px-3 py-1 rounded-full bg-[#F5F5F5] capitalize">
          {menu.generation_mode === 'ai' ? 'AI-generated' : 'Auto-generated'}
        </span>
      </div>

      {/* Calendar tiles */}
      <div className="space-y-3 mb-8">
        {items.map(item => {
          const dish = item.dish
          if (!dish) return null
          const cuisineBg = dish.cuisine === 'tamil' ? '#E8D5C4' : dish.cuisine === 'north' ? '#F5E6CC' : dish.cuisine === 'marathi' ? '#D4E8D4' : '#E8DCC8'

          return (
            <div
              key={item.id}
              className="bg-[#F5F5F5] rounded-2xl p-4 hover:bg-[#EBEBEB] transition-colors relative group"
            >
              {/* Swap button */}
              {!menu.is_finalized && (
                <button
                  onClick={() => handleSwap(item.day_of_week)}
                  disabled={swapping === item.day_of_week}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
                  title="Swap dish"
                >
                  {swapping === item.day_of_week ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.33 8A6.67 6.67 0 0112.45 3.55M14.67 8A6.67 6.67 0 013.55 12.45" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  )}
                </button>
              )}

              <Link href={`/menu/${menuId}/dish/${dish.slug}`} className="flex gap-4">
                {/* Dish image */}
                <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: cuisineBg }}>
                  {dish.illustration_url ? (
                    <img src={dish.illustration_url} alt={dish.name_en} className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-xl font-bold opacity-25">{dish.name_en.charAt(0)}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#6B6B6B]">
                    {DAY_NAMES[item.day_of_week]},{' '}
                    {formatDateDisplay(item.date)}
                  </p>
                  <p className="font-semibold text-base mt-0.5 truncate">{dish.name_en}</p>
                  <div className="flex gap-1.5 items-center mt-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: cuisineBg }}>
                      {CUISINE_LABELS[dish.cuisine as keyof typeof CUISINE_LABELS]}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${dish.is_veg ? 'bg-[#2E7D32]' : 'bg-[#C62828]'}`} />
                    {dish.default_accompaniment && (
                      <span className="text-xs text-[#6B6B6B]">
                        + {ACCOMPANIMENT_LABELS[dish.default_accompaniment] || dish.default_accompaniment}
                      </span>
                    )}
                    <span className="text-xs text-[#6B6B6B] ml-auto">
                      {dish.calories} cal
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      {!menu.is_finalized ? (
        <button
          onClick={handleFinalize}
          disabled={finalizing}
          className="w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl font-medium text-base hover:bg-[#333] transition-colors disabled:opacity-50"
        >
          {finalizing ? 'Finalizing...' : 'Finalize Menu'}
        </button>
      ) : (
        <div className="space-y-3">
          {showShareOptions && (
            <div className="bg-[#F5F5F5] rounded-2xl p-5 space-y-3">
              <p className="font-medium">Menu finalized! Share with your maid:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => copyMaidLink('hi')}
                  className="flex-1 bg-white border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-medium hover:bg-[#EBEBEB] transition-colors"
                >
                  Copy Hindi link
                </button>
                <button
                  onClick={() => copyMaidLink('mr')}
                  className="flex-1 bg-white border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-medium hover:bg-[#EBEBEB] transition-colors"
                >
                  Copy Marathi link
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Link
              href={`/shopping-list/${menuId}`}
              className="flex-1 text-center bg-[#1A1A1A] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#333] transition-colors"
            >
              Shopping List
            </Link>
            <button
              onClick={() => setShowShareOptions(!showShareOptions)}
              className="flex-1 text-center border border-[#1A1A1A] py-3 rounded-xl font-medium text-sm hover:bg-[#F5F5F5] transition-colors"
            >
              Share with Maid
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
