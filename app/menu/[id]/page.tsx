'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getWeekLabel, formatDateDisplay } from '@/lib/dates'
import { CUISINE_LABELS, ACCOMPANIMENT_LABELS, DAY_NAMES } from '@/lib/types'
import type { WeeklyMenu, MenuItem } from '@/lib/types'
import { toast } from '@/components/Toast'

const CUISINE_BG: Record<string, string> = {
  tamil: '#E8D5C4', north: '#F5E6CC', marathi: '#D4E8D4', bihari: '#E8DCC8', custom: '#F5F5F5',
}

export default function MenuCalendarPage() {
  const params = useParams()
  const menuId = params.id as string
  const [menu, setMenu] = useState<WeeklyMenu | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [swapping, setSwapping] = useState<number | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [swapSource, setSwapSource] = useState<number | null>(null)

  const loadMenu = useCallback(async () => {
    const [{ data: m }, { data: mi }] = await Promise.all([
      supabase.from('weekly_menus').select('*').eq('id', menuId).single(),
      supabase.from('menu_items').select('*, dish:dishes(*)').eq('menu_id', menuId).order('day_of_week'),
    ])
    setMenu(m)
    setItems(mi || [])
    setLoading(false)
  }, [menuId])

  useEffect(() => { loadMenu() }, [loadMenu])

  async function handleSwap(dayOfWeek: number) {
    setSwapping(dayOfWeek)
    const item = items.find(i => i.day_of_week === dayOfWeek)
    if (!item?.dish) { setSwapping(null); return }

    const currentSlugs = items.map(i => i.dish?.slug).filter(Boolean) as string[]
    const { data: alternatives } = await supabase
      .from('dishes')
      .select('id, slug, name_en, is_veg')
      .eq('cuisine', item.dish.cuisine)
      .eq('is_veg', item.dish.is_veg)
      .not('slug', 'in', `(${currentSlugs.map(s => `"${s}"`).join(',')})`)
      .limit(5)

    if (alternatives && alternatives.length > 0) {
      const pick = alternatives[Math.floor(Math.random() * alternatives.length)]
      await supabase
        .from('menu_items')
        .update({ dish_id: pick.id, was_swapped: true })
        .eq('id', item.id)
      toast(`Swapped to ${pick.name_en}`)
    } else {
      toast('No alternatives available', 'info')
    }
    await loadMenu()
    setSwapping(null)
  }

  async function handleDaySwap(sourceDay: number, targetDay: number) {
    const sourceItem = items.find(i => i.day_of_week === sourceDay)
    const targetItem = items.find(i => i.day_of_week === targetDay)
    if (!sourceItem || !targetItem) return

    // Optimistic update
    setItems(prev => prev.map(i => {
      if (i.day_of_week === sourceDay) return { ...i, dish: targetItem.dish, dish_id: targetItem.dish_id }
      if (i.day_of_week === targetDay) return { ...i, dish: sourceItem.dish, dish_id: sourceItem.dish_id }
      return i
    }))
    setSwapSource(null)

    // Persist: swap dish_ids and dates between the two items
    await Promise.all([
      supabase.from('menu_items').update({ dish_id: targetItem.dish_id }).eq('id', sourceItem.id),
      supabase.from('menu_items').update({ dish_id: sourceItem.dish_id }).eq('id', targetItem.id),
    ])
    toast(`Swapped ${DAY_NAMES[sourceDay]} ↔ ${DAY_NAMES[targetDay]}`)
  }

  async function handleFinalize() {
    if (!confirm('Lock this menu for the week?')) return
    setFinalizing(true)
    await supabase
      .from('weekly_menus')
      .update({ is_finalized: true, finalized_at: new Date().toISOString() })
      .eq('id', menuId)
    await fetch(`/api/menus/${menuId}/finalize`, { method: 'POST' })
    await loadMenu()
    setFinalizing(false)
    setShowShareOptions(true)
    toast('Menu finalized! Shopping list ready.')
  }

  async function handleUnfinalize() {
    await supabase
      .from('weekly_menus')
      .update({ is_finalized: false, finalized_at: null })
      .eq('id', menuId)
    await loadMenu()
    setShowShareOptions(false)
    toast('Menu unlocked for editing')
  }

  function copyMaidLink(lang: string) {
    const link = `${window.location.origin}/maid/${menuId}?lang=${lang}`
    navigator.clipboard.writeText(link)
    toast(`${lang === 'hi' ? 'Hindi' : 'Marathi'} link copied!`)
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

      {/* Swap mode hint */}
      {swapSource !== null && !menu.is_finalized && (
        <div className="mb-4 px-4 py-3 bg-[#F5F5F5] rounded-xl text-sm text-center">
          Tap another day to swap with <strong>{DAY_NAMES[swapSource]}</strong>
          <button onClick={() => setSwapSource(null)} className="ml-3 text-[#6B6B6B] hover:text-[#1A1A1A]">Cancel</button>
        </div>
      )}

      {/* Calendar tiles */}
      <div className="space-y-3 mb-8">
        {items.map(item => {
          const dish = item.dish
          if (!dish) return null
          const cuisineBg = CUISINE_BG[dish.cuisine] || '#F5F5F5'
          const isSwapTarget = swapSource !== null && swapSource !== item.day_of_week

          return (
            <div
              key={item.id}
              className={`bg-[#F5F5F5] rounded-2xl p-4 transition-all relative group ${
                isSwapTarget ? 'ring-2 ring-[#1A1A1A] ring-offset-2 cursor-pointer' :
                swapSource === item.day_of_week ? 'ring-2 ring-[#6B6B6B] opacity-60' : 'hover:bg-[#EBEBEB]'
              }`}
              onClick={isSwapTarget ? () => handleDaySwap(swapSource!, item.day_of_week) : undefined}
            >
              {/* Action buttons - only in draft mode */}
              {!menu.is_finalized && swapSource === null && (
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {/* Move to another day */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSwapSource(item.day_of_week) }}
                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white"
                    title="Move to another day"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 2L12 6M4 10L8 14L12 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {/* Swap for different dish */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSwap(item.day_of_week) }}
                    disabled={swapping === item.day_of_week}
                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white"
                    title="Replace with different dish"
                  >
                    {swapping === item.day_of_week ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.33 8A6.67 6.67 0 0112.45 3.55M14.67 8A6.67 6.67 0 013.55 12.45" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    )}
                  </button>
                </div>
              )}

              <Link href={isSwapTarget ? '#' : `/menu/${menuId}/dish/${dish.slug}`} className="flex gap-4" onClick={isSwapTarget ? (e) => e.preventDefault() : undefined}>
                {/* Dish image */}
                <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: cuisineBg }}>
                  {dish.illustration_url ? (
                    <img src={dish.illustration_url} alt={dish.name_en} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-xl font-bold opacity-25">{dish.name_en.charAt(0)}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#6B6B6B]">
                    {DAY_NAMES[item.day_of_week]}, {formatDateDisplay(item.date)}
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
              <p className="font-medium">Share with your maid:</p>
              <div className="flex gap-2">
                <button onClick={() => copyMaidLink('hi')}
                  className="flex-1 bg-white border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-medium hover:bg-[#EBEBEB] transition-colors">
                  Copy Hindi link
                </button>
                <button onClick={() => copyMaidLink('mr')}
                  className="flex-1 bg-white border border-[#E0E0E0] py-2.5 rounded-xl text-sm font-medium hover:bg-[#EBEBEB] transition-colors">
                  Copy Marathi link
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Link href={`/shopping-list/${menuId}`}
              className="flex-1 text-center bg-[#1A1A1A] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#333] transition-colors">
              Shopping List
            </Link>
            <button onClick={() => setShowShareOptions(!showShareOptions)}
              className="flex-1 text-center border border-[#1A1A1A] py-3 rounded-xl font-medium text-sm hover:bg-[#F5F5F5] transition-colors">
              Share with Maid
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
