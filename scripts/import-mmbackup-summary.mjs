/**
 * Importador resumido MoneyManager -> Lumus.
 *
 * Modo por defecto: preview, sin escribir en Supabase.
 * Confirmado: node scripts/import-mmbackup-summary.mjs --confirm --replace
 *
 * Reglas:
 * - Las transferencias internas no se importan como gastos ni ingresos.
 * - Se agrupa por mes, tipo y categoria.
 * - Se cargan solo importes ARS para no mezclar monedas en reportes ARS.
 * - El wallet historico se neutraliza con un ajuste para no alterar el saldo actual.
 */

import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const DEFAULT_BACKUP_PATH = '/mnt/c/Users/rasef/Downloads/2026_05_19_09_26_40_533215.mmbackup'
const TMP_DIR = '/tmp/lumus-mmbackup-summary'
const DB_PATH = `${TMP_DIR}/MyFinance.db`
const SUMMARY_PREFIX = 'Import MoneyManager'

const args = process.argv.slice(2)
const CONFIRM = args.includes('--confirm')
const REPLACE = args.includes('--replace')
const INCLUDE_TYPES = getArg('--types') ?? 'all'
const BACKUP_PATH = getArg('--backup') ?? DEFAULT_BACKUP_PATH
const TARGET_WALLET_NAME = getArg('--wallet') ?? 'Historico MoneyManager'
const NEUTRALIZE_WALLET = !args.includes('--no-neutralize-wallet')

if (!['all', 'gasto', 'ingreso'].includes(INCLUDE_TYPES)) {
  fail('--types debe ser all, gasto o ingreso')
}

function getArg(name) {
  const exact = args.find(a => a.startsWith(`${name}=`))
  if (exact) return exact.slice(name.length + 1)
  const index = args.indexOf(name)
  if (index >= 0) return args[index + 1]
  return null
}

function fail(message) {
  console.error(`ERROR: ${message}`)
  process.exit(1)
}

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      if (!line || line.trim().startsWith('#')) continue
      const index = line.indexOf('=')
      if (index < 0) continue
      const key = line.slice(0, index).trim()
      const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, '')
      process.env[key] = value
    }
  }
}

function sql(query) {
  const result = spawnSync('sqlite3', [DB_PATH, '-json', query], { encoding: 'utf8' })
  if (result.status !== 0) {
    fail(result.stderr.trim() || 'No se pudo leer la base SQLite')
  }
  if (!result.stdout.trim()) return []
  return JSON.parse(result.stdout)
}

function extractBackup() {
  if (!existsSync(BACKUP_PATH)) fail(`No existe el backup: ${BACKUP_PATH}`)
  rmSync(TMP_DIR, { recursive: true, force: true })
  mkdirSync(TMP_DIR, { recursive: true })

  spawnSync('unzip', ['-o', BACKUP_PATH, 'MyFinance.db', 'backup_meta', '-d', TMP_DIR], {
    encoding: 'utf8',
  })

  if (!existsSync(DB_PATH)) fail('No se pudo extraer MyFinance.db del backup')
}

function androidColorToHex(n) {
  const rgb = (Number(n) >>> 0) & 0xFFFFFF
  return `#${rgb.toString(16).padStart(6, '0')}`
}

function amountToPesos(cents) {
  return Math.abs(Math.round(Number(cents ?? 0)) / 100)
}

function mapType(type) {
  return type === 'Income' ? 'ingreso' : 'gasto'
}

function monthKey(date) {
  return date.slice(0, 7)
}

function monthDate(month) {
  return `${month}-15`
}

