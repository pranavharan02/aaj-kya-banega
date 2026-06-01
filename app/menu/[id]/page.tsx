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
  tamil: '#E8D5C4', north: '#F5E6CC', marathi: '#D4E8D4', bihari: '#E8DCC8', custom: '#F0EDE8',
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
      .from('dishes').select('id, slug, name_en, is_veg')
      .eq('cuisine', item.dish.cuisine).eq('is_veg', item.dish.is_veg)
      .not('slug', 'in', `(${currentSlugs.map(s => `"${s}"`).join(',')})`)
      .limit(5)
    if (alternatives?.length) {
      const pick = alternatives[Math.floor(Math.random() * alternatives.length)]
      await supabase.from('menu_items').update({ dish_id: pick.id, was_swapped: true }).eq('id', item.id)
      toast(`Swapped to ${pick.name_en}`)
    } else { toast('No alternatives available', 'info') }
    await loadMenu()
    setSwapping(null)
  }

  async function handleDaySwap(sourceDay: number, targetDay: number) {
    const src = items.find(i => i.day_of_week === sourceDay)
    const tgt = items.find(i => i.day_of_week === targetDay)
    if (!src || !tgt) return
    setItems(prev => prev.map(i => {
      if (i.day_of_week === sourceDay) return { ...i, dish: tgt.dish, dish_id: tgt.dish_id }
      if (i.day_of_week === targetDay) return { ...i, dish: src.dish, dish_id: src.dish_id }
      return i
    }))
    setSwapSource(null)
    await Promise.all([
      supabase.from('menu_items').update({ dish_id: tgt.dish_id }).eq('id', src.id),
      supabase.from('menu_items').update({ dish_id: src.dish_id }).eq('id', tgt.id),
    ])
    toast(`${DAY_NAMES[sourceDay]} ↔ ${DAY_NAMES[targetDay]}`)
  }

  async function handleFinalize() {
    if (!confirm('Lock this menu for the week?')) return
    setFinalizing(true)
    await supabase.from('weekly_menus').update({ is_finalized: true, finalized_at: new Date().toISOString() }).eq('id', menuId)
    await fetch(`/api/menus/${menuId}/finalize`, { method: 'POST' })
    await loadMenu()
    setFinalizing(false)
    setShowShareOptions(true)
    toast('Menu finalized!')
  }

  async function handleUnfinalize() {
    await supabase.from('weekly_menus').update({ is_finalized: false, finalized_at: null }).eq('id', menuId)
    await loadMenu()
    setShowShareOptions(false)
    toast('Menu unlocked')
  }

  function copyMaidLink(lang: string) {
    navigator.clipboard.writeText(`${window.location.origin}/maid/${menuId}?lang=${lang}`)
    toast(`${lang === 'hi' ? 'Hindi' : 'Marathi'} link copied!`)
  }

  if (loading) return (
    <div className="py-10 space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="card p-5 h-24 animate-pulse" />)}
    </div>
  )
  if (!menu) return <div className="py-20 text-center text-[#8C8680] text-lg">Menu not found</div>

  const vegCount = items.filter(i => i.dish?.is_veg).length
  const nvCount = items.filter(i => i.dish && !i.dish.is_veg).length
  const avgCal = items.length ? Math.round(items.reduce((s, i) => s + (i.dish?.calories || 0), 0) / items.length) : 0

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[28px] font-bold text-[#2D2A26]">Weekly Menu</h1>
        {menu.is_finalized && (
          <button onClick={handleUnfinalize} className="text-[15px] text-[#8C8680] hover:text-[#2D2A26] transition-colors">Edit</button>
        )}
      </div>
      <p className="text-[#8C8680] text-[17px] mb-6">{getWeekLabel(menu.week_start_date)}</p>

      {/* Stats */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <span className="px-4 py-2 rounded-full bg-white text-[15px] font-medium shadow-sm">
          <span className="text-[#2E7D32]">{vegCount}V</span>
          <span className="text-[#C5C0BA] mx-1">/</span>
          <span className="text-[#C62828]">{nvCount}NV</span>
        </span>
        <span className="px-4 py-2 rounded-full bg-white text-[15px] font-medium shadow-sm">~{avgCal} cal/day</span>
        <span className="px-4 py-2 rounded-full bg-white text-[15px] font-medium shadow-sm capitalize">
          {menu.generation_mode === 'ai' ? 'AI-generated' : 'Auto-generated'}
        </span>
      </div>

      {/* Swap hint */}
      {swapSource !== null && !menu.is_finalized && (
        <div className="card mb-5 px-5 py-4 text-[15px] text-center">
          Tap another day to swap with <strong>{DAY_NAMES[swapSource]}</strong>
          <button onClick={() => setSwapSource(null)} className="ml-3 text-[#8C8680] hover:text-[#2D2A26] underline">Cancel</button>
        </div>
      )}

      {/* Calendar tiles */}
      <div className="space-y-3 mb-10">
        {items.map(item => {
          const dish = item.dish
          if (!dish) return null
          const bg = CUISINE_BG[dish.cuisine] || '#F0EDE8'
          const isTarget = swapSource !== null && swapSource !== item.day_of_week
          const isSource = swapSource === item.day_of_week

          return (
            <div
              key={item.id}
              className={`card p-5 relative group transition-all ${
                isTarget ? 'ring-2 ring-[#2D2A26] ring-offset-2 ring-offset-[#FAF9F6] cursor-pointer' :
                isSource ? 'opacity-50' : ''
              }`}
              onClick={isTarget ? () => handleDaySwap(swapSource!, item.day_of_week) : undefined}
            >
              {/* Action buttons */}
              {!menu.is_finalized && swapSource === null && (
                <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={(e) => { e.stopPropagation(); setSwapSource(item.day_of_week) }}
                    className="w-9 h-9 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EDE8] flex items-center justify-center transition-colors" title="Move">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 2L12 6M4 10L8 14L12 10" stroke="#2D2A26" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleSwap(item.day_of_week) }}
                    disabled={swapping === item.day_of_week}
                    className="w-9 h-9 rounded-xl bg-[#FAF9F6] hover:bg-[#F0EDE8] flex items-center justify-center transition-colors" title="Replace">
                    {swapping === item.day_of_week ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="#2D2A26" strokeWidth="4" fill="none"/><path className="opacity-75" fill="#2D2A26" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M1.33 8A6.67 6.67 0 0112.45 3.55M14.67 8A6.67 6.67 0 013.55 12.45" stroke="#2D2A26" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    )}
                  </button>
                </div>
              )}

              <Link href={isTarget ? '#' : `/menu/${menuId}/dish/${dish.slug}`} className="flex gap-5" onClick={isTarget ? e => e.preventDefault() : undefined}>
                <div className="w-[72px] h-[72px] rounded-2xl flex-shrink-0 overflow-hidden" style={{ backgroundColor: bg }}>
                  {dish.illustration_url ? (
                    <img src={dish.illustration_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-2xl font-bold opacity-20">{dish.name_en.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <p className="text-[13px] text-[#8C8680] font-medium">
                    {DAY_NAMES[item.day_of_week]}, {formatDateDisplay(item.date)}
                  </p>
                  <p className="font-semibold text-[19px] text-[#2D2A26] truncate mt-1">{dish.name_en}</p>
                  <div className="flex gap-2 items-center mt-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[12px] font-medium" style={{ backgroundColor: bg }}>
                      {CUISINE_LABELS[dish.cuisine as keyof typeof CUISINE_LABELS]}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${dish.is_veg ? 'bg-[#2E7D32]' : 'bg-[#C62828]'}`} />
                    {dish.default_accompaniment && (
                      <span className="text-[13px] text-[#8C8680]">+ {ACCOMPANIMENT_LABELS[dish.default_accompaniment] || dish.default_accompaniment}</span>
                    )}
                    <span className="text-[13px] text-[#8C8680] ml-auto">{dish.calories} cal</span>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      {!menu.is_finalized ? (
        <button onClick={handleFinalize} disabled={finalizing}
          className="w-full bg-[#2D2A26] text-white py-4 rounded-2xl font-semibold text-[17px] hover:bg-[#45403A] transition-colors disabled:opacity-50 shadow-sm">
          {finalizing ? 'Finalizing...' : 'Finalize Menu'}
        </button>
      ) : (
        <div className="space-y-4">
          {showShareOptions && (
            <div className="card p-5 space-y-3">
              <p className="font-semibold text-[17px]">Share with your maid</p>
              <div className="flex gap-3">
                <button onClick={() => copyMaidLink('hi')}
                  className="flex-1 bg-[#FAF9F6] py-3 rounded-xl text-[15px] font-medium hover:bg-[#F0EDE8] transition-colors">Copy Hindi link</button>
                <button onClick={() => copyMaidLink('mr')}
                  className="flex-1 bg-[#FAF9F6] py-3 rounded-xl text-[15px] font-medium hover:bg-[#F0EDE8] transition-colors">Copy Marathi link</button>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Link href={`/shopping-list/${menuId}`}
              className="flex-1 text-center bg-[#2D2A26] text-white py-4 rounded-2xl font-semibold text-[15px] hover:bg-[#45403A] transition-colors shadow-sm">
              Shopping List
            </Link>
            <button onClick={() => setShowShareOptions(!showShareOptions)}
              className="flex-1 text-center border-2 border-[#2D2A26] text-[#2D2A26] py-4 rounded-2xl font-semibold text-[15px] hover:bg-[#F0EDE8] transition-colors">
              Share with Maid
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
