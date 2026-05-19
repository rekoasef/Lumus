import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserSnapshot } from '@/types'

async function getUserProfile(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('name, birth_date, weight_kg, height_cm, occupation')
    .eq('user_id', userId)
    .single()

  const { data: summary } = await supabase
    .from('user_life_summary')
    .select('content')
    .eq('user_id', userId)
    .single()

  const edad = profile?.birth_date
    ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0

  return {
    nombre: profile?.name ?? 'Usuario',
    edad,
    peso_kg: profile?.weight_kg ?? null,
    altura_cm: profile?.height_cm ?? null,
    ocupacion: profile?.occupation ?? null,
    resumen_vida: summary?.content ?? '',
  }
}

async function getOrganizacionContext(supabase: SupabaseClient, userId: string) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: pendientes } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pendiente')
    .is('deleted_at', null)

  const { data: completadas } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completada')
    .gte('updated_at', weekAgo.toISOString())
    .is('deleted_at', null)

  const { data: vencidas } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'pendiente')
    .lt('due_date', new Date().toISOString())
    .is('deleted_at', null)

  const { data: proximas } = await supabase
    .from('tasks')
    .select('title')
    .eq('user_id', userId)
    .eq('status', 'pendiente')
    .is('deleted_at', null)
    .order('due_date', { ascending: true })
    .limit(3)

  return {
    tareas_pendientes: pendientes?.length ?? 0,
    tareas_completadas_semana: completadas?.length ?? 0,
    tareas_vencidas: vencidas?.length ?? 0,
    proximas_tareas: proximas?.map(t => t.title) ?? [],
  }
}

async function getFinanzasContext(supabase: SupabaseClient, userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const primerDiaMes = `${year}-${String(month).padStart(2, '0')}-01`
  const diasParaFinMes = new Date(year, month, 0).getDate() - now.getDate()

  const [gastosRes, ingresosRes, presupuestosRes, subsRes, metasRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, category:finance_categories(name)')
      .eq('user_id', userId)
      .eq('type', 'gasto')
      .gte('date', primerDiaMes)
      .is('deleted_at', null),
    supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'ingreso')
      .gte('date', primerDiaMes)
      .is('deleted_at', null),
    supabase
      .from('budgets')
      .select('amount')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year),
    supabase
      .from('subscriptions')
      .select('amount, billing_cycle')
      .eq('user_id', userId)
      .eq('active', true),
    supabase
      .from('saving_goals')
      .select('name, target_amount, current_amount')
      .eq('user_id', userId)
      .eq('achieved', false),
  ])

  type GastoRow = { amount: number; category: { name: string } | null }
  const gastos = (gastosRes.data ?? []) as unknown as GastoRow[]
  const gastadoMes = gastos.reduce((s, t) => s + Number(t.amount), 0)
  const ingresadoMes = (ingresosRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0)

  const byCat: Record<string, number> = {}
  for (const g of gastos) {
    const name = g.category?.name ?? 'Sin categoría'
    byCat[name] = (byCat[name] ?? 0) + Number(g.amount)
  }
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]
  const categoriaTopGasto = topCat
    ? `${topCat[0]} ($${Math.round(topCat[1]).toLocaleString('es-AR')})`
    : 'Sin datos'

  const presupuestoTotal = (presupuestosRes.data ?? []).reduce((s, b) => s + Number(b.amount), 0)

  const totalSuscripciones = Math.round(
    (subsRes.data ?? []).reduce((s, sub) => {
      if (sub.billing_cycle === 'anual')   return s + Number(sub.amount) / 12
      if (sub.billing_cycle === 'semanal') return s + Number(sub.amount) * (52 / 12)
      return s + Number(sub.amount)
    }, 0)
  )

  const metasActivas = (metasRes.data ?? []).map(m => ({
    nombre: m.name,
    progreso_pct: m.target_amount > 0
      ? Math.round((Number(m.current_amount) / Number(m.target_amount)) * 100)
      : 0,
  }))

  return {
    gastado_mes:              gastadoMes,
    ingresado_mes:            ingresadoMes,
    presupuesto_mes:          presupuestoTotal,
    categoria_top_gasto:      categoriaTopGasto,
    dias_para_fin_mes:        diasParaFinMes,
    total_suscripciones_mes:  totalSuscripciones,
    metas_activas:            metasActivas,
  }
}

