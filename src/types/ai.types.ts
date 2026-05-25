export interface UserSnapshot {
  perfil: {
    nombre: string
    edad: number
    peso_kg: number | null
    altura_cm: number | null
    ocupacion: string | null
    resumen_vida: string
  }
  semana: string
  organizacion: {
    tareas_pendientes: number
    tareas_completadas_semana: number
    tareas_vencidas: number
    proximas_tareas: string[]
  }
  finanzas: {
    gastado_mes: number
    ingresado_mes: number
    presupuesto_mes: number
    categoria_top_gasto: string
    dias_para_fin_mes: number
    total_suscripciones_mes: number
    metas_activas: Array<{ nombre: string; progreso_pct: number }>
  }
  comidas: {
    calorias_hoy: number
    comidas_registradas_hoy: number
    recetas_guardadas: number
    items_lista_super: number
  }
  fit: {
    peso_actual: number | null
    tendencia_peso: string
    entrenos_semana: number
    agua_hoy_ml: number
    sueno_anoche_h: number | null
    rutinas_guardadas: number
  }
  habitos: {
    gym: string
    agua: string
    sueno_promedio: number
  }
  salud: {
    ultimo_peso: number | null
    tendencia_peso: string
  }
  mood_semana: number
  objetivos_activos: string[]
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  searchedWeb?: boolean
}

export type AIModule =
  | 'organizacion'
  | 'finanzas'
  | 'comidas'
  | 'fit'
  | 'habitos'
  | 'journal'
  | 'relaciones'
  | 'estudio'
  | 'general'

export type AITask =
  | 'chat'
  | 'summary'
  | 'analysis'
  | 'classify'
  | 'sentiment'
  | 'generate_list'

export interface ChatRequest {
  message: string
  module: AIModule
  conversationHistory: AIMessage[]
}

export interface ChatResponse {
  response: string
  cached: boolean
  searchedWeb: boolean
}
