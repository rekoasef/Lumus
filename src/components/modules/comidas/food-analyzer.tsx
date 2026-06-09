'use client'

import { useRef, useState } from 'react'
import { Camera, Type, X, Upload, Plus, Loader2, AlertCircle } from 'lucide-react'
import type { FoodAnalysis, MealType } from '@/types/food.types'

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'merienda', label: 'Merienda' },
  { value: 'cena', label: 'Cena' },
]

interface FoodAnalyzerProps {
  date: string
  defaultMealType?: MealType
  onAddToLog: (data: { name: string; calories: number; protein_g: number; meal_type: MealType; photo_url?: string }) => Promise<boolean>
  onClose: () => void
}

export function FoodAnalyzer({ date, defaultMealType = 'almuerzo', onAddToLog, onClose }: FoodAnalyzerProps) {
  const [mode, setMode] = useState<'text' | 'photo'>('text')
  const [description, setDescription] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageType, setImageType] = useState<string>('image/jpeg')
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null)
  const [mealType, setMealType] = useState<MealType>(defaultMealType)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImageType(file.type || 'image/jpeg')
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImagePreview(result)
      // strip the data:image/...;base64, prefix
      const base64 = result.split(',')[1]
      setImageBase64(base64)
      setAnalysis(null)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  async function handleAnalyze() {
    if (mode === 'text' && !description.trim()) return
    if (mode === 'photo' && !imageBase64) return

    setLoading(true)
    setError(null)
    setAnalysis(null)

    const body: Record<string, string> = {}
    if (description.trim()) body.description = description.trim()
    if (mode === 'photo' && imageBase64) {
      body.image_base64 = imageBase64
      body.image_media_type = imageType
    }

    const res = await fetch('/api/food/analyze-food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Error al analizar la comida')
      return
    }

    setAnalysis(data as FoodAnalysis)
  }

  async function handleAdd() {
    if (!analysis) return
    setAdding(true)
    const ok = await onAddToLog({
      name: analysis.name,
      calories: analysis.calories,
      protein_g: analysis.protein_g,
      meal_type: mealType,
    })
    setAdding(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Analizá tu comida</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10">
            <X size={14} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1.5 rounded-xl bg-white/[0.04] p-1">
          <button
            onClick={() => { setMode('text'); setAnalysis(null); setError(null) }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
              mode === 'text' ? 'bg-[var(--surface-2,#1a1a24)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
            }`}
          >
            <Type size={12} /> Descripción
          </button>
          <button
            onClick={() => { setMode('photo'); setAnalysis(null); setError(null) }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
              mode === 'photo' ? 'bg-[var(--surface-2,#1a1a24)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
            }`}
          >
            <Camera size={12} /> Foto
          </button>
        </div>

        {/* Input */}
        {mode === 'text' ? (
          <textarea
            value={description}
            onChange={e => { setDescription(e.target.value); setAnalysis(null); setError(null) }}
            placeholder="Ej: una milanesa con puré de papa y ensalada, porción grande"
            rows={3}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#f97316]/50 focus:outline-none"
          />
        ) : (
          <div>
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Comida" className="w-full h-40 object-cover rounded-xl" />
                <button
                  onClick={() => { setImagePreview(null); setImageBase64(null); setAnalysis(null) }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-white/15 py-8 text-[var(--text-muted)] hover:border-[#f97316]/40 hover:text-[var(--text-secondary)] transition-colors"
              >
                <Upload size={22} />
                <span className="text-xs">Tocá para subir una foto</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2.5" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Resultado */}
        {analysis && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">{analysis.name}</p>
              <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                analysis.confidence === 'alta' ? 'bg-green-500/15 text-green-400'
                : analysis.confidence === 'media' ? 'bg-yellow-500/15 text-yellow-400'
                : 'bg-red-500/15 text-red-400'
              }`}>
                {analysis.confidence === 'alta' ? 'Alta confianza' : analysis.confidence === 'media' ? 'Media confianza' : 'Baja confianza'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'kcal', value: analysis.calories },
                { label: 'Prot', value: `${analysis.protein_g}g` },
                { label: 'Carbs', value: `${analysis.carbs_g}g` },
                { label: 'Grasas', value: `${analysis.fat_g}g` },
              ].map(item => (
                <div key={item.label} className="text-center rounded-lg bg-white/5 py-2">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{item.value}</p>
                  <p className="text-[0.6rem] text-[var(--text-muted)]">{item.label}</p>
                </div>
              ))}
            </div>

            {analysis.notes && (
              <p className="text-[0.7rem] text-[var(--text-muted)] italic">{analysis.notes}</p>
            )}

            {/* Selección de comida */}
            <div>
              <p className="mb-2 text-[0.7rem] text-[var(--text-muted)]">Agregar a:</p>
              <div className="grid grid-cols-4 gap-1">
                {MEAL_TYPES.map(mt => (
                  <button
                    key={mt.value}
                    onClick={() => setMealType(mt.value)}
                    className={`rounded-lg py-1.5 text-[0.65rem] font-medium transition-all ${
                      mealType === mt.value
                        ? 'bg-[#f97316] text-white'
                        : 'bg-white/5 text-[var(--text-muted)] hover:bg-white/10'
                    }`}
                  >
                    {mt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f97316] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#ea6c0c] disabled:opacity-50"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {adding ? 'Agregando...' : `Agregar al ${MEAL_TYPES.find(m => m.value === mealType)?.label}`}
            </button>
          </div>
        )}

        {/* Botón analizar */}
        {!analysis && (
          <button
            onClick={handleAnalyze}
            disabled={loading || (mode === 'text' ? !description.trim() : !imageBase64)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f97316] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#ea6c0c] disabled:opacity-40"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Analizando...</>
            ) : (
              'Analizar con Lumus'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
