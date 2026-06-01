'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { CUISINE_LABELS, ACCOMPANIMENT_LABELS } from '@/lib/types'
import type { Dish, DishIngredient, RecipeStep, Language } from '@/lib/types'

export default function DishDetailPage() {
  const params = useParams()
  const menuId = params.id as string
  const slug = params.slug as string

  const [dish, setDish] = useState<Dish | null>(null)
  const [ingredients, setIngredients] = useState<DishIngredient[]>([])
  const [steps, setSteps] = useState<RecipeStep[]>([])
  const [lang, setLang] = useState<Language>('en')
  const [servings, setServings] = useState(2)

  useEffect(() => { loadDish() }, [slug])

  async function loadDish() {
    const { data: d } = await supabase.from('dishes').select('*').eq('slug', slug).single()
    if (d) {
      setDish(d)
      setServings(d.default_servings)
    }

    const { data: ing } = await supabase
      .from('dish_ingredients')
      .select('*, ingredient:ingredients(*)')
      .eq('dish_id', d?.id)
    setIngredients(ing || [])

    const { data: st } = await supabase
      .from('recipe_steps')
      .select('*')
      .eq('dish_id', d?.id)
      .order('step_number')
    setSteps(st || [])
  }

  function getDishName() {
    if (!dish) return ''
    if (lang === 'hi') return dish.name_hi || dish.name_en
    if (lang === 'mr') return dish.name_mr || dish.name_en
    return dish.name_en
  }

  function getIngredientName(ing: DishIngredient) {
    const i = ing.ingredient
    if (!i) return ''
    if (lang === 'hi') return i.name_hi || i.name_en
    if (lang === 'mr') return i.name_mr || i.name_en
    return i.name_en
  }

  function getStepText(step: RecipeStep) {
    if (lang === 'hi') return step.instruction_hi || step.instruction_en
    if (lang === 'mr') return step.instruction_mr || step.instruction_en
    return step.instruction_en
  }

  const scaleFactor = dish ? servings / dish.default_servings : 1

  if (!dish) return <div className="py-20 text-center text-[#8C8680]">Loading...</div>

  return (
    <div className="py-8">
      <Link href={`/menu/${menuId}`} className="text-sm text-[#8C8680] hover:text-[#2D2A26] mb-4 inline-block">
        &larr; Back to menu
      </Link>

      {/* Header */}
      <div className="flex gap-4 mb-6">
        <div
          className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0"
          style={{ backgroundColor: dish.cuisine === 'tamil' ? '#E8D5C4' : dish.cuisine === 'north' ? '#F5E6CC' : dish.cuisine === 'marathi' ? '#D4E8D4' : '#E8DCC8' }}
        >
          {dish.illustration_url ? (
            <img src={dish.illustration_url} alt={dish.name_en} className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-3xl font-bold opacity-20">{dish.name_en.charAt(0)}</span>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{getDishName()}</h1>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs ${
              dish.cuisine === 'tamil' ? 'bg-[#E8D5C4]' :
              dish.cuisine === 'north' ? 'bg-[#F5E6CC]' :
              dish.cuisine === 'marathi' ? 'bg-[#D4E8D4]' : 'bg-[#E8DCC8]'
            }`}>
              {CUISINE_LABELS[dish.cuisine as keyof typeof CUISINE_LABELS]}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs ${
              dish.is_veg ? 'bg-green-100 text-[#2E7D32]' : 'bg-red-100 text-[#C62828]'
            }`}>
              {dish.is_veg ? 'Veg' : 'Non-Veg'}
            </span>
            {dish.default_accompaniment && (
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-[#F5F0EA]">
                + {ACCOMPANIMENT_LABELS[dish.default_accompaniment] || dish.default_accompaniment}
              </span>
            )}
          </div>
          {/* YouTube link */}
          {dish.youtube_url && (
            <a href={dish.youtube_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>
              Watch video
            </a>
          )}
        </div>
      </div>

      {/* Language toggle */}
      <div className="flex gap-1 bg-[#F5F0EA] rounded-xl p-1 mb-6 w-fit">
        {(['en', 'hi', 'mr'] as Language[]).map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              lang === l ? 'bg-[#2D2A26] text-white' : 'text-[#8C8680] hover:text-[#2D2A26]'
            }`}
          >
            {l === 'en' ? 'EN' : l === 'hi' ? 'हिंदी' : 'मराठी'}
          </button>
        ))}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Prep', value: `${dish.prep_time_min}m` },
          { label: 'Cook', value: `${dish.cook_time_min}m` },
          { label: 'Difficulty', value: dish.difficulty },
          { label: 'Servings', value: `${servings}` },
        ].map(m => (
          <div key={m.label} className="bg-[#F5F0EA] rounded-xl p-3 text-center">
            <p className="text-xs text-[#8C8680]">{m.label}</p>
            <p className="font-medium text-sm capitalize">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Servings adjuster */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-[#8C8680]">Servings:</span>
        <button
          onClick={() => setServings(Math.max(1, servings - 1))}
          className="w-8 h-8 rounded-lg bg-[#F5F0EA] hover:bg-[#EBEBEB] flex items-center justify-center font-medium"
        >-</button>
        <span className="font-medium w-6 text-center">{servings}</span>
        <button
          onClick={() => setServings(Math.min(10, servings + 1))}
          className="w-8 h-8 rounded-lg bg-[#F5F0EA] hover:bg-[#EBEBEB] flex items-center justify-center font-medium"
        >+</button>
      </div>

      {/* Nutrition card — scales with servings */}
      {dish.calories && (
        <div className="bg-[#F5F0EA] rounded-2xl p-4 mb-6">
          <p className="text-xs text-[#8C8680] mb-2">Per serving ({servings} servings)</p>
          <div className="flex gap-4 text-sm flex-wrap">
            <span className="font-medium">{Math.round(dish.calories * scaleFactor)} cal</span>
            <span>{Math.round((dish.protein_g || 0) * scaleFactor)}g protein</span>
            <span>{Math.round((dish.carbs_g || 0) * scaleFactor)}g carbs</span>
            <span>{Math.round((dish.fat_g || 0) * scaleFactor)}g fat</span>
            <span>{Math.round((dish.fiber_g || 0) * scaleFactor)}g fiber</span>
          </div>
        </div>
      )}

      {/* Ingredients */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">
          {lang === 'hi' ? 'सामग्री' : lang === 'mr' ? 'साहित्य' : 'Ingredients'}
        </h2>
        <div className="space-y-2">
          {ingredients.map(ing => (
            <div key={ing.id} className="flex justify-between items-center py-2 border-b border-[#F5F0EA]">
              <span className="text-sm">{getIngredientName(ing)}</span>
              <span className="text-sm text-[#8C8680]">
                {ing.unit === 'to taste' ? 'to taste' :
                  `${(ing.quantity * scaleFactor).toFixed(ing.quantity * scaleFactor % 1 === 0 ? 0 : 1)} ${ing.unit}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recipe steps */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          {lang === 'hi' ? 'विधि' : lang === 'mr' ? 'कृती' : 'Recipe'}
        </h2>
        <div className="space-y-4">
          {steps.map(step => (
            <div key={step.id} className="flex gap-3">
              <span className="w-7 h-7 rounded-full bg-[#2D2A26] text-white flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                {step.step_number}
              </span>
              <p className="text-sm leading-relaxed">{getStepText(step)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
