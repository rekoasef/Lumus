/**
 * Importador de backup MoneyManager → Lumus
 * Uso: node scripts/import-mmbackup.mjs [--confirm]
 *
 * Sin --confirm: muestra preview solamente.
 * Con --confirm: inserta todo en Supabase.
 */

import { spawnSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

// ─── Config ──────────────────────────────────────────────────────────────────

const BACKUP_PATH = '/mnt/c/Users/rasef/Downloads/2026_05_19_09_26_40_533215.mmbackup'
const TMP_DIR     = '/tmp/mmbackup'
const DB_PATH     = `${TMP_DIR}/MyFinance.db`
const CONFIRM     = process.argv.includes('--confirm')

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadEnv() {
  const files = ['.env.local', '.env']
  for (const f of files) {
    if (existsSync(f)) {
      const lines = readFileSync(f, 'utf8').split('\n')
      for (const line of lines) {
        const m = line.match(/^([^#=]+)=(.*)$/)
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
      }
    }
  }
}

function sql(query) {
  const r = spawnSync('sqlite3', [DB_PATH, '-json', query], { encoding: 'utf8' })
  if (!r.stdout.trim()) return []
  return JSON.parse(r.stdout)
}

function androidColorToHex(n) {
  const rgb = (n >>> 0) & 0xFFFFFF
  return '#' + rgb.toString(16).padStart(6, '0')
}

function amountToPesos(cents) {
  return Math.round(cents) / 100
}

function mapType(type) {
  return type === 'Income' ? 'ingreso' : 'gasto'
}

// ─── Extraer ZIP ─────────────────────────────────────────────────────────────

console.log('📦 Extrayendo backup...')
spawnSync('unzip', ['-o', BACKUP_PATH, 'MyFinance.db', '-d', TMP_DIR], { encoding: 'utf8' })

if (!existsSync(DB_PATH)) {
  console.error('❌ No se pudo extraer MyFinance.db')
  process.exit(1)
}

// ─── Leer datos ──────────────────────────────────────────────────────────────

const accounts    = sql('SELECT * FROM account WHERE isRemoved=0')
const categories  = sql('SELECT * FROM category WHERE isRemoved=0')
const transactions = sql('SELECT * FROM `transaction` WHERE isRemoved=0')
const links       = sql('SELECT * FROM sync_link WHERE isRemoved=0')

// Construir mapa de relaciones: transactionUid → { accountUid, categoryUid }
const txLinks = {}
for (const l of links) {
  if (l.entityType !== 'Transaction') continue
  if (!txLinks[l.entityUid]) txLinks[l.entityUid] = {}
  if (l.otherType === 'Account')  txLinks[l.entityUid].accountUid  = l.otherUid
  if (l.otherType === 'Category') txLinks[l.entityUid].categoryUid = l.otherUid
}

// ─── Mapear wallets ──────────────────────────────────────────────────────────

const walletMap = {} // uid_original → { data }

const mappedWallets = accounts.map(a => {
  const wallet = {
    _original_uid: a.uid,
    name:     a.title,
    type:     a.currencyCode === 'USD' ? 'virtual' : 'banco',
    balance:  0, // el trigger lo recalcula al importar transacciones
    currency: a.currencyCode ?? 'ARS',
    color:    androidColorToHex(a.color),
    icon:     null,
  }
  return wallet
})

// ─── Mapear categorías ───────────────────────────────────────────────────────

const mappedCategories = categories.map(c => ({
  _original_uid: c.uid,
  name:          c.title,
  type:          mapType(c.type),
  icon:          null,
  color:         androidColorToHex(c.color),
  is_default:    false,
}))

// ─── Mapear transacciones ────────────────────────────────────────────────────
// Reglas:
//  - Las transacciones SIN categoría son transferencias internas (movimientos entre
//    cuentas del usuario). Se importan para preservar el saldo de cada billetera,
//    pero NO se cuentan en totales de gastos/ingresos.
//  - Se usa amountInAccountCurrency (no amountInDefaultCurrency) para conservar la
//    moneda nativa de cada cuenta. Las cuentas USD venían en 0 con el campo viejo.

const txWithoutAccount = []
const mappedTransactions = []

for (const t of transactions) {
  const link = txLinks[t.uid] ?? {}
  if (!link.accountUid) {
    txWithoutAccount.push(t.uid)
    continue
  }

  // Preferimos el monto en la moneda nativa de la cuenta. Algunas tx tienen ese
  // campo en NULL (bug del backup), entonces caemos a realCurrency, y por último
  // a defaultCurrency (ya convertido a ARS).
  const cents = t.amountInAccountCurrency ?? t.amountInRealCurrency ?? t.amountInDefaultCurrency ?? 0

  mappedTransactions.push({
    _original_uid:    t.uid,
    _original_account: link.accountUid,
    _original_category: link.categoryUid ?? null,
    _is_transfer:     !link.categoryUid,
    type:             mapType(t.type),
    amount:           amountToPesos(cents),
    description:      t.comment || null,
    date:             t.date.slice(0, 10),
    auto_classified:  false,
  })
}

// ─── Preview ─────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════')
console.log('  PREVIEW DEL IMPORT')
console.log('══════════════════════════════════════════')
console.log(`\n✅ Billeteras a importar (${mappedWallets.length}):`)
for (const w of mappedWallets) {
  console.log(`   ${w.color}  ${w.name} (${w.currency}) [${w.type}]`)
}

console.log(`\n✅ Categorías a importar (${mappedCategories.length}):`)
const byType = { ingreso: [], gasto: [] }
for (const c of mappedCategories) byType[c.type].push(c.name)
console.log(`   Gastos (${byType.gasto.length}): ${byType.gasto.slice(0, 8).join(', ')}${byType.gasto.length > 8 ? '...' : ''}`)
console.log(`   Ingresos (${byType.ingreso.length}): ${byType.ingreso.join(', ')}`)

const transfers = mappedTransactions.filter(t => t._is_transfer)
const realTx    = mappedTransactions.filter(t => !t._is_transfer)

console.log(`\n✅ Transacciones a importar: ${mappedTransactions.length}`)
console.log(`   ├─ ${realTx.length} con categoría (gastos/ingresos reales)`)
console.log(`   └─ ${transfers.length} transferencias internas (sin categoría — no suman a totales)`)
if (txWithoutAccount.length > 0) {
  console.log(`   ⚠️  ${txWithoutAccount.length} transacciones sin cuenta → se omitirán`)
}

console.log('\n📋 Muestra de transacciones (primeras 8):')
console.log('   TIPO      MONTO        FECHA       DESCRIPCIÓN')
console.log('   ' + '─'.repeat(60))
for (const t of mappedTransactions.slice(0, 8)) {
  const tipo  = t.type.padEnd(9)
  const monto = `$${t.amount.toLocaleString('es-AR')}`.padStart(12)
  const desc  = (t.description || '(sin descripción)').slice(0, 25)
  console.log(`   ${tipo} ${monto}   ${t.date}   ${desc}`)
}

// Totales reales (sin transferencias), separados por moneda
const accCurrency = Object.fromEntries(accounts.map(a => [a.uid, a.currencyCode || 'ARS']))
const totals = { ARS: { gasto: 0, ingreso: 0 }, USD: { gasto: 0, ingreso: 0 } }
for (const t of realTx) {
  const cur = accCurrency[t._original_account] === 'USD' ? 'USD' : 'ARS'
  totals[cur][t.type] += t.amount
}
console.log(`\n   💸 Gastos ARS:   $${totals.ARS.gasto.toLocaleString('es-AR')}`)
console.log(`   💵 Ingresos ARS: $${totals.ARS.ingreso.toLocaleString('es-AR')}`)
if (totals.USD.gasto || totals.USD.ingreso) {
  console.log(`   💸 Gastos USD:   $${totals.USD.gasto.toLocaleString('en-US')}`)
  console.log(`   💵 Ingresos USD: $${totals.USD.ingreso.toLocaleString('en-US')}`)
}

if (!CONFIRM) {
  console.log('\n══════════════════════════════════════════')
  console.log('  Para importar, ejecutá:')
  console.log('  node scripts/import-mmbackup.mjs --confirm')
  console.log('══════════════════════════════════════════\n')
  process.exit(0)
}

// ─── Insertar en Supabase ─────────────────────────────────────────────────────

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
})

// Encontrar el usuario
const { data: { users }, error: usersErr } = await supabase.auth.admin.listUsers()
if (usersErr || !users?.length) {
  console.error('❌ No se pudo obtener la lista de usuarios:', usersErr?.message)
  process.exit(1)
}

if (users.length > 1) {
  console.log('Usuarios encontrados:')
  users.forEach((u, i) => console.log(`  [${i}] ${u.email} (${u.id})`))
  console.log('\nSolo hay soporte para 1 usuario por ahora. Usando el primero.')
}

const userId = users[0].id
console.log(`\n👤 Importando para: ${users[0].email} (${userId})`)

// 1. Insertar billeteras
console.log('\n📥 Insertando billeteras...')
const walletIdMap = {} // uid_original → new uuid

for (const w of mappedWallets) {
  const { _original_uid, ...walletData } = w
  const { data, error } = await supabase
    .from('wallets')
    .insert({ ...walletData, user_id: userId, deleted_at: null })
    .select('id')
    .single()

  if (error) {
    console.error(`   ❌ Error al insertar wallet "${w.name}":`, error.message)
    continue
  }
  walletIdMap[_original_uid] = data.id
  console.log(`   ✅ ${w.name} → ${data.id}`)
}

// 2. Seed categorías default (si no las tiene aún) — la RPC puede no existir, lo ignoramos
console.log('\n📥 Seedeando categorías default...')
try {
  const { error } = await supabase.rpc('seed_default_finance_categories', { p_user_id: userId })
  if (error) console.log(`   ℹ️  Seed default skip: ${error.message}`)
} catch (e) {
  console.log(`   ℹ️  Seed default skip: ${e.message}`)
}

// 3. Insertar categorías custom del backup
console.log('\n📥 Insertando categorías...')
const categoryIdMap = {} // uid_original → new uuid

for (const c of mappedCategories) {
  const { _original_uid, ...catData } = c
  const { data, error } = await supabase
    .from('finance_categories')
    .insert({ ...catData, user_id: userId })
    .select('id')
    .single()

  if (error) {
    console.error(`   ❌ Error al insertar categoría "${c.name}":`, error.message)
    continue
  }
  categoryIdMap[_original_uid] = data.id
}
console.log(`   ✅ ${Object.keys(categoryIdMap).length} categorías insertadas`)

// 4. Insertar transacciones en batches de 50
console.log('\n📥 Insertando transacciones...')
const BATCH = 50
let inserted = 0
let failed = 0

for (let i = 0; i < mappedTransactions.length; i += BATCH) {
  const batch = mappedTransactions.slice(i, i + BATCH)
  const rows = []

  for (const t of batch) {
    const walletId = walletIdMap[t._original_account]
    if (!walletId) { failed++; continue }

    rows.push({
      user_id:         userId,
      wallet_id:       walletId,
      category_id:     t._original_category ? (categoryIdMap[t._original_category] ?? null) : null,
      type:            t.type,
      amount:          t.amount,
      description:     t.description,
      date:            t.date,
      auto_classified: false,
      deleted_at:      null,
    })
  }

  if (!rows.length) continue

  const { error } = await supabase.from('transactions').insert(rows)
  if (error) {
    console.error(`   ❌ Error en batch ${i / BATCH + 1}:`, error.message)
    failed += rows.length
  } else {
    inserted += rows.length
    process.stdout.write(`   ⏳ ${inserted}/${mappedTransactions.length} transacciones...\r`)
  }
}

console.log(`\n   ✅ ${inserted} transacciones insertadas`)
if (failed > 0) console.log(`   ⚠️  ${failed} fallaron`)

console.log('\n══════════════════════════════════════════')
console.log('  ✅ IMPORT COMPLETADO')
console.log(`  Billeteras: ${Object.keys(walletIdMap).length}`)
console.log(`  Categorías: ${Object.keys(categoryIdMap).length}`)
console.log(`  Transacciones: ${inserted}`)
console.log('══════════════════════════════════════════\n')
