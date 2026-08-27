/**
 * Siembra `exchange_rate_history` con el histórico del dólar blue.
 *
 * bluelytics publica la evolución diaria desde 2011. Sin esto, la historia de
 * cotizaciones empezaría el día que se deployó y la app no podría decir nada
 * sobre los movimientos que el usuario ya tiene cargados — que son justamente
 * los que valen la pena mirar.
 *
 * Es idempotente: hace upsert por fecha, así que correrlo dos veces no duplica
 * ni pisa el euro de las filas que ya lo tienen.
 *
 * Uso: node scripts/seed-exchange-rates.mjs
 */
import fs from 'node:fs'

const EVOLUTION_URL = 'https://api.bluelytics.com.ar/v2/evolution.json'
const CHUNK = 500

function readEnv(name) {
  const line = fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .find(l => l.startsWith(`${name}=`))
  if (!line) throw new Error(`Falta ${name} en .env.local`)
  return line.slice(name.length + 1).trim()
}

// Se le pega a PostgREST con `fetch` y no con `@supabase/supabase-js`: el
// cliente levanta Realtime al construirse, que en Node 20 necesita WebSocket
// nativo. El script no usa nada de eso.
const SUPABASE_URL = readEnv('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_KEY = readEnv('SUPABASE_SERVICE_ROLE_KEY')

async function upsert(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/exchange_rate_history?on_conflict=date`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      // `ignore-duplicates` para no pisar el euro de las filas que el cron ya cargó.
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })

  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
}

console.log('Bajando la evolución del blue...')
const res = await fetch(EVOLUTION_URL)
if (!res.ok) throw new Error(`bluelytics respondió ${res.status}`)

const raw = await res.json()

// El endpoint mezcla oficial y blue en la misma lista. Solo interesa el blue:
// es el que la app usa en vivo, y mezclar los dos daría saltos falsos.
const rows = raw
  .filter(r => r.source === 'Blue' && r.value_buy > 0 && r.value_sell > 0)
  .map(r => ({
    date: r.date,
    // Promedio compra/venta, igual que el valor en vivo de exchange-rates.ts.
    usd: Math.round(((r.value_buy + r.value_sell) / 2) * 100) / 100,
    source: 'bluelytics-historico',
  }))

// Por si el endpoint devuelve una fecha dos veces: la última gana.
const byDate = new Map(rows.map(r => [r.date, r]))
const unique = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))

console.log(`${unique.length} días, de ${unique[0].date} a ${unique[unique.length - 1].date}`)

let inserted = 0
for (let i = 0; i < unique.length; i += CHUNK) {
  const chunk = unique.slice(i, i + CHUNK)
  await upsert(chunk)
  inserted += chunk.length
  process.stdout.write(`\r  ${inserted}/${unique.length}`)
}

console.log('\nListo.')
