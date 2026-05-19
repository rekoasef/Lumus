'use client'

import { create } from 'zustand'
import type { AIMessage, AIModule } from '@/types'

interface AIStore {
  isOpen: boolean
  currentModule: AIModule
  messages: AIMessage[]
  isLoading: boolean
  setOpen: (open: boolean) => void
  setModule: (module: AIModule) => void
  addMessage: (message: AIMessage) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
}

export const useAIStore = create<AIStore>((set) => ({
  isOpen: false,
  currentModule: 'general',
  messages: [],
  isLoading: false,
  setOpen: (open) => set({ isOpen: open }),
  setModule: (module) => set({ currentModule: module }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),
}))
