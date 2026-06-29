export interface UserSnapshot {
  perfil: {
    nombre: string
    edad: number
    ocupacion: string | null
    ingreso_mensual: number | null
    resumen_vida: string
  }
  semana: string
  finanzas: {
    saldo_ars: number
    billeteras: Array<{ nombre: string; saldo: number; moneda: string }>
    gastado_mes: number
    ingresado_mes: number
    balance_mes: number
    presupuesto_mes: number
    presupuesto_usado_pct: number
    categoria_top_gasto: string
    dias_para_fin_mes: number
    total_recurrentes_mes: number
    proximos_recurrentes: Array<{ nombre: string; monto: number; tipo: 'gasto' | 'ingreso'; fecha: string }>
    metas_activas: Array<{ nombre: string; progreso_pct: number }>
  }
  objetivos_activos: string[]
}

export interface AIAction {
  type: 'transaction_created'
  title: string
  details: string
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  searchedWeb?: boolean
  actions?: AIAction[]
}

export type AIModule =
  | 'finanzas'
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
