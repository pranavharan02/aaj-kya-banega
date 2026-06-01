'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { DAY_NAMES } from '@/lib/types'
import { getIngredientEmoji } from '@/lib/ingredient-emojis'

interface DayIngredient {
  day: number
  dishName: string
  ingredientName: string
  ingredientId: string
  quantity: number
  unit: string
  emoji: string
  purchased: boolean
  shoppingListId?: string
}

export default function ShoppingListPage() {
  const params = useParams()
  const menuId = params.menuId as string
  const [dayItems, setDayItems] = useState<DayIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'daily' | 'all'>('daily')

  useEffect(() => { loadData() }, [menuId])

  async function loadData() {
    setLoading(true)
    // Fetch menu items with dishes and their ingredients
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('day_of_week, dish:dishes(name_en, id)')
      .eq('menu_id', menuId)
      .order('day_of_week')

    if (!menuItems?.length) { setLoading(false); return }

    // Fetch shopping list for purchased state
    const { data: shopItems } = await supabase
      .from('shopping_lists')
      .select('id, ingredient_id, to_buy_qty, is_purchased, unit')
      .eq('menu_id', menuId)

    const purchasedMap = new Map(shopItems?.map(s => [s.ingredient_id, { purchased: s.is_purchased, id: s.id }]) || [])

    // Fetch all dish ingredients
    const dishIds = menuItems.map((mi: any) => mi.dish?.id).filter(Boolean)
    const { data: allDishIngs } = await supabase
      .from('dish_ingredients')
      .select('dish_id, quantity, unit, ingredient:ingredients(id, name_en)')
      .in('dish_id', dishIds)

    // Build day-wise ingredient list
    const result: DayIngredient[] = []
    for (const mi of menuItems) {
      const dish = (mi as any).dish
      if (!dish) continue
      const dishIngs = allDishIngs?.filter((di: any) => di.dish_id === dish.id) || []
      for (const di of dishIngs) {
        const ing = (di as any).ingredient
        if (!ing) continue
        const pState = purchasedMap.get(ing.id)
        result.push({
          day: mi.day_of_week,
          dishName: dish.name_en,
          ingredientName: ing.name_en,
          ingredientId: ing.id,
          quantity: di.quantity,
          unit: di.unit,
          emoji: getIngredientEmoji(ing.name_en),
          purchased: pState?.purchased || false,
          shoppingListId: pState?.id,
        })
      }
    }
    setDayItems(result)
    setLoading(false)
  }

  async function togglePurchased(ingredientId: string) {
    // Read current state BEFORE optimistic update
    const item = dayItems.find(i => i.ingredientId === ingredientId)
    if (!item) return
    const newPurchased = !item.purchased
    // Optimistic UI
    setDayItems(prev => prev.map(i =>
      i.ingredientId === ingredientId ? { ...i, purchased: newPurchased } : i
    ))
    // Persist
    if (item.shoppingListId) {
      await supabase.from('shopping_lists').update({ is_purchased: newPurchased }).eq('ingredient_id', ingredientId).eq('menu_id', menuId)
    }
  }

  function copyAsText() {
    const byDay = groupByDay(dayItems.filter(i => !i.purchased))
    let text = `🛒 Shopping List\n\n`
    for (const [day, items] of Object.entries(byDay)) {
      text += `${DAY_NAMES[parseInt(day)]}:\n`
      const unique = dedup(items)
      for (const item of unique) {
        text += `  ${item.emoji} ${item.ingredientName}: ${item.quantity} ${item.unit}\n`
      }
      text += '\n'
    }
    navigator.clipboard.writeText(text)
    toast('Shopping list copied!')
  }

  function groupByDay(items: DayIngredient[]): Record<number, DayIngredient[]> {
    const groups: Record<number, DayIngredient[]> = {}
    for (const item of items) {
      if (!groups[item.day]) groups[item.day] = []
      groups[item.day].push(item)
    }
    return groups
  }

  function dedup(items: DayIngredient[]): DayIngredient[] {
    const seen = new Map<string, DayIngredient>()
    for (const item of items) {
      const existing = seen.get(item.ingredientId)
      if (existing) {
        existing.quantity += item.quantity
      } else {
        seen.set(item.ingredientId, { ...item })
      }
    }
    return Array.from(seen.values())
  }

  if (loading) return (
    <div className="py-10 space-y-4">
      {[1,2,3].map(i => <div key={i} className="card p-5 h-20 animate-pulse" />)}
    </div>
  )

  const byDay = groupByDay(dayItems)
  const allUnique = dedup(dayItems)
  const purchasedCount = allUnique.filter(i => i.purchased).length

  return (
    <div className="py-6">
      <Link href={`/menu/${menuId}`} className="text-[15px] text-[#8C8680] hover:text-[#2D2A26] mb-5 inline-block">← Back to menu</Link>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#2D2A26]">🛒 Shopping List</h1>
          <p className="text-[15px] text-[#8C8680]">{purchasedCount}/{allUnique.length} items done</p>
        </div>
        <button onClick={copyAsText} className="pill hover:bg-[#F0EDE8] transition-colors cursor-pointer">📋 Copy</button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl bg-[#FFFDF9] border border-[#E5DFD6] mb-6" style={{boxShadow:'inset 0 1px 2px rgba(45,42,38,0.04)'}}>
        <button onClick={() => setTab('daily')} className={`flex-1 py-2.5 rounded-xl text-[15px] font-semibold transition-all ${tab==='daily' ? 'bg-[#2D2A26] text-white shadow-sm' : 'text-[#8C8680]'}`}>By Day</button>
        <button onClick={() => setTab('all')} className={`flex-1 py-2.5 rounded-xl text-[15px] font-semibold transition-all ${tab==='all' ? 'bg-[#2D2A26] text-white shadow-sm' : 'text-[#8C8680]'}`}>All Items</button>
      </div>

      {tab === 'daily' ? (
        // Day-wise view
        <div className="space-y-6">
          {Object.entries(byDay).sort(([a],[b]) => parseInt(a)-parseInt(b)).map(([day, items]) => {
            const unique = dedup(items)
            const dishName = items[0]?.dishName
            return (
              <div key={day}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-[17px] font-bold text-[#2D2A26]">{DAY_NAMES[parseInt(day)]}</h2>
                  <span className="text-[13px] text-[#8C8680]">{dishName}</span>
                </div>
                <div className="card overflow-hidden divide-y divide-[#F0EDE8]">
                  {unique.map(item => (
                    <button key={`${day}-${item.ingredientId}`}
                      onClick={() => togglePurchased(item.ingredientId)}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all ${item.purchased ? 'bg-[#F0EDE8] opacity-50' : ''}`}>
                      <span className="text-lg">{item.emoji}</span>
                      <span className={`flex-1 text-[16px] font-medium ${item.purchased ? 'line-through text-[#8C8680]' : 'text-[#2D2A26]'}`}>{item.ingredientName}</span>
                      <span className="text-[14px] text-[#8C8680] font-medium">{item.quantity} {item.unit}</span>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${item.purchased ? 'bg-[#2E7D32] border-[#2E7D32]' : 'border-[#D5CFC6]'}`}>
                        {item.purchased && <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // All items view
        <div className="card overflow-hidden divide-y divide-[#F0EDE8]">
          {allUnique.sort((a,b) => a.ingredientName.localeCompare(b.ingredientName)).map(item => (
            <button key={item.ingredientId}
              onClick={() => togglePurchased(item.ingredientId)}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all ${item.purchased ? 'bg-[#F0EDE8] opacity-50' : ''}`}>
              <span className="text-lg">{item.emoji}</span>
              <span className={`flex-1 text-[16px] font-medium ${item.purchased ? 'line-through text-[#8C8680]' : 'text-[#2D2A26]'}`}>{item.ingredientName}</span>
              <span className="text-[14px] text-[#8C8680] font-medium">{item.quantity} {item.unit}</span>
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${item.purchased ? 'bg-[#2E7D32] border-[#2E7D32]' : 'border-[#D5CFC6]'}`}>
                {item.purchased && <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
