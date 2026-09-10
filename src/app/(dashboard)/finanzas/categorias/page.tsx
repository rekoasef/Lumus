import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CategoryList } from '@/components/modules/finanzas/category-list'
import { FinanzasPageHeader, FinanzasPageShell } from '@/components/modules/finanzas/finanzas-page-header'
import { getWalletsAndCategories } from '@/lib/finance/server-data'

export default async function CategoriasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { categories } = await getWalletsAndCategories(user.id)

  return (
    <FinanzasPageShell>
      <FinanzasPageHeader
        title="Categorías"
        description="Cómo se agrupan tus gastos e ingresos."
      />
      <section className="lumus-glass rounded-2xl p-4 sm:p-6">
        <CategoryList initialCategories={categories} />
      </section>
    </FinanzasPageShell>
  )
}
