'use client'

import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { searchIconGroups, CategoryIcon } from '@/lib/utils/category-icons'

const LABELS = {
  label: 'ÍCONO',
  search: 'Buscar: nafta, alquiler, gimnasio…',
  clearSearch: 'Limpiar búsqueda',
  none: 'Sin ícono',
  empty: 'Ningún ícono coincide con',
  emptyHint: 'Probá con una palabra más general, como "casa" o "comida".',
} as const

interface IconPickerProps {
  value: string | null | undefined
  onChange: (icon: string | null) => void
  /** Color de la entidad — tiñe el fondo del ícono, como se ve después en las listas. */
  color: string
  label?: string
}

export function IconPicker({ value, onChange, color, label = LABELS.label }: IconPickerProps) {
  const [query, setQuery] = useState('')
  const groups = useMemo(() => searchIconGroups(query), [query])

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="lumus-label block text-[0.65rem] text-[var(--text-muted)]">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[0.65rem] text-[var(--text-muted)] transition-colors hover:text-[var(--danger)]"
          >
            {LABELS.none}
          </button>
        )}
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={LABELS.search}
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.02] py-2 pl-8 pr-8 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/40 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={LABELS.clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="mt-2 max-h-56 space-y-3 overflow-y-auto pr-1">
        {groups.map(group => (
          <div key={group.label}>
            <p className="lumus-label mb-1.5 text-[0.6rem] text-[var(--text-muted)]/70">
              {group.label}
            </p>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              {group.icons.map(({ key, terms }) => {
                const selected = value === key
                return (
                  <button
                    key={key}
                    type="button"
                    title={terms}
                    aria-label={key}
                    aria-pressed={selected}
                    onClick={() => onChange(selected ? null : key)}
                    className={`flex aspect-square items-center justify-center rounded-full border transition-all hover:scale-110 ${
                      selected
                        ? 'border-[var(--accent-lumus)] ring-2 ring-[var(--accent-lumus)]/25'
                        : 'border-transparent'
                    }`}
                    // El ícono se muestra ya con el color de la categoría sobre
                    // su propio tinte: es exactamente como se va a ver después
                    // en las listas y en el dashboard.
                    style={{ backgroundColor: `${color}26` }}
                  >
                    <CategoryIcon icon={key} size={15} style={{ color }} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              {LABELS.empty} <span className="text-[var(--text-primary)]">&ldquo;{query}&rdquo;</span>
            </p>
            <p className="mt-1 text-[0.65rem] text-[var(--text-muted)]">{LABELS.emptyHint}</p>
          </div>
        )}
      </div>
    </div>
  )
}
