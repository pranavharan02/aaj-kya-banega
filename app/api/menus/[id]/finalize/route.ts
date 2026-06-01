import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: menuId } = await params

  try {
    // Get all menu items with dish ingredients
    const { data: menuItems } = await supabase
      .from('menu_items')
      .select('dish_id')
      .eq('menu_id', menuId)

    if (!menuItems?.length) {
      return NextResponse.json({ error: 'No menu items found' }, { status: 404 })
    }

    const dishIds = menuItems.map(mi => mi.dish_id).filter(Boolean)

    // Get all ingredients for these dishes
    const { data: dishIngredients } = await supabase
      .from('dish_ingredients')
      .select('ingredient_id, quantity, unit')
      .in('dish_id', dishIds)

    if (!dishIngredients) {
      return NextResponse.json({ error: 'No ingredients found' }, { status: 404 })
    }

    // Aggregate required quantities by ingredient
    const required = new Map<string, { qty: number; unit: string }>()
    for (const di of dishIngredients) {
      const key = di.ingredient_id
      const existing = required.get(key)
      if (existing) {
        existing.qty += di.quantity
      } else {
        required.set(key, { qty: di.quantity, unit: di.unit })
      }
    }

    // Get the household's inventory
    const { data: menu } = await supabase
      .from('weekly_menus')
      .select('household_id')
      .eq('id', menuId)
      .single()

    let inventory = new Map<string, number>()
    if (menu?.household_id) {
      const { data: inv } = await supabase
        .from('inventory')
        .select('ingredient_id, quantity')
        .eq('household_id', menu.household_id)
      for (const item of inv || []) {
        inventory.set(item.ingredient_id, item.quantity)
      }
    }

    // Delete old shopping list for this menu
    await supabase.from('shopping_lists').delete().eq('menu_id', menuId)

    // Create shopping list items
    const shoppingItems = Array.from(required.entries()).map(([ingredientId, { qty, unit }]) => {
      const inStock = inventory.get(ingredientId) || 0
      return {
        menu_id: menuId,
        ingredient_id: ingredientId,
        required_qty: qty,
        in_stock_qty: inStock,
        to_buy_qty: Math.max(0, qty - inStock),
        unit,
      }
    })

    if (shoppingItems.length > 0) {
      await supabase.from('shopping_lists').insert(shoppingItems)
    }

    return NextResponse.json({ success: true, items_count: shoppingItems.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
