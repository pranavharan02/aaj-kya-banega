import { supabase } from './supabase'

const HOUSEHOLD_KEY = 'akb_household_id'
const INVENTORY_SEEDED_KEY = 'akb_inventory_seeded'

// Common household staples that every Indian kitchen has
// These get auto-added to inventory and excluded from shopping list
export const COMMON_STAPLES = [
  'Oil', 'Ghee', 'Salt', 'Turmeric', 'Red chilli powder', 'Coriander powder',
  'Cumin seeds', 'Mustard seeds', 'Garam masala', 'Sugar', 'Water',
  'Curry leaves', 'Asafoetida', 'Black pepper', 'Coriander leaves',
  'Green chilli', 'Ginger', 'Garlic', 'Onion', 'Tomato',
]

export function getHouseholdId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(HOUSEHOLD_KEY)
}

export function setHouseholdId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(HOUSEHOLD_KEY, id)
}

export async function ensureHousehold(): Promise<string> {
  let id = getHouseholdId()
  if (id) {
    const { data } = await supabase.from('households').select('id').eq('id', id).single()
    if (data) {
      await seedCommonInventory(id)
      return id
    }
  }

  const { data: existing } = await supabase.from('households').select('id').limit(1).single()
  if (existing) {
    setHouseholdId(existing.id)
    await seedCommonInventory(existing.id)
    return existing.id
  }

  const { data: created } = await supabase
    .from('households')
    .insert({ default_servings: 2, default_cuisines: ['tamil', 'north'], default_veg_days: 4, preferred_maid_lang: 'hi' })
    .select('id')
    .single()

  if (created) {
    setHouseholdId(created.id)
    await seedCommonInventory(created.id)
    return created.id
  }
  throw new Error('Failed to create household')
}

async function seedCommonInventory(householdId: string): Promise<void> {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(INVENTORY_SEEDED_KEY)) return

  // Check if inventory already has items
  const { count } = await supabase
    .from('inventory')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', householdId)

  if (count && count > 0) {
    localStorage.setItem(INVENTORY_SEEDED_KEY, 'true')
    return
  }

  // Get ingredient IDs for common staples
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name_en')
    .in('name_en', COMMON_STAPLES)

  if (!ingredients?.length) return

  // Insert common items with default quantities
  const items = ingredients.map(ing => ({
    household_id: householdId,
    ingredient_id: ing.id,
    quantity: 1,
    unit: 'packets',
  }))

  await supabase.from('inventory').insert(items)
  localStorage.setItem(INVENTORY_SEEDED_KEY, 'true')
}
