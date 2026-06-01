'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ensureHousehold, getHouseholdId } from '@/lib/household'
import type { InventoryItem, Ingredient } from '@/lib/types'

export default function InventoryPage() {
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
      supabase
        .from('inventory')
        .select('*, ingredient:ingredients(*)')
        .eq('household_id', householdId)
        .order('updated_at', { ascending: false }),
      supabase.from('ingredients').select('*').order('name_en'),
    ])
    setItems(inv || [])
    setAllIngredients(ings || [])
    setLoading(false)
  }

  const filtered = allIngredients.filter(i =>
    i.name_en.toLowerCase().includes(search.toLowerCase()) &&
    !items.some(inv => inv.ingredient_id === i.id)
  )

  async function addItem() {
    if (!selectedIngredient || !newQty) return
    const householdId = getHouseholdId()
    if (!householdId) return

    await supabase.from('inventory').insert({
      household_id: householdId,
      ingredient_id: selectedIngredient.id,
      quantity: parseFloat(newQty),
      unit: newUnit,
    })

    setSelectedIngredient(null)
    setSearch('')
    setNewQty('')
    setNewUnit('pieces')
    setAdding(false)
    await loadInventory()
  }

  async function updateQuantity(item: InventoryItem, newQuantity: number) {
    if (newQuantity <= 0) {
      await supabase.from('inventory').delete().eq('id', item.id)
    } else {
      await supabase
        .from('inventory')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', item.id)
    }
    await loadInventory()
  }

  async function removeItem(item: InventoryItem) {
    await supabase.from('inventory').delete().eq('id', item.id)
    await loadInventory()
  }

  if (loading) return <div className="py-20 text-center text-[#6B6B6B]">Loading...</div>

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <button
          onClick={() => setAdding(!adding)}
          className="px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-colors"
        >
          {adding ? 'Cancel' : '+ Add item'}
        </button>
      </div>

      {/* Add item form */}
      {adding && (
        <div className="bg-[#F5F5F5] rounded-2xl p-4 mb-6 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedIngredient(null) }}
              placeholder="Search ingredient..."
              className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm bg-white"
            />
            {search && !selectedIngredient && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-[#E0E0E0] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filtered.slice(0, 10).map(i => (
                  <button
                    key={i.id}
                    onClick={() => { setSelectedIngredient(i); setSearch(i.name_en) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5F5F5] first:rounded-t-xl last:rounded-b-xl"
                  >
                    {i.name_en}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
              placeholder="Qty"
              className="flex-1 px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm bg-white"
            />
            <select
              value={newUnit}
              onChange={e => setNewUnit(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm bg-white"
            >
              {['pieces', 'kg', 'g', 'L', 'mL', 'cup', 'tbsp', 'tsp', 'packets'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <button
            onClick={addItem}
            disabled={!selectedIngredient || !newQty}
            className="w-full py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-[#333] transition-colors"
          >
            Add to inventory
          </button>
        </div>
      )}

      {/* Inventory list */}
      {items.length === 0 ? (
        <p className="text-center text-[#6B6B6B] py-12">
          No items in inventory yet. Add what you have at home.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-[#F5F5F5] rounded-xl px-4 py-3">
              <span className="flex-1 text-sm font-medium">{item.ingredient?.name_en}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item, item.quantity - 1)}
                  className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-sm hover:bg-[#EBEBEB]"
                >-</button>
                <span className="text-sm w-12 text-center">{item.quantity} {item.unit}</span>
                <button
                  onClick={() => updateQuantity(item, item.quantity + 1)}
                  className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-sm hover:bg-[#EBEBEB]"
                >+</button>
              </div>
              <button
                onClick={() => removeItem(item)}
                className="text-[#6B6B6B] hover:text-[#C62828] ml-2"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4L12 12M4 12L12 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
