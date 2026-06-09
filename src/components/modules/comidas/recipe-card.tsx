'use client'

import { Clock, Flame, Heart, Trash2, Sparkles, ChevronDown, ChevronUp, Dumbbell, Users, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import type { Recipe, RecipeCategory } from '@/types/food.types'
import { LumusChat } from '@/components/lumus/lumus-chat'

const CATEGORY_CONFIG: Record<RecipeCategory, { label: string; color: string; bg: string }> = {
  desayuno: { label: 'Desayuno',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  almuerzo: { label: 'Almuerzo',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  merienda: { label: 'Merienda',  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  cena:     { label: 'Cena',      color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  postre:   { label: 'Postre',    color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  otro:     { label: 'Otro',      color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

interface RecipeCardProps {
  recipe: Recipe
  onToggleFavorite: (id: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onSelect?: (recipe: Recipe) => void
}

export function RecipeCard({ recipe, onToggleFavorite, onDelete, onSelect }: RecipeCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showLumus, setShowLumus] = useState(false)

  const cat = CATEGORY_CONFIG[recipe.category ?? 'otro']

  const macros = [
    { label: 'Carbs', value: recipe.carbs_g, color: '#f97316' },
    { label: 'Grasas', value: recipe.fat_g, color: '#facc15' },
  ].filter(m => m.value != null)

  const lumusSuggestions = [
    `¿Puedo hacer esta receta más saludable?`,
    `¿Qué pasa si la cocino a fuego alto?`,
    `¿Cómo escalar para más porciones?`,
    `¿Qué ingrediente puedo reemplazar?`,
  ]


  return (
    <>
      <div
        className="lumus-glass rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="rounded-full px-2 py-0.5 text-[0.6rem] font-medium"
                  style={{ color: cat.color, background: cat.bg }}
                >
                  {cat.label}
                </span>
                {recipe.ai_generated && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[0.6rem] text-[var(--accent-lumus)]">
                    <Sparkles size={9} />
                    IA
                  </span>
                )}
                {recipe.servings > 1 && (
                  <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[0.6rem] text-[var(--text-muted)]">
                    <Users size={9} />
                    {recipe.servings} porciones
                  </span>
                )}
              </div>

              <h3 className="text-sm font-medium text-[var(--text-primary)]">{recipe.title}</h3>
              {recipe.description && (
                <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-2">{recipe.description}</p>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onToggleFavorite(recipe.id)}
                className="rounded-lg p-1.5 transition-colors hover:bg-white/10"
                title={recipe.favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                <Heart
                  size={14}
                  className={recipe.favorite ? 'fill-[#f97316] text-[#f97316]' : 'text-[var(--text-muted)]'}
                />
              </button>
              <button
                onClick={() => onDelete(recipe.id)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                title="Eliminar receta"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Macros */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {recipe.calories != null && (
              <div className="flex items-center gap-1.5">
                <Flame size={12} className="text-[#f97316]" />
                <span className="text-xs text-[var(--text-secondary)]">{recipe.calories} kcal</span>
              </div>
            )}
            {recipe.protein_g != null && (
              <div className="flex items-center gap-1.5">
                <Dumbbell size={12} className="text-blue-400" />
                <span className="text-xs text-blue-400 font-medium">{recipe.protein_g}g prot</span>
              </div>
            )}
            {recipe.prep_time_min != null && (
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-[var(--text-muted)]" />
                <span className="text-xs text-[var(--text-muted)]">{recipe.prep_time_min} min</span>
              </div>
            )}
            {macros.map(m => (
              <div key={m.label} className="flex items-center gap-1">
                <span className="text-[0.6rem] font-semibold" style={{ color: m.color }}>{m.label}</span>
                <span className="text-xs text-[var(--text-muted)]">{m.value}g</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {onSelect && (
              <button
                onClick={() => onSelect(recipe)}
                className="rounded-lg bg-[var(--accent-muted)] px-3 py-1.5 text-xs font-medium text-[var(--accent-lumus)] transition-colors hover:bg-[var(--accent-lumus)]/20"
              >
                Registrar comida
              </button>
            )}
            <button
              onClick={() => setShowLumus(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--accent-lumus)]"
            >
              <MessageSquare size={11} />
              Preguntarle a Lumus
            </button>
            {(recipe.ingredients?.length || recipe.instructions) && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-secondary)]"
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {expanded ? 'Ocultar' : 'Ver receta'}
              </button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div className="pt-3">
                <p className="mb-2 text-[0.6rem] uppercase tracking-wider text-[var(--text-muted)]">Ingredientes</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="h-1 w-1 rounded-full bg-[var(--accent-lumus)]/50" />
                      <span className="text-xs text-[var(--text-secondary)]">
                        {ing.quantity} {ing.unit} {ing.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recipe.instructions && (
              <div>
                <p className="mb-2 text-[0.6rem] uppercase tracking-wider text-[var(--text-muted)]">Preparación</p>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
                  {recipe.instructions}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {showLumus && (
        <LumusChat
          module="comidas"
          moduleLabel={`Receta: ${recipe.title}`}
          suggestions={lumusSuggestions}
          onClose={() => setShowLumus(false)}
        />
      )}
    </>
  )
}
