'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CUISINE_LABELS, type CuisineType } from '@/lib/types'

export default function AddDishPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name_en: '', name_hi: '', name_mr: '',
    cuisine: 'north' as CuisineType | 'custom',
    is_veg: true,
    prep_time_min: '', cook_time_min: '',
    difficulty: 'easy',
    default_accompaniment: 'roti',
    calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '',
    description_en: '',
  })
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: 'pieces' }])
  const [steps, setSteps] = useState([''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateForm(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addIngredientRow() {
    setIngredients(prev => [...prev, { name: '', quantity: '', unit: 'pieces' }])
  }

  function updateIngredient(idx: number, field: string, value: string) {
    setIngredients(prev => prev.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing))
  }

  function removeIngredient(idx: number) {
    setIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  function addStep() {
    setSteps(prev => [...prev, ''])
  }

  function updateStep(idx: number, value: string) {
    setSteps(prev => prev.map((s, i) => i === idx ? value : s))
  }

  function removeStep(idx: number) {
    setSteps(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!form.name_en) { setError('Dish name is required'); return }
    setSaving(true)
    setError('')

    try {
      const slug = form.name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      const { data: dish, error: dishErr } = await supabase.from('dishes').insert({
        slug,
        name_en: form.name_en,
        name_hi: form.name_hi || null,
        name_mr: form.name_mr || null,
        cuisine: form.cuisine,
        is_veg: form.is_veg,
        prep_time_min: form.prep_time_min ? parseInt(form.prep_time_min) : null,
        cook_time_min: form.cook_time_min ? parseInt(form.cook_time_min) : null,
        difficulty: form.difficulty,
        default_accompaniment: form.default_accompaniment || null,
        calories: form.calories ? parseInt(form.calories) : null,
        protein_g: form.protein_g ? parseFloat(form.protein_g) : null,
        carbs_g: form.carbs_g ? parseFloat(form.carbs_g) : null,
        fat_g: form.fat_g ? parseFloat(form.fat_g) : null,
        fiber_g: form.fiber_g ? parseFloat(form.fiber_g) : null,
        description_en: form.description_en || null,
        is_custom: true,
      }).select('id').single()

      if (dishErr) throw dishErr

      // Insert ingredients
      for (const ing of ingredients.filter(i => i.name && i.quantity)) {
        // Try to find existing ingredient or create new
        let { data: existing } = await supabase
          .from('ingredients')
          .select('id')
          .eq('name_en', ing.name)
          .single()

        if (!existing) {
          const { data: created } = await supabase
            .from('ingredients')
            .insert({ name_en: ing.name, default_unit: ing.unit })
            .select('id')
            .single()
          existing = created
        }

        if (existing) {
          await supabase.from('dish_ingredients').insert({
            dish_id: dish!.id,
            ingredient_id: existing.id,
            quantity: parseFloat(ing.quantity),
            unit: ing.unit,
          })
        }
      }

      // Insert recipe steps
      const validSteps = steps.filter(s => s.trim())
      if (validSteps.length > 0) {
        await supabase.from('recipe_steps').insert(
          validSteps.map((s, i) => ({
            dish_id: dish!.id,
            step_number: i + 1,
            instruction_en: s.trim(),
          }))
        )
      }

      router.push('/settings')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
    setSaving(false)
  }

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold mb-6">Add a dish</h1>

      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="text-sm font-medium block mb-1">Dish name (English) *</label>
          <input value={form.name_en} onChange={e => updateForm('name_en', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm" placeholder="e.g. Paneer Tikka" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Name (Hindi)</label>
            <input value={form.name_hi} onChange={e => updateForm('name_hi', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Name (Marathi)</label>
            <input value={form.name_mr} onChange={e => updateForm('name_mr', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm" />
          </div>
        </div>

        {/* Cuisine + Veg */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Cuisine</label>
            <select value={form.cuisine} onChange={e => updateForm('cuisine', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm bg-white">
              {(['tamil', 'north', 'marathi', 'bihari', 'custom'] as const).map(c => (
                <option key={c} value={c}>{c === 'custom' ? 'Custom' : CUISINE_LABELS[c as CuisineType]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Type</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => updateForm('is_veg', true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${form.is_veg ? 'bg-green-100 text-[#2E7D32] border border-[#2E7D32]' : 'bg-[#F5F5F5]'}`}>
                Veg
              </button>
              <button onClick={() => updateForm('is_veg', false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${!form.is_veg ? 'bg-red-100 text-[#C62828] border border-[#C62828]' : 'bg-[#F5F5F5]'}`}>
                Non-Veg
              </button>
            </div>
          </div>
        </div>

        {/* Time + Difficulty */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium block mb-1">Prep (min)</label>
            <input type="number" value={form.prep_time_min} onChange={e => updateForm('prep_time_min', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Cook (min)</label>
            <input type="number" value={form.cook_time_min} onChange={e => updateForm('cook_time_min', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Difficulty</label>
            <select value={form.difficulty} onChange={e => updateForm('difficulty', e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm bg-white">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Accompaniment */}
        <div>
          <label className="text-sm font-medium block mb-1">Accompaniment</label>
          <select value={form.default_accompaniment} onChange={e => updateForm('default_accompaniment', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm bg-white">
            <option value="">None (standalone dish)</option>
            <option value="steamed-rice">Steamed Rice</option>
            <option value="roti">Roti</option>
            <option value="bhakri">Bhakri</option>
            <option value="pav">Pav</option>
            <option value="paratha">Paratha</option>
            <option value="naan">Naan</option>
          </select>
        </div>

        {/* Ingredients */}
        <div>
          <label className="text-sm font-medium block mb-2">Ingredients</label>
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={ing.name} onChange={e => updateIngredient(i, 'name', e.target.value)}
                placeholder="Ingredient" className="flex-1 px-3 py-2 rounded-xl border border-[#E0E0E0] text-sm" />
              <input type="number" value={ing.quantity} onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                placeholder="Qty" className="w-20 px-3 py-2 rounded-xl border border-[#E0E0E0] text-sm" />
              <select value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)}
                className="px-2 py-2 rounded-xl border border-[#E0E0E0] text-sm bg-white">
                {['pieces', 'kg', 'g', 'cup', 'tbsp', 'tsp', 'mL', 'L'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              {ingredients.length > 1 && (
                <button onClick={() => removeIngredient(i)} className="text-[#6B6B6B] hover:text-[#C62828]">x</button>
              )}
            </div>
          ))}
          <button onClick={addIngredientRow} className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A]">
            + Add ingredient
          </button>
        </div>

        {/* Recipe steps */}
        <div>
          <label className="text-sm font-medium block mb-2">Recipe steps</label>
          {steps.map((step, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <span className="w-6 h-8 flex items-center justify-center text-xs text-[#6B6B6B]">{i + 1}.</span>
              <input value={step} onChange={e => updateStep(i, e.target.value)}
                placeholder={`Step ${i + 1}`} className="flex-1 px-3 py-2 rounded-xl border border-[#E0E0E0] text-sm" />
              {steps.length > 1 && (
                <button onClick={() => removeStep(i)} className="text-[#6B6B6B] hover:text-[#C62828]">x</button>
              )}
            </div>
          ))}
          <button onClick={addStep} className="text-sm text-[#6B6B6B] hover:text-[#1A1A1A]">
            + Add step
          </button>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium block mb-1">Description</label>
          <input value={form.description_en} onChange={e => updateForm('description_en', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[#E0E0E0] text-sm"
            placeholder="One-line description" />
        </div>

        {error && <p className="text-sm text-[#C62828] bg-red-50 p-3 rounded-xl">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !form.name_en}
          className="w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl font-medium text-base hover:bg-[#333] transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Dish'}
        </button>
      </div>
    </div>
  )
}
