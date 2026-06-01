'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ensureHousehold, getHouseholdId } from '@/lib/household'
import { getIngredientEmoji } from '@/lib/ingredient-emojis'
import { toast } from '@/components/Toast'
import type { InventoryItem, Ingredient } from '@/lib/types'

export default function PantryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newUnit, setNewUnit] = useState('pieces')
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)

  useEffect(() => { loadInventory() }, [])

  async function loadInventory() {
    setLoading(true)
    await ensureHousehold()
    const householdId = getHouseholdId()
    if (!householdId) return
    const [{ data: inv }, { data: ings }] = await Promise.all([
      supabase.from('inventory').select('*, ingredient:ingredients(*)').eq('household_id', householdId).order('updated_at', { ascending: false }),
      supabase.from('ingredients').select('*').order('name_en'),
    ])
    setItems(inv || [])
    setAllIngredients(ings || [])
    setLoading(false)
  }

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
    await loadInventory()
  }

  async function updateQuantity(item: InventoryItem, newQuantity: number) {
    if (newQuantity <= 0) {
      setItems(prev => prev.filter(i => i.id !== item.id))
      await supabase.from('inventory').delete().eq('id', item.id)
      toast('Removed')
    } else {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQuantity } : i))
      await supabase.from('inventory').update({ quantity: newQuantity, updated_at: new Date().toISOString() }).eq('id', item.id)
    }
  }

  async function removeItem(item: InventoryItem) {
    setItems(prev => prev.filter(i => i.id !== item.id))
    await supabase.from('inventory').delete().eq('id', item.id)
    toast('Removed from pantry')
  }

  if (loading) return (
    <div className="py-10 space-y-3">
      {[1,2,3,4,5].map(i => <div key={i} className="card p-5 h-16 animate-pulse" />)}
    </div>
  )

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-[#2D2A26]">🏠 Pantry</h1>
          <p className="text-[15px] text-[#8C8680]">{items.length} items in stock</p>
        </div>
        <button onClick={() => setAdding(!adding)}
          className={`btn-primary ${adding ? '!bg-[#8C8680]' : ''}`} style={{padding:'10px 20px', fontSize:'15px'}}>
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Add item form */}
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
                    <span>{getIngredientEmoji(i.name_en)}</span>
                    <span>{i.name_en}</span>
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

      {/* Inventory list */}
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
  )
}
