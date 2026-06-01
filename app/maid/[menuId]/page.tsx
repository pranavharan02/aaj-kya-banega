import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DAY_NAMES_HI = ['सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार']
const DAY_NAMES_MR = ['सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार']
const ACCOMP_HI: Record<string, string> = {
  'steamed-rice': 'चावल', 'roti': 'रोटी', 'bhakri': 'भाकरी', 'pav': 'पाव', 'paratha': 'पराठा', 'naan': 'नान',
}
const ACCOMP_MR: Record<string, string> = {
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

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, dish:dishes(*)')
    .eq('menu_id', menuId)
    .order('day_of_week')

  if (!menuItems?.length) return notFound()

  // Determine which day to show
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const selectedDay = dayParam !== undefined ? parseInt(dayParam) : null
  const todayItem = selectedDay !== null
    ? menuItems.find(i => i.day_of_week === selectedDay)
    : menuItems.find(i => i.date === todayStr) || menuItems[0]

  if (!todayItem?.dish) return notFound()
  const dish = todayItem.dish
  const dayNames = lang === 'mr' ? DAY_NAMES_MR : DAY_NAMES_HI
  const accompLabels = lang === 'mr' ? ACCOMP_MR : ACCOMP_HI

  // Fetch ingredients and steps in parallel
  const [{ data: ingredients }, { data: steps }] = await Promise.all([
    supabase.from('dish_ingredients').select('*, ingredient:ingredients(*)').eq('dish_id', dish.id),
    supabase.from('recipe_steps').select('*').eq('dish_id', dish.id).order('step_number'),
  ])

  const dishName = lang === 'mr' ? (dish.name_mr || dish.name_hi || dish.name_en) : (dish.name_hi || dish.name_en)
  const isToday = todayItem.date === todayStr
  const dayLabel = isToday
    ? (lang === 'mr' ? 'आजचे जेवण' : 'आज का खाना')
    : `${dayNames[todayItem.day_of_week]}`
  const ingredientsLabel = lang === 'mr' ? 'साहित्य' : 'सामग्री'
  const recipeLabel = lang === 'mr' ? 'कृती' : 'विधि'
  const weekLabel = lang === 'mr' ? 'पूर्ण आठवडा' : 'पूरा हफ्ता'

  return (
    <html lang={lang === 'mr' ? 'mr' : 'hi'}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{dishName}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; color: #000; line-height: 1.9; -webkit-font-smoothing: antialiased; }
          .container { max-width: 480px; margin: 0 auto; padding: 20px 16px 40px; }
          .lang-bar { display: flex; justify-content: flex-end; gap: 4px; margin-bottom: 16px; background: #f5f5f5; border-radius: 12px; padding: 4px; width: fit-content; margin-left: auto; }
          .lang-btn { padding: 8px 20px; border-radius: 10px; text-decoration: none; font-size: 20px; font-weight: 500; color: #666; }
          .lang-btn.active { background: #000; color: #fff; }
          .day-label { font-size: 20px; color: #666; margin-bottom: 4px; }
          .dish-name { font-size: 36px; font-weight: 700; line-height: 1.3; margin-bottom: 8px; }
          .accompaniment { font-size: 24px; color: #666; margin-bottom: 32px; }
          .section-title { font-size: 26px; font-weight: 600; margin-bottom: 16px; }
          .ing-row { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 22px; }
          .ing-qty { color: #666; white-space: nowrap; margin-left: 12px; font-size: 22px; }
          .step { display: flex; gap: 16px; margin-bottom: 24px; }
          .step-num { width: 40px; height: 40px; border-radius: 50%; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; flex-shrink: 0; }
          .step-text { font-size: 24px; line-height: 1.8; }
          .nav-bar { display: flex; gap: 8px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0; }
          .nav-btn { flex: 1; text-align: center; padding: 16px; background: #f5f5f5; border-radius: 14px; text-decoration: none; color: #000; font-size: 22px; font-weight: 500; min-height: 60px; display: flex; align-items: center; justify-content: center; }
          .week-toggle { text-align: center; padding: 16px; font-size: 22px; color: #666; cursor: pointer; }
          .week-toggle summary { list-style: none; }
          .week-list { margin-top: 12px; }
          .week-item { display: block; padding: 16px; margin-bottom: 8px; background: #f5f5f5; border-radius: 14px; text-decoration: none; color: #000; }
          .week-item.active { background: #000; color: #fff; }
          .week-item-day { font-size: 18px; opacity: 0.7; }
          .week-item-name { font-size: 24px; font-weight: 500; }
        `}</style>
      </head>
      <body>
        <div className="container">
          {/* Language toggle — only Hindi/Marathi, no other navigation */}
          <div className="lang-bar">
            <a href={`/maid/${menuId}?lang=hi${selectedDay !== null ? `&day=${selectedDay}` : ''}`}
              className={`lang-btn ${lang === 'hi' ? 'active' : ''}`}>हिंदी</a>
            <a href={`/maid/${menuId}?lang=mr${selectedDay !== null ? `&day=${selectedDay}` : ''}`}
              className={`lang-btn ${lang === 'mr' ? 'active' : ''}`}>मराठी</a>
          </div>

          {/* Day label + Dish name */}
          <div className="day-label">{dayLabel}</div>
          <div className="dish-name">{dishName}</div>
          {dish.default_accompaniment && (
            <div className="accompaniment">+ {accompLabels[dish.default_accompaniment] || dish.default_accompaniment}</div>
          )}

          {/* Ingredients */}
          <div className="section-title">{ingredientsLabel}</div>
          <div style={{ marginBottom: '32px' }}>
            {ingredients?.map(ing => {
              const name = lang === 'mr'
                ? (ing.ingredient?.name_mr || ing.ingredient?.name_hi || ing.ingredient?.name_en)
                : (ing.ingredient?.name_hi || ing.ingredient?.name_en)
              return (
                <div key={ing.id} className="ing-row">
                  <span>{name}</span>
                  <span className="ing-qty">
                    {ing.unit === 'to taste'
                      ? (lang === 'hi' ? 'स्वादानुसार' : 'चवीनुसार')
                      : `${ing.quantity} ${ing.unit}`}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Recipe steps */}
          <div className="section-title">{recipeLabel}</div>
          <div style={{ marginBottom: '24px' }}>
            {steps?.map(step => {
              const text = lang === 'mr'
                ? (step.instruction_mr || step.instruction_hi || step.instruction_en)
                : (step.instruction_hi || step.instruction_en)
              return (
                <div key={step.id} className="step">
                  <div className="step-num">{step.step_number}</div>
                  <div className="step-text">{text}</div>
                </div>
              )
            })}
          </div>

          {/* Day navigation */}
          <div className="nav-bar">
            {todayItem.day_of_week > 0 && (
              <a href={`/maid/${menuId}?lang=${lang}&day=${todayItem.day_of_week - 1}`} className="nav-btn">
                ← {dayNames[todayItem.day_of_week - 1]}
              </a>
            )}
            {todayItem.day_of_week < 6 && (
              <a href={`/maid/${menuId}?lang=${lang}&day=${todayItem.day_of_week + 1}`} className="nav-btn">
                {dayNames[todayItem.day_of_week + 1]} →
              </a>
            )}
          </div>

          {/* Full week */}
          <details className="week-toggle">
            <summary>{weekLabel}</summary>
            <div className="week-list">
              {menuItems.map(item => {
                const name = lang === 'mr'
                  ? (item.dish?.name_mr || item.dish?.name_hi || item.dish?.name_en)
                  : (item.dish?.name_hi || item.dish?.name_en)
                const isActive = item.day_of_week === todayItem.day_of_week
                return (
                  <a key={item.id} href={`/maid/${menuId}?lang=${lang}&day=${item.day_of_week}`}
                    className={`week-item ${isActive ? 'active' : ''}`}>
                    <div className="week-item-day">{dayNames[item.day_of_week]}</div>
                    <div className="week-item-name">{name}</div>
                  </a>
                )
              })}
            </div>
          </details>
        </div>
      </body>
    </html>
  )
}
