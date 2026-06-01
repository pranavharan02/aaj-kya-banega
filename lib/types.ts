export interface Dish {
  id: string
  slug: string
  name_en: string
  name_hi: string | null
  name_mr: string | null
  cuisine: 'tamil' | 'north' | 'marathi' | 'bihari' | 'custom'
  is_veg: boolean
  prep_time_min: number | null
  cook_time_min: number | null
  difficulty: 'easy' | 'medium' | 'hard'
  default_servings: number
  default_accompaniment: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  illustration_url: string | null
  is_custom: boolean
  description_en: string | null
  description_hi: string | null
  description_mr: string | null
  tags: string[] | null
  youtube_url: string | null
}

export interface Ingredient {
  id: string
  name_en: string
  name_hi: string | null
  name_mr: string | null
  category: string | null
  default_unit: string | null
}

export interface DishIngredient {
  id: string
  dish_id: string
  ingredient_id: string
  quantity: number
  unit: string
  ingredient?: Ingredient
}

export interface RecipeStep {
  id: string
  dish_id: string
  step_number: number
  instruction_en: string
  instruction_hi: string | null
  instruction_mr: string | null
  duration_min: number | null
}

export interface Household {
  id: string
  created_at: string
  default_servings: number
  default_cuisines: string[]
  default_veg_days: number
  preferred_maid_lang: string
}

export interface WeeklyMenu {
  id: string
  household_id: string
  week_start_date: string
  is_finalized: boolean
  finalized_at: string | null
  created_at: string
  generation_mode: string | null
}

export interface MenuItem {
  id: string
  menu_id: string
  dish_id: string
  day_of_week: number
  date: string
  is_veg: boolean | null
  was_swapped: boolean
  dish?: Dish
}

export interface InventoryItem {
  id: string
  household_id: string
  ingredient_id: string
  quantity: number
  unit: string
  updated_at: string
  ingredient?: Ingredient
}

export interface ShoppingListItem {
  id: string
  menu_id: string
  ingredient_id: string
  required_qty: number
  in_stock_qty: number
  to_buy_qty: number
  is_purchased: boolean
  unit: string
  ingredient?: Ingredient
}

export type CuisineType = 'tamil' | 'north' | 'marathi' | 'bihari'
export type Language = 'en' | 'hi' | 'mr'

export const CUISINE_LABELS: Record<CuisineType, string> = {
  tamil: 'Tamil',
  north: 'North Indian',
  marathi: 'Marathi',
  bihari: 'Bihari',
}

export const CUISINE_COLORS: Record<CuisineType, string> = {
  tamil: 'bg-[#E8D5C4]',
  north: 'bg-[#F5E6CC]',
  marathi: 'bg-[#D4E8D4]',
  bihari: 'bg-[#E8DCC8]',
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const ACCOMPANIMENT_LABELS: Record<string, string> = {
  'steamed-rice': 'Steamed Rice',
  'roti': 'Roti',
  'bhakri': 'Bhakri',
  'pav': 'Pav',
  'paratha': 'Paratha',
  'naan': 'Naan',
  'appam': 'Appam',
}
