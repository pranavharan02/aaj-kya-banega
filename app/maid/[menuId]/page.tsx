import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DAY_NAMES_HI = ['सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार']
const DAY_NAMES_MR = ['सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार']
const ACCOMPANIMENT_HI: Record<string, string> = {
  'steamed-rice': 'चावल', 'roti': 'रोटी', 'bhakri': 'भाकरी', 'pav': 'पाव', 'paratha': 'पराठा', 'naan': 'नान',
}
const ACCOMPANIMENT_MR: Record<string, string> = {
  'steamed-rice': 'भात', 'roti': 'चपाती', 'bhakri': 'भाकरी', 'pav': 'पाव', 'paratha': 'पराठा', 'naan': 'नान',
}

export default async function MaidViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ menuId: string }>
  searchParams: Promise<{ lang?: string; day?: string }>
}) {
  const { menuId } = await params
  const { lang: langParam, day: dayParam } = await searchParams
  const lang = langParam === 'mr' ? 'mr' : 'hi'

  // Fetch menu with items
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, dish:dishes(*)')
    .eq('menu_id', menuId)
    .order('day_of_week')

  if (!menuItems?.length) return notFound()

  // Determine today's item
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const selectedDay = dayParam !== undefined ? parseInt(dayParam) : null
  const todayItem = selectedDay !== null
    ? menuItems.find(i => i.day_of_week === selectedDay)
    : menuItems.find(i => i.date === todayStr) || menuItems[0]

  if (!todayItem?.dish) return notFound()

  const dish = todayItem.dish

  // Fetch ingredients and steps
  const [{ data: ingredients }, { data: steps }] = await Promise.all([
    supabase
      .from('dish_ingredients')
      .select('*, ingredient:ingredients(*)')
      .eq('dish_id', dish.id),
    supabase
      .from('recipe_steps')
      .select('*')
      .eq('dish_id', dish.id)
      .order('step_number'),
  ])

  const dayNames = lang === 'mr' ? DAY_NAMES_MR : DAY_NAMES_HI
  const accompLabels = lang === 'mr' ? ACCOMPANIMENT_MR : ACCOMPANIMENT_HI
  const dishName = lang === 'mr' ? (dish.name_mr || dish.name_hi || dish.name_en) : (dish.name_hi || dish.name_en)
  const todayLabel = lang === 'mr' ? 'आजचे जेवण' : 'आज का खाना'
  const ingredientsLabel = lang === 'mr' ? 'साहित्य' : 'सामग्री'
  const recipeLabel = lang === 'mr' ? 'कृती' : 'विधि'
  const weekLabel = lang === 'mr' ? 'पूर्ण आठवडा' : 'पूरा हफ्ता'

  return (
    <div className="min-h-screen bg-white px-4 py-6 max-w-lg mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Language toggle */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-gray-500">
          {todayLabel}
        </span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <a
            href={`/maid/${menuId}?lang=hi${selectedDay !== null ? `&day=${selectedDay}` : ''}`}
            className={`px-3 py-1 rounded-md text-sm ${lang === 'hi' ? 'bg-black text-white' : 'text-gray-600'}`}
          >
            हिंदी
          </a>
          <a
            href={`/maid/${menuId}?lang=mr${selectedDay !== null ? `&day=${selectedDay}` : ''}`}
            className={`px-3 py-1 rounded-md text-sm ${lang === 'mr' ? 'bg-black text-white' : 'text-gray-600'}`}
          >
            मराठी
          </a>
        </div>
      </div>

      {/* Today's dish hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold leading-tight mb-2" style={{ fontSize: '28px', lineHeight: '1.3' }}>
          {dishName}
        </h1>
        {dish.default_accompaniment && (
          <p className="text-lg text-gray-600" style={{ fontSize: '20px' }}>
            + {accompLabels[dish.default_accompaniment] || dish.default_accompaniment}
          </p>
        )}
      </div>

      {/* Ingredients */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ fontSize: '22px' }}>{ingredientsLabel}</h2>
        <div className="space-y-3">
          {ingredients?.map(ing => {
            const name = lang === 'mr'
              ? (ing.ingredient?.name_mr || ing.ingredient?.name_hi || ing.ingredient?.name_en)
              : (ing.ingredient?.name_hi || ing.ingredient?.name_en)
            return (
              <div key={ing.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span style={{ fontSize: '18px', lineHeight: '1.6' }}>{name}</span>
                <span className="text-gray-500" style={{ fontSize: '18px' }}>
                  {ing.unit === 'to taste' ? (lang === 'hi' ? 'स्वादानुसार' : 'चवीनुसार') :
                    `${ing.quantity} ${ing.unit}`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recipe steps */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ fontSize: '22px' }}>{recipeLabel}</h2>
        <div className="space-y-5">
          {steps?.map(step => {
            const text = lang === 'mr'
              ? (step.instruction_mr || step.instruction_hi || step.instruction_en)
              : (step.instruction_hi || step.instruction_en)
            return (
              <div key={step.id} className="flex gap-4">
                <span
                  className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold flex-shrink-0"
                  style={{ fontSize: '16px' }}
                >
                  {step.step_number}
                </span>
                <p style={{ fontSize: '20px', lineHeight: '1.8' }}>{text}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day navigation */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <div className="flex gap-2">
          {todayItem.day_of_week > 0 && (
            <a
              href={`/maid/${menuId}?lang=${lang}&day=${todayItem.day_of_week - 1}`}
              className="flex-1 text-center py-3 bg-gray-100 rounded-xl font-medium"
              style={{ fontSize: '18px', minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              &larr; {dayNames[todayItem.day_of_week - 1]}
            </a>
          )}
          {todayItem.day_of_week < 6 && (
            <a
              href={`/maid/${menuId}?lang=${lang}&day=${todayItem.day_of_week + 1}`}
              className="flex-1 text-center py-3 bg-gray-100 rounded-xl font-medium"
              style={{ fontSize: '18px', minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {dayNames[todayItem.day_of_week + 1]} &rarr;
            </a>
          )}
        </div>
      </div>

      {/* Full week view */}
      <details className="mb-8">
        <summary className="text-center py-3 text-gray-600 cursor-pointer" style={{ fontSize: '18px' }}>
          {weekLabel}
        </summary>
        <div className="space-y-2 mt-3">
          {menuItems.map(item => {
            const name = lang === 'mr'
              ? (item.dish?.name_mr || item.dish?.name_hi || item.dish?.name_en)
              : (item.dish?.name_hi || item.dish?.name_en)
            const isActive = item.day_of_week === todayItem.day_of_week
            return (
              <a
                key={item.id}
                href={`/maid/${menuId}?lang=${lang}&day=${item.day_of_week}`}
                className={`block p-4 rounded-xl ${isActive ? 'bg-black text-white' : 'bg-gray-100'}`}
              >
                <p className="text-sm opacity-70">{dayNames[item.day_of_week]}</p>
                <p className="font-medium" style={{ fontSize: '20px' }}>{name}</p>
              </a>
            )
          })}
        </div>
      </details>
    </div>
  )
}
