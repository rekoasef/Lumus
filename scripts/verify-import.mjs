import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

for (const f of ['.env.local', '.env']) {
  if (existsSync(f)) for (const l of readFileSync(f,'utf8').split('\n')) {
    const m = l.match(/^([^#=]+)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g,'')
  }
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws },
})
const { data: { users } } = await sb.auth.admin.listUsers()
const userId = users[0].id

const tx = []
const page = 1000
for (let from = 0; ; from += page) {
  const { data, error } = await sb.from('transactions')
    .select('type, amount, category_id, wallet_id, wallets(currency)')
    .eq('user_id', userId).is('deleted_at', null)
    .order('date', { ascending: true })
    .range(from, from + page - 1)
  if (error) { console.error(error); break }
  if (!data?.length) break
  tx.push(...data)
  console.log(`  fetched ${tx.length} so far...`)
  if (data.length < page) break
}

const totals = { ARS: { gasto: 0, ingreso: 0 }, USD: { gasto: 0, ingreso: 0 } }
let transfers = 0
for (const t of tx) {
  const cur = t.wallets?.currency === 'USD' ? 'USD' : 'ARS'
  if (!t.category_id) { transfers++; continue }
  totals[cur][t.type] += Number(t.amount)
}

console.log(`Total transacciones en DB: ${tx.length}`)
console.log(`├─ Con categoría: ${tx.length - transfers}`)
console.log(`└─ Transferencias: ${transfers}`)
console.log()
console.log(`💸 Gastos ARS:   $${totals.ARS.gasto.toLocaleString('es-AR')}`)
console.log(`💵 Ingresos ARS: $${totals.ARS.ingreso.toLocaleString('es-AR')}`)
console.log(`💸 Gastos USD:   $${totals.USD.gasto.toLocaleString('en-US')}`)
console.log(`💵 Ingresos USD: $${totals.USD.ingreso.toLocaleString('en-US')}`)

const { data: wallets } = await sb.from('wallets').select('name, currency, balance').eq('user_id', userId).is('deleted_at', null).order('name')
console.log('\n📊 Saldos de billeteras:')
for (const w of wallets) {
  console.log(`   ${(w.name || '(sin nombre)').padEnd(20)} ${w.currency}  ${Number(w.balance).toLocaleString('es-AR')}`)
}
