'use client'

import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { LumusOrbIcon } from '@/components/lumus/lumus-orb'
import { useRecipes } from '@/hooks/use-recipes'
import { useMealLogs } from '@/hooks/use-meal-logs'
import { useShoppingList } from '@/hooks/use-shopping-list'
import { RecipeCard } from './recipe-card'
import { RecipeForm } from './recipe-form'
import { MealLogSection } from './meal-log-section'
import { MealLogForm } from './meal-log-form'
import { ShoppingListComponent } from './shopping-list'
import { LumusChat } from '@/components/lumus/lumus-chat'
import type { Recipe, MealType } from '@/types/food.types'

type Section = 'hoy' | 'recetas' | 'lista'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'recetas', label: 'Recetas' },
  { id: 'lista', label: 'Lista del súper' },
]

const LUMUS_SUGGESTIONS = [
  '¿Qué puedo cocinar con lo que tengo?',
  'Sugerí una cena saludable',
  '¿Cómo estuvo mi alimentación hoy?',
  'Generá una lista del súper semanal',
]

interface ComidasDashboardProps {
  initialRecipes: Recipe[]
  initialMealLogs: import('@/types/food.types').MealLog[]
  initialShoppingItems: import('@/types/food.types').ShoppingListItem[]
}

export function ComidasDashboard({
  initialRecipes,
  initialMealLogs,
  initialShoppingItems,
}: ComidasDashboardProps) {
  const [activeSection, setActiveSection] = useState<Section>('hoy')
  const [showRecipeForm, setShowRecipeForm] = useState(false)
  const [showMealLogForm, setShowMealLogForm] = useState(false)
  const [activeMealType, setActiveMealType] = useState<MealType>('almuerzo')
  const [showLumus, setShowLumus] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })
  const [recipeFilter, setRecipeFilter] = useState<'all' | 'favorites' | 'ai'>('all')

  const { recipes, isGenerating, createRecipe, updateRecipe, deleteRecipe, toggleFavorite, generateRecipe } = useRecipes(initialRecipes)
  const { getCaloriesForDate, getLogsByMealType, addLog, deleteLog } = useMealLogs(initialMealLogs)
  const { uncheckedItems, checkedItems, itemsByCategory, addItem, toggleChecked, deleteItem, clearChecked } = useShoppingList(initialShoppingItems)

  const todayCalories = getCaloriesForDate(selectedDate)
  const logsByMealType = getLogsByMealType(selectedDate)

  function changeDate(delta: number) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
  }

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
  const isToday = selectedDate === today

  const filteredRecipes = recipes.filter(r => {
    if (recipeFilter === 'favorites') return r.favorite
    if (recipeFilter === 'ai') return r.ai_generated
    return true
  })

  function handleAddLog(mealType: MealType) {
    setActiveMealType(mealType)
    setShowMealLogForm(true)
  }

  function handleSelectRecipeForLog(recipe: Recipe) {
    setActiveSection('hoy')
    setActiveMealType('almuerzo')
    setShowMealLogForm(true)
  }

  return (
    <div className="mx-auto max-w-[800px] px-3 py-5 space-y-4 sm:px-4 sm:py-8 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Comidas</h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">Registrá lo que comés y organizá tus recetas</p>
        </div>
        <button
          onClick={() => setShowLumus(true)}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent-muted)] px-3.5 py-2 text-sm font-medium text-[var(--accent-lumus)] transition-colors hover:bg-[var(--accent-lumus)]/20"
        >
          <LumusOrbIcon size={22} />
          Lumus
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              activeSection === s.id
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* HOY */}
      {activeSection === 'hoy' && (
        <div className="space-y-4">
          {/* Date navigator */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => changeDate(-1)}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {isToday ? 'Hoy' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(today)}
                  className="rounded-full bg-white/5 px-2.5 py-0.5 text-[0.65rem] text-[var(--text-muted)] hover:bg-white/10"
                >
                  Hoy
                </button>
              )}
            </div>
            <button
              onClick={() => changeDate(1)}
              disabled={isToday}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <MealLogSection
            date={selectedDate}
            logsByMealType={logsByMealType}
            totalCalories={todayCalories}
            recipes={recipes}
            onAddLog={handleAddLog}
            onDeleteLog={async (id) => { await deleteLog(id); return true }}
          />
        </div>
      )}

      {/* RECETAS */}
      {activeSection === 'recetas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {(['all', 'favorites', 'ai'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setRecipeFilter(f)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                    recipeFilter === f
                      ? 'bg-[#f97316]/20 text-[#f97316]'
                      : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10'
                  }`}
                >
                  {f === 'all' ? 'Todas' : f === 'favorites' ? 'Favoritas' : 'Generadas por IA'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRecipeForm(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#f97316] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#ea6c0c]"
            >
              <Plus size={13} />
              Nueva receta
            </button>
          </div>

          {isGenerating && (
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'rgba(124,109,250,0.08)', border: '1px solid rgba(124,109,250,0.2)' }}
            >
              <LumusOrbIcon size={22} state="thinking" />
              <span className="text-sm text-[var(--accent-lumus)]">Generando receta con IA...</span>
            </div>
          )}

          {filteredRecipes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                {recipeFilter === 'all' ? 'No tenés recetas guardadas' : 'No hay recetas en esta categoría'}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]/60">
                Creá una manualmente o generá una con IA
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecipes.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onToggleFavorite={toggleFavorite}
                  onDelete={deleteRecipe}
                  onSelect={handleSelectRecipeForLog}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* LISTA DEL SÚPER */}
      {activeSection === 'lista' && (
        <ShoppingListComponent
          uncheckedItems={uncheckedItems}
          checkedItems={checkedItems}
          itemsByCategory={itemsByCategory}
          onAdd={addItem}
          onToggle={toggleChecked}
          onDelete={deleteItem}
          onClearChecked={clearChecked}
        />
      )}

      {/* Modals */}
      {showRecipeForm && (
        <RecipeForm
          onSave={async (data) => {
            const ok = await createRecipe(data)
            return ok
          }}
          onGenerate={async (prompt) => {
            setShowRecipeForm(false)
            const recipe = await generateRecipe(prompt)
            return recipe !== null
          }}
          onClose={() => setShowRecipeForm(false)}
        />
      )}

      {showMealLogForm && (
        <MealLogForm
          date={selectedDate}
          defaultMealType={activeMealType}
          recipes={recipes}
          onSave={async (data) => {
            const ok = await addLog(data)
            return ok
          }}
          onClose={() => setShowMealLogForm(false)}
        />
      )}

      {/* Lumus chat */}
      {showLumus && (
        <LumusChat
          module="comidas"
          moduleLabel="Comidas & Nutrición"
          suggestions={LUMUS_SUGGESTIONS}
          onClose={() => setShowLumus(false)}
        />
      )}
    </div>
  )
}