async function getComidosContext(supabase: SupabaseClient, userId: string) {
  const today = new Date().toISOString().split('T')[0]

  const [logsRes, recipesRes, shoppingRes] = await Promise.all([
    supabase
      .from('meal_logs')
      .select('calories')
      .eq('user_id', userId)
      .eq('date', today),
    supabase
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('shopping_list_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('checked', false),
  ])

  const logs = logsRes.data ?? []
  return {
    calorias_hoy: logs.reduce((s, l) => s + (l.calories ?? 0), 0),
    comidas_registradas_hoy: logs.length,
    recetas_guardadas: recipesRes.count ?? 0,
    items_lista_super: shoppingRes.count ?? 0,
  }
}

async function getHabitosContext(supabase: SupabaseClient, userId: string) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: logs } = await supabase
    .from('habit_logs')
    .select('completed')
    .eq('user_id', userId)
    .gte('date', weekAgo.toISOString().split('T')[0])

  const completados = logs?.filter(l => l.completed).length ?? 0
  const total = logs?.length ?? 0

  return {
    gym: total > 0 ? `${completados}/${total}` : 'Sin datos',
    agua: 'sin datos',
    sueno_promedio: 0,
  }
}

async function getFitContext(supabase: SupabaseClient, userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [bodyRes, sessionsRes, healthRes, routinesRes] = await Promise.all([
    supabase
      .from('body_records')
      .select('weight_kg, date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(2),
    supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('date', weekAgo),
    supabase
      .from('health_logs')
      .select('water_ml, sleep_hours')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle(),
    supabase
      .from('workout_routines')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  const pesoActual = bodyRes.data?.[0]?.weight_kg ?? null
  const pesoAnterior = bodyRes.data?.[1]?.weight_kg ?? null
  const tendencia = pesoActual && pesoAnterior
    ? pesoActual > pesoAnterior ? 'subiendo' : pesoActual < pesoAnterior ? 'bajando' : 'estable'
    : 'sin datos'

  return {
    peso_actual:       pesoActual,
    tendencia_peso:    tendencia,
    entrenos_semana:   sessionsRes.data?.length ?? 0,
    agua_hoy_ml:       healthRes.data?.water_ml ?? 0,
    sueno_anoche_h:    healthRes.data?.sleep_hours ?? null,
    rutinas_guardadas: routinesRes.count ?? 0,
  }
}

async function getSaludContext(supabase: SupabaseClient, userId: string) {
  const { data: records } = await supabase
    .from('body_records')
    .select('weight_kg, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(2)

  const ultimoPeso = records?.[0]?.weight_kg ?? null
  const anterior = records?.[1]?.weight_kg ?? null

  let tendencia = 'estable'
  if (ultimoPeso && anterior) {
    if (ultimoPeso < anterior) tendencia = 'bajando'
    else if (ultimoPeso > anterior) tendencia = 'subiendo'
  }

  return { ultimo_peso: ultimoPeso, tendencia_peso: tendencia }
}

async function getMoodContext(supabase: SupabaseClient, userId: string) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: moods } = await supabase
    .from('mood_logs')
    .select('mood')
    .eq('user_id', userId)
    .gte('date', weekAgo.toISOString().split('T')[0])

  if (!moods || moods.length === 0) return 3
  return Math.round(moods.reduce((sum, m) => sum + m.mood, 0) / moods.length)
}

export async function buildUserSnapshot(supabase: SupabaseClient, userId: string): Promise<UserSnapshot> {
  const { data: cached } = await supabase
    .from('user_context_cache')
    .select('snapshot, expires_at')
    .eq('user_id', userId)
    .single()

  if (cached && new Date(cached.expires_at) > new Date()) {
    return cached.snapshot as UserSnapshot
  }

  const [perfil, organizacion, finanzas, comidas, fit, habitos, salud, moodSemana] = await Promise.all([
    getUserProfile(supabase, userId),
    getOrganizacionContext(supabase, userId),
    getFinanzasContext(supabase, userId),
    getComidosContext(supabase, userId),
    getFitContext(supabase, userId),
    getHabitosContext(supabase, userId),
    getSaludContext(supabase, userId),
    getMoodContext(supabase, userId),
  ])

  const now = new Date()
  const semana = `${now.getDate()}-${now.getDate() + 6} ${now.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}`

  const snapshot: UserSnapshot = {
    perfil,
    semana,
    organizacion,
    finanzas,
    comidas,
    fit,
    habitos,
    salud,
    mood_semana: moodSemana,
    objetivos_activos: [],
  }

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 1)

  await supabase.from('user_context_cache').upsert({
    user_id: userId,
    snapshot,
    expires_at: expiresAt.toISOString(),
  })

  return snapshot
}
