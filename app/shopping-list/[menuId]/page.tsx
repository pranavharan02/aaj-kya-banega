'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import type { ShoppingListItem } from '@/lib/types'

const CATEGORY_ORDER = ['vegetable', 'protein', 'dairy', 'spice', 'pantry', 'oil_condiment', 'grain']
const CATEGORY_LABELS: Record<string, string> = {
  vegetable: 'Vegetables',
  protein: 'Protein',
  dairy: 'Dairy',
  spice: 'Spices',
  pantry: 'Pantry',
  oil_condiment: 'Oil & Condiments',
  grain: 'Grains',
}

export default function ShoppingListPage() {
  const params = useParams()
  const menuId = params.menuId as string
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadList() }, [menuId])

  async function loadList() {
    setLoading(true)
    const { data } = await supabase
      .from('shopping_lists')
      .select('*, ingredient:ingredients(*)')
      .eq('menu_id', menuId)
      .order('unit')
    setItems(data || [])
    setLoading(false)
  }

  async function togglePurchased(item: ShoppingListItem) {
    await supabase
      .from('shopping_lists')
      .update({ is_purchased: !item.is_purchased })
      .eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_purchased: !i.is_purchased } : i))
  }

  function copyAsText() {
    const grouped = groupByCategory(items.filter(i => i.to_buy_qty > 0 && !i.is_purchased))
    let text = `Shopping List\n\n`
    for (const [cat, catItems] of Object.entries(grouped)) {
      text += `${CATEGORY_LABELS[cat] || cat}:\n`
      for (const item of catItems) {
        text += `- ${item.ingredient?.name_en}: ${item.to_buy_qty} ${item.unit}\n`
      }
      text += '\n'
    }
    navigator.clipboard.writeText(text)
    toast('Shopping list copied!')
  }

  function groupByCategory(items: ShoppingListItem[]): Record<string, ShoppingListItem[]> {
    const groups: Record<string, ShoppingListItem[]> = {}
    for (const item of items) {
      const cat = item.ingredient?.category || 'pantry'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    }
    return groups
  }

  if (loading) return <div className="py-20 text-center text-[#6B6B6B]">Loading...</div>

  const toBuyItems = items.filter(i => i.to_buy_qty > 0)
  const grouped = groupByCategory(toBuyItems)
  const purchasedCount = toBuyItems.filter(i => i.is_purchased).length

  return (
    <div className="py-8">
      <Link href={`/menu/${menuId}`} className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A] mb-4 inline-block">
        &larr; Back to menu
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Shopping List</h1>
          <p className="text-sm text-[#6B6B6B]">{purchasedCount}/{toBuyItems.length} items purchased</p>
        </div>
        <button
          onClick={copyAsText}
          className="px-4 py-2 border border-[#E0E0E0] rounded-xl text-sm hover:bg-[#F5F5F5] transition-colors"
        >
          Copy list
        </button>
      </div>

      {CATEGORY_ORDER.map(cat => {
        const catItems = grouped[cat]
        if (!catItems?.length) return null
        return (
          <div key={cat} className="mb-6">
            <h2 className="text-sm font-medium text-[#6B6B6B] uppercase tracking-wider mb-2">
              {CATEGORY_LABELS[cat] || cat}
            </h2>
            <div className="space-y-1">
              {catItems.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${
                    item.is_purchased ? 'bg-green-50 opacity-60' : 'bg-[#F5F5F5]'
                  }`}
                >
                  <button
                    onClick={() => togglePurchased(item)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      item.is_purchased ? 'bg-[#2E7D32] border-[#2E7D32]' : 'border-[#E0E0E0]'
                    }`}
                  >
                    {item.is_purchased && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${item.is_purchased ? 'line-through' : ''}`}>
                    {item.ingredient?.name_en}
                  </span>
                  <span className="text-sm text-[#6B6B6B]">
                    {item.to_buy_qty} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {toBuyItems.length === 0 && (
        <p className="text-center text-[#6B6B6B] py-12">Nothing to buy — everything is in stock!</p>
      )}
    </div>
  )
}
