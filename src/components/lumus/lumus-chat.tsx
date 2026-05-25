'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, RotateCcw, Globe } from 'lucide-react'
import { useAIStore } from '@/stores/ai-store'
import type { AIModule } from '@/types'
import { LumusOrb, LumusOrbIcon } from './lumus-orb'
import type { OrbState } from './lumus-orb'

interface LumusChatProps {
  module: AIModule
  moduleLabel: string
  suggestions: string[]
  onClose: () => void
}

const WEB_QUERY_KEYWORDS = [
  'clima', 'tiempo', 'temperatura', 'lluvia', 'pronóstico', 'pronostico',
  'calor', 'frío', 'frio', 'viento', 'nublado', 'tormenta', 'humedad',
  'noticias', 'noticia', 'cotización', 'cotizacion', 'dólar', 'dollar',
  'tipo de cambio', 'última hora', 'ultima hora', 'busca en internet',
  'buscame en internet', 'buscar en internet', 'qué dice internet',
]

function isWebQuery(text: string): boolean {
  const lower = text.toLowerCase()
  return WEB_QUERY_KEYWORDS.some(k => lower.includes(k))
}

export function LumusChat({ module, moduleLabel, suggestions, onClose }: LumusChatProps) {
  const {
    messages, isLoading, isSearchingWeb,
    addMessage, setLoading, setSearchingWeb, setModule, clearMessages,
  } = useAIStore()
  const [input, setInput] = useState('')
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setModule(module)
    inputRef.current?.focus()
  }, [module, setModule])

  useEffect(() => {
    if (isLoading) {
      setOrbState('thinking')
      return
    }
    const last = messages[messages.length - 1]
    if (last?.role === 'assistant') {
      setOrbState('speaking')
      const t = setTimeout(() => setOrbState('idle'), 2500)
      return () => clearTimeout(t)
    }
    setOrbState('idle')
  }, [isLoading, messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, isSearchingWeb])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    addMessage({ role: 'user', content: trimmed })
    setInput('')
    setLoading(true)

    if (isWebQuery(trimmed)) {
      setSearchingWeb(true)
    }

    try {
      const history = messages.slice(-10)
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          module,
          conversationHistory: history,
        }),
      })

      if (!res.ok) throw new Error()
      const data = await res.json() as { response: string; searchedWeb: boolean }
      addMessage({ role: 'assistant', content: data.response, searchedWeb: data.searchedWeb })
    } catch {
      addMessage({ role: 'assistant', content: 'Hubo un error al procesar tu mensaje. Intentá de nuevo.' })
    } finally {
      setLoading(false)
      setSearchingWeb(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative flex w-full max-w-[400px] flex-col"
        style={{
          background: '#0d0d14',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '-16px 0 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <LumusOrbIcon size={36} state={orbState} />
            <div>
              <p className="lumus-heading text-sm font-semibold text-[var(--text-primary)]">Lumus</p>
              <p className="lumus-label text-[0.58rem] uppercase tracking-widest text-[var(--text-muted)]">
                {moduleLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-secondary)]"
                aria-label="Limpiar conversación"
                title="Limpiar"
              >
                <RotateCcw size={13} />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center pt-4 pb-2">
              <LumusOrb state={orbState} size={180} />
              <p className="lumus-heading -mt-2 text-center text-base font-semibold text-[var(--text-primary)]">
                Hola, soy Lumus
              </p>
              <p className="mt-1 text-center text-xs text-[var(--text-muted)]">
                ¿En qué te puedo ayudar con {moduleLabel.toLowerCase()}?
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="mt-1 flex-shrink-0">
                  <LumusOrbIcon size={26} state="idle" />
                </div>
              )}
              <div className={`flex flex-col gap-1 max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'rounded-tr-sm bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                      : 'rounded-tl-sm text-[var(--text-secondary)]'
                  }`}
                  style={
                    msg.role === 'assistant'
                      ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }
                      : undefined
                  }
                >
                  {msg.content}
                </div>
                {msg.role === 'assistant' && msg.searchedWeb && (
                  <div className="flex items-center gap-1 px-1">
                    <Globe size={9} className="text-[var(--accent-lumus)] opacity-60" />
                    <span className="text-[0.55rem] uppercase tracking-wider text-[var(--text-muted)]">
                      Tiempo real
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2">
              <div className="mt-1 flex-shrink-0">
                <LumusOrbIcon size={26} state="thinking" />
              </div>
              <div
                className="rounded-2xl rounded-tl-sm px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {isSearchingWeb ? (
                  <div className="flex items-center gap-2">
                    <Globe
                      size={12}
                      className="text-[var(--accent-lumus)] animate-spin"
                    />
                    <span className="text-xs text-[var(--text-muted)]">Analizando internet...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {[0, 150, 300].map(delay => (
                      <div
                        key={delay}
                        className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions — visible solo si no hay mensajes */}
        {messages.length === 0 && (
          <div
            className="px-4 pb-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            <p className="mb-2.5 pt-3 text-[0.6rem] uppercase tracking-wider text-[var(--text-muted)]">
              Sugerencias
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={isLoading}
                  className="rounded-full border border-white/[0.09] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent-lumus)]/30 hover:bg-[var(--accent-muted)] hover:text-[var(--accent-lumus)] disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="px-4 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Preguntale a Lumus..."
              disabled={isLoading}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lumus)]/50 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent-lumus)] text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
