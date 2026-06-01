import { supabase } from './supabase'
import type { Dish } from './types'

interface GenerateOptions {
  vegDays: number
  cuisines: string[]
  excludeSlugs?: string[]
}

export async function generateMenuAlgorithmic(options: GenerateOptions): Promise<{ slug: string; is_veg: boolean }[]> {
  const { vegDays, cuisines, excludeSlugs = [] } = options

  // Fetch all eligible dishes
  const { data: allDishes } = await supabase
    .from('dishes')
    .select('slug, cuisine, is_veg')
    .in('cuisine', cuisines)

  if (!allDishes || allDishes.length === 0) {
    throw new Error('No dishes found for selected cuisines')
  }

  const vegDishes = allDishes.filter(d => d.is_veg && !excludeSlugs.includes(d.slug))
  const nvDishes = allDishes.filter(d => !d.is_veg && !excludeSlugs.includes(d.slug))

  // Shuffle arrays
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const shuffledVeg = shuffle(vegDishes)
  const shuffledNv = shuffle(nvDishes)

  // Build menu: first vegDays are veg, rest are non-veg
  const menu: { slug: string; is_veg: boolean }[] = []
  const vegSlots = vegDays
  const nvSlots = 7 - vegDays

  // Pick veg dishes
  for (let i = 0; i < vegSlots; i++) {
    const dish = shuffledVeg[i % shuffledVeg.length]
    menu.push({ slug: dish.slug, is_veg: true })
  }

  // Pick non-veg dishes
  for (let i = 0; i < nvSlots; i++) {
    if (shuffledNv.length > 0) {
      const dish = shuffledNv[i % shuffledNv.length]
      menu.push({ slug: dish.slug, is_veg: false })
    } else {
      // Fallback to veg if no non-veg available
      const dish = shuffledVeg[(vegSlots + i) % shuffledVeg.length]
      menu.push({ slug: dish.slug, is_veg: true })
    }
  }

  // Shuffle the final menu to mix veg/non-veg across the week
  return shuffle(menu)
}
