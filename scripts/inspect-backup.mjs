import { spawnSync } from 'child_process'

const db = '/tmp/mmbackup/MyFinance.db'
const q = (sql) => {
  const r = spawnSync('sqlite3', [db, '-json', sql], { encoding: 'utf8' })
  if (!r.stdout.trim()) return []
  return JSON.parse(r.stdout)
}

// ¿Cuántas transacciones tienen MÁS de un link de Account?
const dupes = q(`
  SELECT entityUid, COUNT(*) as cnt
  FROM sync_link
  WHERE entityType='Transaction' AND otherType='Account' AND isRemoved=0
  GROUP BY entityUid
  HAVING COUNT(*) > 1
  LIMIT 5
`)
console.log(`\nTransacciones con >1 Account link: ${dupes.length > 0 ? 'SÍ hay duplicados' : 'no hay duplicados'}`)
if (dupes.length) {
  // Ver un ejemplo
  const ex = dupes[0]
  const links = q(`SELECT * FROM sync_link WHERE entityUid='${ex.entityUid}' AND otherType='Account'`)
  console.log('Ejemplo:', JSON.stringify(links, null, 2))
}

// ¿Qué cuenta es "main"?
const mainAcc = q(`SELECT * FROM account WHERE uid='main'`)
console.log('\nCuenta "main" en tabla account:', mainAcc.length ? JSON.stringify(mainAcc[0]) : 'NO EXISTE (cuenta eliminada/default)')

// Contar transacciones que van a "main"
const mainCount = q(`SELECT COUNT(*) as cnt, SUM(t.amountInDefaultCurrency)/100.0 as total FROM \`transaction\` t JOIN sync_link sl ON sl.entityUid=t.uid AND sl.otherType='Account' AND sl.otherUid='main' AND sl.isRemoved=0 WHERE t.isRemoved=0`)
console.log('Transacciones en "main":', JSON.stringify(mainCount[0]))

// Totales CORRECTOS: solo cuentas que existen + deduplificados con ROW_NUMBER
const correct = q(`
  SELECT
    a.title    AS cuenta,
    a.currencyCode AS moneda,
    t.type     AS tipo,
    COUNT(*)   AS cantidad,
    SUM(CASE WHEN a.currencyCode='ARS' THEN t.amountInDefaultCurrency / 100.0 ELSE 0 END) AS pesos,
    SUM(CASE WHEN a.currencyCode!='ARS' THEN t.amountInRealCurrency / 100.0 ELSE 0 END)   AS divisa
  FROM \`transaction\` t
  JOIN (
    SELECT entityUid, MIN(otherUid) AS otherUid
    FROM sync_link
    WHERE entityType='Transaction' AND otherType='Account' AND isRemoved=0
    GROUP BY entityUid
  ) sl ON sl.entityUid = t.uid
  JOIN account a ON a.uid = sl.otherUid AND a.isRemoved=0
  WHERE t.isRemoved=0
  GROUP BY a.uid, t.type
  ORDER BY a.title, t.type
`)

console.log('\n=== TOTALES CORRECTOS (sin duplicados, ARS en pesos, divisas en su moneda) ===')
console.log('Cuenta'.padEnd(16), 'Moneda', 'Tipo     ', 'Cant', 'ARS'.padStart(16), 'Divisa'.padStart(16))
console.log('─'.repeat(75))
for (const r of correct) {
  console.log(
    r.cuenta.padEnd(16),
    r.moneda.padEnd(7),
    r.tipo.padEnd(10),
    String(r.cantidad).padStart(4),
    String((r.pesos || 0).toLocaleString('es-AR')).padStart(16),
    r.divisa ? String(r.divisa.toLocaleString('es-AR') + ' ' + r.moneda).padStart(16) : ''.padStart(16),
  )
}

const tGastosARS   = correct.filter(r=>r.tipo==='Expense').reduce((s,r)=>s+(r.pesos||0),0)
const tIngresosARS = correct.filter(r=>r.tipo==='Income').reduce((s,r)=>s+(r.pesos||0),0)
const tGastosUSD   = correct.filter(r=>r.tipo==='Expense' && r.moneda!=='ARS').reduce((s,r)=>s+(r.divisa||0),0)
const tIngresosUSD = correct.filter(r=>r.tipo==='Income' && r.moneda!=='ARS').reduce((s,r)=>s+(r.divisa||0),0)

console.log(`\nTOTAL gastos   ARS: $${tGastosARS.toLocaleString('es-AR')}`)
console.log(`TOTAL ingresos ARS: $${tIngresosARS.toLocaleString('es-AR')}`)
console.log(`TOTAL gastos   USD: $${tGastosUSD.toLocaleString('en-US')} USD`)
console.log(`TOTAL ingresos USD: $${tIngresosUSD.toLocaleString('en-US')} USD`)
