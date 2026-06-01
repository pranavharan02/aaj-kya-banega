'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ensureHousehold, getHouseholdId } from '@/lib/household'
import { getIngredientEmoji } from '@/lib/ingredient-emojis'
import { toast } from '@/components/Toast'
import { formatDate, getMonday } from '@/lib/dates'
import { DAY_NAMES } from '@/lib/types'
import type { InventoryItem, Ingredient } from '@/lib/types'

interface DayShopItem {
  day: number
  date: string
  dishName: string
  ingredientName: string
  ingredientId: string
  quantity: number
  unit: string
  emoji: string
  purchased: boolean
}

export default function PantryPage() {
  const [tab, setTab] = useState<'inventory' | 'shopping'>('inventory')
  // Inventory state
  const [items, setItems] = useState<InventoryItem[]>([])
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newUnit, setNewUnit] = useState('pieces')
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
  // Shopping state
  const [shopItems, setShopItems] = useState<DayShopItem[]>([])
  const [shopLoading, setShopLoading] = useState(false)
  const [hasMenu, setHasMenu] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)

  const todayStr = formatDate(new Date())

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    await ensureHousehold()
    const householdId = getHouseholdId()
    if (!householdId) { setLoading(false); return }

    // Load inventory + ingredients in parallel
    const [{ data: inv }, { data: ings }] = await Promise.all([
      supabase.from('inventory').select('*, ingredient:ingredients(*)').eq('household_id', householdId).order('updated_at', { ascending: false }),
      supabase.from('ingredients').select('*').order('name_en'),
    ])
    setItems(inv || [])
    setAllIngredients(ings || [])

    // Check for finalized menu this week
    const weekStart = formatDate(getMonday())
    const { data: menus } = await supabase
      .from('weekly_menus')
      .select('id, is_finalized')
      .eq('household_id', householdId)
      .eq('week_start_date', weekStart)
      .eq('is_finalized', true)
      .limit(1)

    if (menus?.length) {
      setHasMenu(true)
      setMenuId(menus[0].id)
      await loadShoppingList(menus[0].id)
    }
    setLoading(false)
  }

  async function loadShoppingList(mId: string) {
    setShopLoading(true)
    // Fetch menu items with dishes
    const { data: menuItems } = await supabase
      .from('menu_items').select('day_of_week, date, dish:dishes(id, name_en)')
      .eq('menu_id', mId).order('day_of_week')

    if (!menuItems?.length) { setShopLoading(false); return }

    // Fetch shopping list for purchased state
    const { data: sl } = await supabase
      .from('shopping_lists').select('ingredient_id, is_purchased')
      .eq('menu_id', mId)
    const purchasedSet = new Set(sl?.filter(s => s.is_purchased).map(s => s.ingredient_id) || [])

    // Fetch all dish ingredients
    const dishIds = menuItems.map((mi: any) => mi.dish?.id).filter(Boolean)
    const { data: allDI } = await supabase
      .from('dish_ingredients').select('dish_id, quantity, unit, ingredient:ingredients(id, name_en)')
      .in('dish_id', dishIds)

    const result: DayShopItem[] = []
    for (const mi of menuItems) {
      const dish = (mi as any).dish
      if (!dish) continue
      const dishIngs = allDI?.filter((di: any) => di.dish_id === dish.id) || []
      for (const di of dishIngs) {
        const ing = (di as any).ingredient
        if (!ing) continue
        result.push({
          day: mi.day_of_week, date: mi.date, dishName: dish.name_en,
          ingredientName: ing.name_en, ingredientId: ing.id,
          quantity: di.quantity, unit: di.unit,
          emoji: getIngredientEmoji(ing.name_en),
          purchased: purchasedSet.has(ing.id),
        })
      }
    }
    setShopItems(result)
    setShopLoading(false)
  }

  // --- Inventory functions ---
  const filtered = allIngredients.filter(i =>
    i.name_en.toLowerCase().includes(search.toLowerCase()) && !items.some(inv => inv.ingredient_id === i.id)
  ).slice(0, 8)

  async function addItem() {
    if (!selectedIngredient || !newQty) return
    const householdId = getHouseholdId()
    if (!householdId) return
    await supabase.from('inventory').insert({ household_id: householdId, ingredient_id: selectedIngredient.id, quantity: parseFloat(newQty), unit: newUnit })
    setSelectedIngredient(null); setSearch(''); setNewQty(''); setNewUnit('pieces'); setAdding(false)
    toast('Added to pantry')
    await loadAll()
  }

  async function updateQuantity(item: InventoryItem, newQuantity: number) {
    if (newQuantity <= 0) {
      setItems(prev => prev.filter(i => i.id !== item.id))
      await supabase.from('inventory').delete().eq('id', item.id)
    } else {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQuantity } : i))
      await supabase.from('inventory').update({ quantity: newQuantity, updated_at: new Date().toISOString() }).eq('id', item.id)
    }
  }

  async function removeItem(item: InventoryItem) {
    setItems(prev => prev.filter(i => i.id !== item.id))
    await supabase.from('inventory').delete().eq('id', item.id)
  }

  // --- Shopping list functions ---
  async function toggleShopItem(ingredientId: string) {
    const item = shopItems.find(i => i.ingredientId === ingredientId)
    if (!item || !menuId) return
    const newVal = !item.purchased
    setShopItems(prev => prev.map(i => i.ingredientId === ingredientId ? { ...i, purchased: newVal } : i))
    await supabase.from('shopping_lists').update({ is_purchased: newVal }).eq('ingredient_id', ingredientId).eq('menu_id', menuId)
  }

  function isDayPast(dateStr: string): boolean {
    return dateStr < todayStr
  }

  function isDayToday(dateStr: string): boolean {
    return dateStr === todayStr
  }

  // Dedup ingredients within a day
  function dedupDay(items: DayShopItem[]): DayShopItem[] {
    const seen = new Map<string, DayShopItem>()
    for (const item of items) {
      const existing = seen.get(item.ingredientId)
      if (existing) { existing.quantity += item.quantity }
      else { seen.set(item.ingredientId, { ...item }) }
    }
    return Array.from(seen.values())
  }

  // Group by day
  const byDay: Record<number, DayShopItem[]> = {}
  for (const item of shopItems) {
    if (!byDay[item.day]) byDay[item.day] = []
    byDay[item.day].push(item)
  }

  if (loading) return (
    <div className="py-10 space-y-3">
      {[1,2,3,4,5].map(i => <div key={i} className="card p-5 h-16 animate-pulse" />)}
    </div>
  )

  return (
    <div className="py-6">
      <h1 className="text-[28px] font-bold text-[#2D2A26] mb-5">🏠 Pantry</h1>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-2xl bg-[#FFFDF9] border border-[#E5DFD6] mb-6" style={{boxShadow:'inset 0 1px 2px rgba(45,42,38,0.04)'}}>
        <button onClick={() => setTab('inventory')}
          className={`flex-1 py-3 rounded-xl text-[15px] font-semibold transition-all ${tab==='inventory' ? 'bg-[#2D2A26] text-white shadow-sm' : 'text-[#8C8680]'}`}>
          🫙 Inventory ({items.length})
        </button>
        <button onClick={() => setTab('shopping')}
          className={`flex-1 py-3 rounded-xl text-[15px] font-semibold transition-all ${tab==='shopping' ? 'bg-[#2D2A26] text-white shadow-sm' : 'text-[#8C8680]'}`}>
          🛒 Shopping {hasMenu ? `(${shopItems.length})` : ''}
        </button>
      </div>

      {tab === 'inventory' ? (
        /* ===== INVENTORY TAB ===== */
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[15px] text-[#8C8680]">{items.length} items in stock</p>
            <button onClick={() => setAdding(!adding)}
              className={`btn-primary ${adding ? '!bg-[#8C8680]' : ''}`} style={{padding:'10px 20px', fontSize:'15px'}}>
              {adding ? 'Cancel' : '+ Add'}
            </button>
          </div>

          {adding && (
            <div className="card p-5 mb-6 space-y-3">
              <div className="relative">
                <input type="text" value={search}
                  onChange={e => { setSearch(e.target.value); setSelectedIngredient(null) }}
                  placeholder="Search ingredient..."
                  className="w-full px-4 py-3 rounded-xl border border-[#E5DFD6] text-[16px] bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#2D2A26] focus:ring-offset-2 focus:ring-offset-[#F5F0EA]" />
                {search && !selectedIngredient && filtered.length > 0 && (
                  <div className="absolute z-10 mt-2 w-full bg-[#FFFDF9] border border-[#E5DFD6] rounded-2xl shadow-xl overflow-hidden">
                    {filtered.map(i => (
                      <button key={i.id} onClick={() => { setSelectedIngredient(i); setSearch(i.name_en) }}
                        className="w-full text-left px-4 py-3 text-[16px] hover:bg-[#F5F0EA] flex items-center gap-3 transition-colors">
                        <span>{getIngredientEmoji(i.name_en)}</span><span>{i.name_en}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <input type="number" value={newQty} onChange={e => setNewQty(e.target.value)} placeholder="Qty"
                  className="flex-1 px-4 py-3 rounded-xl border border-[#E5DFD6] text-[16px] bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#2D2A26]" />
                <select value={newUnit} onChange={e => setNewUnit(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[#E5DFD6] text-[16px] bg-[#FFFDF9]">
                  {['pieces', 'kg', 'g', 'L', 'mL', 'cup', 'tbsp', 'tsp', 'packets'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <button onClick={addItem} disabled={!selectedIngredient || !newQty}
                className="btn-primary w-full disabled:opacity-50">Add to pantry</button>
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🫙</div>
              <p className="text-[17px] text-[#8C8680]">Your pantry is empty. Add what you have at home.</p>
            </div>
          ) : (
            <div className="card overflow-hidden divide-y divide-[#F0EDE8]">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="text-xl">{getIngredientEmoji(item.ingredient?.name_en || '')}</span>
                  <span className="flex-1 text-[16px] font-medium text-[#2D2A26]">{item.ingredient?.name_en}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item, item.quantity - 1)}
                      className="w-8 h-8 rounded-xl bg-[#F5F0EA] hover:bg-[#E5DFD6] flex items-center justify-center text-[16px] font-medium transition-colors">−</button>
                    <span className="text-[15px] w-16 text-center font-medium text-[#8C8680]">{item.quantity} {item.unit}</span>
                    <button onClick={() => updateQuantity(item, item.quantity + 1)}
                      className="w-8 h-8 rounded-xl bg-[#F5F0EA] hover:bg-[#E5DFD6] flex items-center justify-center text-[16px] font-medium transition-colors">+</button>
                  </div>
                  <button onClick={() => removeItem(item)} className="text-[#C5C0BA] hover:text-[#C62828] ml-1 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M4 4L12 12M4 12L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ===== SHOPPING LIST TAB ===== */
        <div>
          {!hasMenu ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🛒</div>
              <p className="text-[17px] text-[#8C8680]">No finalized menu this week.</p>
              <p className="text-[15px] text-[#8C8680] mt-1">Finalize your menu to see the shopping list here.</p>
            </div>
          ) : shopLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="card p-5 h-20 animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(byDay).sort(([a],[b]) => parseInt(a)-parseInt(b)).map(([dayStr, dayItems]) => {
                const day = parseInt(dayStr)
                const unique = dedupDay(dayItems)
                const date = dayItems[0]?.date || ''
                const past = isDayPast(date)
                const today = isDayToday(date)

                return (
                  <div key={day} className={`transition-opacity ${past ? 'opacity-30' : ''}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className={`text-[17px] font-bold ${today ? 'text-[#2E7D32]' : 'text-[#2D2A26]'}`}>
                        {today && '● '}{DAY_NAMES[day]}
                        {past && ' ✓'}
                      </h2>
                      <span className="text-[13px] text-[#8C8680]">{dayItems[0]?.dishName}</span>
                    </div>
                    <div className="card overflow-hidden divide-y divide-[#F0EDE8]">
                      {unique.map(item => (
                        <button key={`${day}-${item.ingredientId}`}
                          onClick={() => toggleShopItem(item.ingredientId)}
                          disabled={past}
                          className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all ${
                            item.purchased || past ? 'opacity-50' : ''
                          }`}>
                          <span className="text-lg">{item.emoji}</span>
                          <span className={`flex-1 text-[16px] font-medium ${
                            item.purchased ? 'line-through text-[#8C8680]' : 'text-[#2D2A26]'
                          }`}>{item.ingredientName}</span>
                          <span className="text-[14px] text-[#8C8680] font-medium">{item.quantity} {item.unit}</span>
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            item.purchased || past ? 'bg-[#2E7D32] border-[#2E7D32]' : 'border-[#D5CFC6]'
                          }`}>
                            {(item.purchased || past) && <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
