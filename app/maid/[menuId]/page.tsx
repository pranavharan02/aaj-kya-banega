import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DAY_HI = ['सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार']
const DAY_MR = ['सोमवार', 'मंगळवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार']
const ACC_HI: Record<string, string> = { 'steamed-rice': 'चावल', 'roti': 'रोटी', 'bhakri': 'भाकरी', 'pav': 'पाव', 'paratha': 'पराठा', 'naan': 'नान' }
const ACC_MR: Record<string, string> = { 'steamed-rice': 'भात', 'roti': 'चपाती', 'bhakri': 'भाकरी', 'pav': 'पाव', 'paratha': 'पराठा', 'naan': 'नान' }
// Hindi numerals
const HINDI_NUMS = ['०','१','२','३','४','५','६','७','८','९']
function toHindiNum(n: number | string): string {
  return String(n).replace(/[0-9]/g, d => HINDI_NUMS[parseInt(d)])
}
// Unit translations
const UNIT_HI: Record<string, string> = { 'cup': 'कप', 'cups': 'कप', 'tbsp': 'बड़ा चम्मच', 'tsp': 'छोटा चम्मच', 'g': 'ग्राम', 'kg': 'किलो', 'mL': 'मिली', 'L': 'लीटर', 'pieces': 'पीस', 'to taste': 'स्वादानुसार', 'as needed': 'ज़रूरत अनुसार', 'packets': 'पैकेट' }
const UNIT_MR: Record<string, string> = { 'cup': 'कप', 'cups': 'कप', 'tbsp': 'मोठा चमचा', 'tsp': 'छोटा चमचा', 'g': 'ग्रॅम', 'kg': 'किलो', 'mL': 'मिली', 'L': 'लिटर', 'pieces': 'नग', 'to taste': 'चवीनुसार', 'as needed': 'गरजेनुसार', 'packets': 'पॅकेट' }

