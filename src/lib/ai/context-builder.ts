import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserSnapshot } from '@/types'
import type { RecurringRepeatType } from '@/types/finance.types'

async function getUserProfile(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('name, birth_date, occupation, monthly_salary')
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
    ocupacion: profile?.occupation ?? null,
    ingreso_mensual: profile?.monthly_salary ?? null,
    resumen_vida: summary?.content ?? '',
  }
}

function normalizeMonthlyAmount(amount: number, repeatType: RecurringRepeatType) {
  if (repeatType === 'daily') return amount * 30
  if (repeatType === 'weekly') return amount * (52 / 12)
  return amount
}

async function getFinanzasContext(supabase: SupabaseClient, userId: string) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const primerDiaMes = `${year}-${String(month).padStart(2, '0')}-01`
  const ultimoDiaMes = new Date(year, month, 0).toISOString().slice(0, 10)
  const diasParaFinMes = new Date(year, month, 0).getDate() - now.getDate()

  const [walletsRes, txRes, presupuestosRes, recurrentesRes, metasRes] = await Promise.all([
    supabase
      .from('wallets')
      .select('name, balance, currency')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('amount, type, category:finance_categories(name)')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('date', primerDiaMes)
      .lte('date', ultimoDiaMes),
    supabase
      .from('budgets')
      .select('amount, category_id')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year),
    supabase
      .from('recurring_transactions')
      .select('description, amount, type, repeat_type, next_date')
      .eq('user_id', userId)
      .eq('active', true)
      .order('next_date', { ascending: true }),
    supabase
      .from('saving_goals')
      .select('name, target_amount, current_amount')
      .eq('user_id', userId)
      .eq('achieved', false),
  ])

  type TxRow = {
    amount: number
    type: string
    category: { name: string } | null
  }

  const wallets = (walletsRes.data ?? []).map(w => ({
    nombre: w.name,
    saldo: Number(w.balance ?? 0),
    moneda: w.currency ?? 'ARS',
  }))

  const saldoARS = wallets
    .filter(w => w.moneda === 'ARS')
    .reduce((sum, wallet) => sum + wallet.saldo, 0)

  const transactions = (txRes.data ?? []) as unknown as TxRow[]
  const gastos = transactions.filter(t => t.type === 'gasto')
  const ingresos = transactions.filter(t => t.type === 'ingreso')
  const gastadoMes = gastos.reduce((sum, t) => sum + Number(t.amount), 0)
  const ingresadoMes = ingresos.reduce((sum, t) => sum + Number(t.amount), 0)

  const byCat: Record<string, number> = {}
  for (const gasto of gastos) {
    const name = gasto.category?.name ?? 'Sin categoría'
    byCat[name] = (byCat[name] ?? 0) + Number(gasto.amount)
  }
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]
  const categoriaTopGasto = topCat
    ? `${topCat[0]} (${Math.round(topCat[1]).toLocaleString('es-AR')} ARS)`
    : 'Sin datos'

  const presupuestoTotal = (presupuestosRes.data ?? []).reduce((sum, b) => sum + Number(b.amount), 0)
  const presupuestoUsadoPct = presupuestoTotal > 0
    ? Math.round((gastadoMes / presupuestoTotal) * 100)
    : 0

  const totalRecurrentes = Math.round(
    (recurrentesRes.data ?? []).reduce((sum, rec) => {
      const amount = normalizeMonthlyAmount(Number(rec.amount), rec.repeat_type as RecurringRepeatType)
      return rec.type === 'gasto' ? sum + amount : sum
    }, 0)
  )

  const proximosRecurrentes = (recurrentesRes.data ?? [])
    .slice(0, 5)
    .map(rec => ({
      nombre: rec.description ?? (rec.type === 'gasto' ? 'Gasto fijo' : 'Ingreso fijo'),
      monto: Number(rec.amount),
      tipo: rec.type as 'gasto' | 'ingreso',
      fecha: rec.next_date,
    }))

  const metasActivas = (metasRes.data ?? []).map(m => ({
    nombre: m.name,
    progreso_pct: m.target_amount > 0
      ? Math.round((Number(m.current_amount) / Number(m.target_amount)) * 100)
      : 0,
  }))

  return {
    saldo_ars: saldoARS,
    billeteras: wallets,
    gastado_mes: gastadoMes,
    ingresado_mes: ingresadoMes,
    balance_mes: ingresadoMes - gastadoMes,
    presupuesto_mes: presupuestoTotal,
    presupuesto_usado_pct: presupuestoUsadoPct,
    categoria_top_gasto: categoriaTopGasto,
    dias_para_fin_mes: diasParaFinMes,
    total_recurrentes_mes: totalRecurrentes,
    proximos_recurrentes: proximosRecurrentes,
    metas_activas: metasActivas,
  }
}

function isFreshFinanceSnapshot(value: unknown): value is UserSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Partial<UserSnapshot>
  return typeof snapshot.finanzas?.saldo_ars === 'number'
}

export async function buildUserSnapshot(supabase: SupabaseClient, userId: string): Promise<UserSnapshot> {
  const { data: cached } = await supabase
    .from('user_context_cache')
    .select('snapshot, expires_at')
    .eq('user_id', userId)
    .single()

  if (cached && new Date(cached.expires_at) > new Date() && isFreshFinanceSnapshot(cached.snapshot)) {
    return cached.snapshot
  }

  const [perfil, finanzas] = await Promise.all([
    getUserProfile(supabase, userId),
    getFinanzasContext(supabase, userId),
  ])

  const now = new Date()
  const semana = `${now.getDate()}-${now.getDate() + 6} ${now.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}`

  const snapshot: UserSnapshot = {
    perfil,
    semana,
    finanzas,
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
