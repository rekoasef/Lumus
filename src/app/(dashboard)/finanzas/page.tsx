import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MovimientosView } from '@/components/modules/finanzas/movimientos-view'
import { getFrequentDefaults, getWalletsAndCategories } from '@/lib/finance/server-data'
import { localDateStr } from '@/lib/utils/format-date'
import type { FinanceCategory, FinanceSummaryRow } from '@/types/finance.types'

/**
 * Adónde va cada `?seccion=` de la época en que Finanzas era una sola pantalla
 * con siete pestañas.
 *
 * No es cortesía: `notifications.link` es una **columna persistida**, y hay
 * filas ya emitidas —y mails ya enviados— apuntando a estas URLs. Borrar el
 * mapeo rompe avisos que el usuario todavía no abrió. Se queda para siempre;
 * cuesta diez líneas.
 */
const LEGACY_SECTIONS: Record<string, string> = {
  transacciones: '/finanzas',
  recurrentes:   '/finanzas/fijos',
  billeteras:    '/finanzas/billeteras',
  categorias:    '/finanzas/categorias',
  presupuestos:  '/finanzas/presupuestos',
  metas:         '/finanzas/metas',
  inversiones:   '/finanzas/inversiones',
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ seccion?: string; nuevo?: string }>
}) {
  const { seccion, nuevo } = await searchParams

  if (seccion) {
    const target = LEGACY_SECTIONS[seccion]
    // `?nuevo=gasto` viaja con el redirect: el acceso directo de la app
    // instalada apunta a `transacciones` y tiene que seguir abriendo el
    // formulario, no solo la pantalla.
    if (target && target !== '/finanzas') redirect(target)
    if (target === '/finanzas') redirect(nuevo ? `/finanzas?nuevo=${nuevo}` : '/finanzas')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = localDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0))

  const [{ wallets, categories }, defaults, summaryRes, lookupRes] = await Promise.all([
    getWalletsAndCategories(user.id),
    getFrequentDefaults(user.id),
    // Totales del mes agregados en SQL — antes salían de filtrar en memoria
    // las últimas 500 transacciones, que con el histórico ya no alcanzaban.
    supabase.rpc('get_finance_summary', { p_from: monthStart, p_to: monthEnd }),
    // Sin filtrar por `deleted_at`: un movimiento viejo de una categoría
    // borrada tiene que seguir mostrando su nombre y su color.
    supabase
      .from('finance_categories')
      .select('id, name, color, icon')
      .eq('user_id', user.id),
  ])

  return (
    <MovimientosView
      initialWallets={wallets}
      initialCategories={categories}
      initialCategoryLookup={(lookupRes.data ?? []) as Pick<FinanceCategory, 'id' | 'name' | 'color' | 'icon'>[]}
      initialMonthSummary={(summaryRes.data ?? []) as unknown as FinanceSummaryRow[]}
      frequentDefaults={defaults}
    />
  )
}
