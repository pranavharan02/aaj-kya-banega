import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateMenuAlgorithmic } from '@/lib/menu-algorithm'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { household_id, week_start_date, veg_days, cuisines } = body

    if (!household_id || !week_start_date || !cuisines?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get recent dishes to avoid repetition
    const { data: recentMenus } = await supabase
      .from('weekly_menus')
      .select('id')
      .eq('household_id', household_id)
      .order('week_start_date', { ascending: false })
      .limit(2)

    let excludeSlugs: string[] = []
    if (recentMenus?.length) {
      const menuIds = recentMenus.map(m => m.id)
      const { data: recentItems } = await supabase
        .from('menu_items')
        .select('dish:dishes(slug)')
        .in('menu_id', menuIds)
      excludeSlugs = recentItems?.map((i: any) => i.dish?.slug).filter(Boolean) || []
    }

    let menuPicks: { slug: string; is_veg: boolean }[]
    let generationMode = 'algorithmic'

    // Try Claude API first if key is available
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const { data: allDishes } = await supabase
          .from('dishes')
          .select('slug, name_en, cuisine, is_veg')
          .in('cuisine', cuisines)

        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

        const dishList = allDishes?.map(d =>
          `${d.slug} | ${d.name_en} | ${d.cuisine} | ${d.is_veg ? 'veg' : 'non-veg'}`
        ).join('\n')

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          temperature: 0.7,
          system: `You are a weekly dinner menu planner for an Indian household.
You must select dishes ONLY from the provided dish database.
Never invent dishes that aren't in the list.`,
          messages: [{
            role: 'user',
            content: `Generate a 7-day dinner menu (Monday to Sunday) with these constraints:
- Vegetarian days: ${veg_days} (assign to specific days)
- Non-vegetarian days: ${7 - veg_days}
- Cuisines to include: ${cuisines.join(', ')}
- Distribute cuisines roughly evenly across the week
- Avoid these dishes (served recently): ${excludeSlugs.join(', ') || 'none'}
- Ensure variety: no two dishes with the same primary ingredient on consecutive days

Available dishes:
${dishList}

Respond in JSON only:
{
  "menu": [
    { "day": "monday", "dish_slug": "...", "is_veg": true }
  ]
}`
          }],
        })

        const text = message.content?.[0]?.type === 'text' ? message.content[0].text : ''
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.menu?.length === 7) {
            menuPicks = parsed.menu.map((m: any) => ({ slug: m.dish_slug, is_veg: m.is_veg }))
            generationMode = 'ai'
          } else {
            throw new Error('Invalid AI response')
          }
        } else {
          throw new Error('No JSON in AI response')
        }
      } catch {
        // Fall back to algorithmic
        menuPicks = await generateMenuAlgorithmic({ vegDays: veg_days, cuisines, excludeSlugs })
      }
    } else {
      menuPicks = await generateMenuAlgorithmic({ vegDays: veg_days, cuisines, excludeSlugs })
    }

    // Create the weekly menu
    const { data: menu, error: menuErr } = await supabase
      .from('weekly_menus')
      .insert({
        household_id,
        week_start_date,
        generation_mode: generationMode,
      })
      .select('id')
      .single()

    if (menuErr || !menu) {
      return NextResponse.json({ error: 'Failed to create menu' }, { status: 500 })
    }

    // Get dish IDs for the selected slugs
    const slugs = menuPicks.map(p => p.slug)
    const { data: dishes } = await supabase
      .from('dishes')
      .select('id, slug, is_veg')
      .in('slug', slugs)

    const dishMap = new Map(dishes?.map(d => [d.slug, d]) || [])

    // Create menu items — use date arithmetic on the YYYY-MM-DD string directly
    // to avoid timezone issues (server may be in different TZ than user)
    const menuItems = menuPicks.map((pick, i) => {
      const d = new Date(week_start_date + 'T12:00:00Z')
      d.setUTCDate(d.getUTCDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const dish = dishMap.get(pick.slug)
      return {
        menu_id: menu.id,
        dish_id: dish?.id,
        day_of_week: i,
        date: dateStr,
        is_veg: dish?.is_veg ?? pick.is_veg,
      }
    })

    await supabase.from('menu_items').insert(menuItems)

    return NextResponse.json({ menu_id: menu.id, generation_mode: generationMode })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