export default async function SharedViewPage({
  params, searchParams,
}: {
  params: Promise<{ menuId: string }>
  searchParams: Promise<{ lang?: string; day?: string }>
}) {
  const { menuId } = await params
  const { lang: lp, day: dp } = await searchParams
  const lang = lp === 'mr' ? 'mr' : 'hi'
  const days = lang === 'mr' ? DAY_MR : DAY_HI
  const acc = lang === 'mr' ? ACC_MR : ACC_HI
  const units = lang === 'mr' ? UNIT_MR : UNIT_HI

  const { data: menuItems } = await supabase
    .from('menu_items').select('*, dish:dishes(*)').eq('menu_id', menuId).order('day_of_week')
  if (!menuItems?.length) return notFound()

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const selDay = dp !== undefined ? parseInt(dp) : null
  const active = selDay !== null
    ? menuItems.find(i => i.day_of_week === selDay)
    : menuItems.find(i => i.date === todayStr) || menuItems[0]
  if (!active?.dish) return notFound()

  const dish = active.dish
  const [{ data: ingredients }, { data: steps }] = await Promise.all([
    supabase.from('dish_ingredients').select('*, ingredient:ingredients(*)').eq('dish_id', dish.id),
    supabase.from('recipe_steps').select('*').eq('dish_id', dish.id).order('step_number'),
  ])

  const name = (lang === 'mr' ? (dish.name_mr || dish.name_hi) : dish.name_hi) || dish.name_en
  const isToday = active.date === todayStr
  const label = isToday ? (lang === 'mr' ? 'आजचे जेवण' : 'आज का खाना') : days[active.day_of_week]
  const ingLabel = lang === 'mr' ? 'साहित्य' : 'सामग्री'
  const stepLabel = lang === 'mr' ? 'कृती' : 'विधि'
  const weekLabel = lang === 'mr' ? 'पूर्ण आठवडा' : 'पूरा हफ़्ता'
  const videoLabel = lang === 'mr' ? 'व्हिडिओ पहा' : 'वीडियो देखें'

  function localQty(qty: number, unit: string): string {
    if (unit === 'to taste') return units['to taste'] || 'स्वादानुसार'
    if (unit === 'as needed') return units['as needed'] || 'ज़रूरत अनुसार'
    const localUnit = units[unit] || unit
    return `${toHindiNum(qty)} ${localUnit}`
  }

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <title>{name}</title>
        <style>{`
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#F5F0EA;color:#2D2A26;line-height:2;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
.c{max-width:500px;margin:0 auto;padding:16px 16px 48px}
.lang{display:flex;gap:4px;justify-content:flex-end;margin-bottom:20px;background:#FFFDF9;border-radius:14px;padding:4px;width:fit-content;margin-left:auto;box-shadow:0 1px 4px rgba(45,42,38,0.06)}
.lb{padding:10px 24px;border-radius:12px;text-decoration:none;font-size:22px;font-weight:600;color:#8C8680}
.lb.on{background:#2D2A26;color:#fff}
.dl{font-size:22px;color:#8C8680;margin-bottom:4px;font-weight:500}
.dn{font-size:40px;font-weight:800;line-height:1.2;margin-bottom:8px;letter-spacing:-0.5px}
.ac{font-size:26px;color:#8C8680;margin-bottom:28px;font-weight:500}
.yt{display:inline-flex;align-items:center;gap:10px;background:#FF0000;color:#fff;padding:12px 24px;border-radius:14px;text-decoration:none;font-size:20px;font-weight:600;margin-bottom:32px;box-shadow:0 2px 8px rgba(255,0,0,0.2)}
.yt svg{width:28px;height:28px;fill:#fff}
.sec{font-size:28px;font-weight:700;margin-bottom:16px;margin-top:8px}
.ir{display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #E5DFD6;font-size:24px}
.iq{color:#8C8680;white-space:nowrap;margin-left:12px;font-size:22px;font-weight:500}
.st{display:flex;gap:16px;margin-bottom:28px;align-items:flex-start}
.sn{width:44px;height:44px;border-radius:14px;background:#2D2A26;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;flex-shrink:0}
.sx{font-size:26px;line-height:1.8;padding-top:6px}
.nb{display:flex;gap:8px;margin-top:36px;padding-top:24px;border-top:2px solid #E5DFD6}
.na{flex:1;text-align:center;padding:18px;background:#FFFDF9;border-radius:16px;text-decoration:none;color:#2D2A26;font-size:24px;font-weight:600;min-height:64px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(45,42,38,0.06)}
.wt{text-align:center;padding:18px;font-size:24px;color:#8C8680;cursor:pointer;margin-top:8px}
.wt summary{list-style:none}
.wl{margin-top:12px}
.wi{display:block;padding:18px;margin-bottom:8px;background:#FFFDF9;border-radius:16px;text-decoration:none;color:#2D2A26;box-shadow:0 1px 4px rgba(45,42,38,0.06)}
.wi.on{background:#2D2A26;color:#fff}
.wd{font-size:20px;opacity:0.7}
.wn{font-size:26px;font-weight:600}
        `}</style>
      </head>
      <body>
        <div className="c">
          {/* Language toggle */}
          <div className="lang">
            <a href={`/maid/${menuId}?lang=hi${selDay !== null ? `&day=${selDay}` : ''}`} className={`lb ${lang==='hi'?'on':''}`}>हिंदी</a>
            <a href={`/maid/${menuId}?lang=mr${selDay !== null ? `&day=${selDay}` : ''}`} className={`lb ${lang==='mr'?'on':''}`}>मराठी</a>
          </div>

          {/* Dish header */}
          <div className="dl">{label}</div>
          <div className="dn">{name}</div>
          {dish.default_accompaniment && <div className="ac">+ {acc[dish.default_accompaniment] || dish.default_accompaniment}</div>}

          {/* YouTube link */}
          {dish.youtube_url && (
            <a href={dish.youtube_url} target="_blank" rel="noopener noreferrer" className="yt">
              <svg viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>
              {videoLabel}
            </a>
          )}

          {/* Ingredients */}
          <div className="sec">{ingLabel}</div>
          <div style={{marginBottom:'32px'}}>
            {ingredients?.map(ing => {
              const n = lang==='mr' ? (ing.ingredient?.name_mr||ing.ingredient?.name_hi||ing.ingredient?.name_en) : (ing.ingredient?.name_hi||ing.ingredient?.name_en)
              return (
                <div key={ing.id} className="ir">
                  <span>{n}</span>
                  <span className="iq">{localQty(ing.quantity, ing.unit)}</span>
                </div>
              )
            })}
          </div>

          {/* Recipe steps */}
          <div className="sec">{stepLabel}</div>
          <div style={{marginBottom:'24px'}}>
            {steps?.map(step => {
              const t = lang==='mr' ? (step.instruction_mr||step.instruction_hi||step.instruction_en) : (step.instruction_hi||step.instruction_en)
              return (
                <div key={step.id} className="st">
                  <div className="sn">{toHindiNum(step.step_number)}</div>
                  <div className="sx">{t}</div>
                </div>
              )
            })}
          </div>

          {/* Day navigation */}
          <div className="nb">
            {active.day_of_week > 0 && (
              <a href={`/maid/${menuId}?lang=${lang}&day=${active.day_of_week-1}`} className="na">← {days[active.day_of_week-1]}</a>
            )}
            {active.day_of_week < 6 && (
              <a href={`/maid/${menuId}?lang=${lang}&day=${active.day_of_week+1}`} className="na">{days[active.day_of_week+1]} →</a>
            )}
          </div>

          {/* Full week */}
          <details className="wt">
            <summary>{weekLabel}</summary>
            <div className="wl">
              {menuItems.map(item => {
                const n = lang==='mr' ? (item.dish?.name_mr||item.dish?.name_hi||item.dish?.name_en) : (item.dish?.name_hi||item.dish?.name_en)
                return (
                  <a key={item.id} href={`/maid/${menuId}?lang=${lang}&day=${item.day_of_week}`} className={`wi ${item.day_of_week===active.day_of_week?'on':''}`}>
                    <div className="wd">{days[item.day_of_week]}</div>
                    <div className="wn">{n}</div>
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
