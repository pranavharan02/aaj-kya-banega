import { supabase } from './supabase'

const HOUSEHOLD_KEY = 'akb_household_id'

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
    // Verify it still exists
    const { data } = await supabase.from('households').select('id').eq('id', id).single()
    if (data) return id
  }

  // Fetch the default household or create one
  const { data: existing } = await supabase
    .from('households')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    setHouseholdId(existing.id)
    return existing.id
  }

  const { data: created } = await supabase
    .from('households')
    .insert({ default_servings: 2, default_cuisines: ['tamil', 'north'], default_veg_days: 4, preferred_maid_lang: 'hi' })
    .select('id')
    .single()

  if (created) {
    setHouseholdId(created.id)
    return created.id
  }

  throw new Error('Failed to create household')
}