function fmt(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function shouldIncludeType(type) {
  return INCLUDE_TYPES === 'all' || INCLUDE_TYPES === type
}

extractBackup()

const accounts = sql('SELECT * FROM account WHERE isRemoved=0')
const categories = sql('SELECT * FROM category WHERE isRemoved=0')
const transactions = sql('SELECT * FROM `transaction` WHERE isRemoved=0')
const links = sql('SELECT * FROM sync_link WHERE isRemoved=0')

const accountByUid = Object.fromEntries(accounts.map(a => [a.uid, a]))
const categoryByUid = Object.fromEntries(categories.map(c => [c.uid, c]))

const txLinks = {}
for (const link of links) {
  if (link.entityType !== 'Transaction') continue
  if (!txLinks[link.entityUid]) txLinks[link.entityUid] = {}
  if (link.otherType === 'Account') txLinks[link.entityUid].accountUid = link.otherUid
  if (link.otherType === 'Category') txLinks[link.entityUid].categoryUid = link.otherUid
}

const groups = new Map()
const skipped = {
  transfer: 0,
  noAccount: 0,
  noCategory: 0,
  foreignCurrency: 0,
  foreignAmount: 0,
  typeFiltered: 0,
}

for (const tx of transactions) {
  const link = txLinks[tx.uid] ?? {}
  const account = accountByUid[link.accountUid]
  const category = categoryByUid[link.categoryUid]

  if (!account) {
    skipped.noAccount++
    continue
  }

  if (!category) {
    skipped.transfer++
    skipped.noCategory++
    continue
  }

  const currency = tx.accountCurrencyCode ?? account.currencyCode ?? 'ARS'
  const cents = tx.amountInAccountCurrency ?? tx.amountInRealCurrency ?? tx.amountInDefaultCurrency ?? 0
  const amount = amountToPesos(cents)
  const type = mapType(tx.type)

  if (!shouldIncludeType(type)) {
    skipped.typeFiltered++
    continue
  }

  if (currency !== 'ARS') {
    skipped.foreignCurrency++
    skipped.foreignAmount += amount
    continue
  }

  const month = monthKey(tx.date)
  const categoryName = category.title?.trim() || 'Sin categoria'
  const categoryColor = androidColorToHex(category.color)
  const key = `${month}|${type}|${categoryName.toLowerCase()}`

  if (!groups.has(key)) {
    groups.set(key, {
      month,
      type,
      categoryName,
      categoryColor,
      sourceCategoryType: mapType(category.type),
      amount: 0,
      count: 0,
    })
  }

  const group = groups.get(key)
  group.amount += amount
  group.count++
}

const summaryRows = Array.from(groups.values())
  .filter(g => g.amount > 0)
  .sort((a, b) => a.month.localeCompare(b.month) || a.type.localeCompare(b.type) || a.categoryName.localeCompare(b.categoryName))

const totals = summaryRows.reduce(
  (acc, row) => {
    acc[row.type] += row.amount
    return acc
  },
  { gasto: 0, ingreso: 0 },
)

const byCategory = summaryRows.reduce((acc, row) => {
  const key = `${row.type}|${row.categoryName}`
  acc[key] = (acc[key] ?? 0) + row.amount
  return acc
}, {})

const months = [...new Set(summaryRows.map(r => r.month))]
const topExpenses = Object.entries(byCategory)
  .filter(([key]) => key.startsWith('gasto|'))
  .map(([key, amount]) => ({ name: key.split('|')[1], amount }))
  .sort((a, b) => b.amount - a.amount)
  .slice(0, 12)

console.log('\nLumus MoneyManager summary import')
console.log('=================================')
console.log(`Backup: ${BACKUP_PATH}`)
console.log(`Modo: ${CONFIRM ? 'confirmado' : 'preview'}`)
console.log(`Replace movimientos contables: ${REPLACE ? 'si' : 'no'}`)
console.log(`Tipos incluidos: ${INCLUDE_TYPES}`)
console.log(`Wallet destino: ${TARGET_WALLET_NAME}`)
console.log(`Meses: ${months[0] ?? '-'} -> ${months.at(-1) ?? '-'} (${months.length})`)
console.log(`Resumenes a crear: ${summaryRows.length}`)
console.log(`Gastos ARS: ${fmt(totals.gasto)}`)
console.log(`Ingresos ARS: ${fmt(totals.ingreso)}`)
console.log(`Transferencias internas excluidas: ${skipped.transfer}`)
console.log(`Movimientos USD excluidos: ${skipped.foreignCurrency} (${fmt(skipped.foreignAmount)})`)
console.log(`Movimientos filtrados por tipo: ${skipped.typeFiltered}`)

console.log('\nTop gastos por categoria:')
for (const item of topExpenses) {
  console.log(`- ${item.name}: ${fmt(item.amount)}`)
}

console.log('\nPrimeros resumenes:')
for (const row of summaryRows.slice(0, 12)) {
  console.log(`- ${row.month} ${row.type} ${row.categoryName}: ${fmt(row.amount)} (${row.count} movimientos)`)
}

if (!CONFIRM) {
  console.log('\nNo se escribio nada. Para ejecutar:')
  console.log('node scripts/import-mmbackup-summary.mjs --confirm --replace')
  process.exit(0)
}

if (!REPLACE) {
  fail('Para escribir, agrega --replace. Esto evita duplicar movimientos por accidente.')
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  fail('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
})

const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
if (usersError || !usersData.users?.length) {
  fail(`No se pudo obtener usuarios: ${usersError?.message ?? 'sin usuarios'}`)
}

const userEmail = process.env.LUMUS_USER_EMAIL
const user = userEmail
  ? usersData.users.find(u => u.email === userEmail)
  : usersData.users[0]

if (!user) fail(`No existe el usuario LUMUS_USER_EMAIL=${userEmail}`)

console.log(`\nUsuario destino: ${user.email} (${user.id})`)

console.log('Soft delete de movimientos contables actuales...')
const { error: deleteError } = await supabase
  .from('transactions')
  .update({ deleted_at: new Date().toISOString() })
  .eq('user_id', user.id)
  .is('deleted_at', null)
  .in('type', ['gasto', 'ingreso', 'transferencia'])

if (deleteError) fail(`No se pudieron borrar movimientos existentes: ${deleteError.message}`)

console.log('Soft delete de ajustes previos del import...')
const { error: importAdjustDeleteError } = await supabase
  .from('transactions')
  .update({ deleted_at: new Date().toISOString() })
  .eq('user_id', user.id)
  .is('deleted_at', null)
  .eq('type', 'ajuste')
  .like('description', `${SUMMARY_PREFIX}%`)

if (importAdjustDeleteError) fail(`No se pudieron borrar ajustes previos: ${importAdjustDeleteError.message}`)

console.log('Buscando o creando wallet historico...')
let { data: targetWallet, error: walletReadError } = await supabase
  .from('wallets')
  .select('id, name')
  .eq('user_id', user.id)
  .eq('name', TARGET_WALLET_NAME)
  .is('deleted_at', null)
  .maybeSingle()

if (walletReadError) fail(`No se pudo buscar wallet: ${walletReadError.message}`)

if (!targetWallet) {
  const { data, error } = await supabase
    .from('wallets')
    .insert({
      user_id: user.id,
      name: TARGET_WALLET_NAME,
      type: 'banco',
      balance: 0,
      currency: 'ARS',
      color: '#7c6dfa',
      icon: null,
      deleted_at: null,
    })
    .select('id, name')
    .single()

  if (error) fail(`No se pudo crear wallet historico: ${error.message}`)
  targetWallet = data
}

console.log('Buscando o creando categorias...')
const { data: existingCategories, error: categoriesReadError } = await supabase
  .from('finance_categories')
  .select('id, name, type')
  .eq('user_id', user.id)

if (categoriesReadError) fail(`No se pudieron leer categorias: ${categoriesReadError.message}`)

const categoryIdByKey = new Map()
for (const cat of existingCategories ?? []) {
  categoryIdByKey.set(`${cat.type}|${cat.name.trim().toLowerCase()}`, cat.id)
}

const categoryDataByKey = new Map()
for (const row of summaryRows) {
  const key = `${row.type}|${row.categoryName.trim().toLowerCase()}`
  if (!categoryDataByKey.has(key)) {
    categoryDataByKey.set(key, {
      user_id: user.id,
      name: row.categoryName,
      type: row.type,
      icon: null,
      color: row.categoryColor,
      is_default: false,
    })
  }
}

const missingCategories = Array.from(categoryDataByKey.entries())
  .filter(([key]) => !categoryIdByKey.has(key))
  .map(([, value]) => value)

if (missingCategories.length > 0) {
  const { data, error } = await supabase
    .from('finance_categories')
    .insert(missingCategories)
    .select('id, name, type')

  if (error) fail(`No se pudieron crear categorias: ${error.message}`)

  for (const cat of data ?? []) {
    categoryIdByKey.set(`${cat.type}|${cat.name.trim().toLowerCase()}`, cat.id)
  }
}

console.log(`Categorias nuevas: ${missingCategories.length}`)
console.log('Insertando resumenes...')

const rowsToInsert = summaryRows.map(row => {
  const categoryKey = `${row.type}|${row.categoryName.trim().toLowerCase()}`
  return {
    user_id: user.id,
    wallet_id: targetWallet.id,
    category_id: categoryIdByKey.get(categoryKey) ?? null,
    type: row.type,
    amount: Math.round(row.amount * 100) / 100,
    description: `${SUMMARY_PREFIX} - ${row.categoryName} - ${row.month} (${row.count} mov.)`,
    date: monthDate(row.month),
    auto_classified: false,
    deleted_at: null,
  }
})

const BATCH_SIZE = 100
let inserted = 0
for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
  const batch = rowsToInsert.slice(i, i + BATCH_SIZE)
  const { error } = await supabase.from('transactions').insert(batch)
  if (error) fail(`Error insertando batch ${i / BATCH_SIZE + 1}: ${error.message}`)
  inserted += batch.length
  process.stdout.write(`Insertados ${inserted}/${rowsToInsert.length}\r`)
}

console.log(`\nResumenes insertados: ${inserted}`)

if (NEUTRALIZE_WALLET) {
  const net = totals.ingreso - totals.gasto
  if (Math.abs(net) > 0.01) {
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      wallet_id: targetWallet.id,
      category_id: null,
      type: 'ajuste',
      amount: Math.round(-net * 100) / 100,
      description: `${SUMMARY_PREFIX} - ajuste de cierre historico`,
      date: monthDate(months.at(-1) ?? new Date().toISOString().slice(0, 7)),
      auto_classified: false,
      deleted_at: null,
    })

    if (error) fail(`No se pudo insertar ajuste neutralizador: ${error.message}`)
    console.log(`Ajuste neutralizador creado: ${fmt(-net)}`)
  }
}

console.log('\nImport resumido completado.')
