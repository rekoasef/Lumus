#!/usr/bin/env node
/**
 * Backup manual y cifrado de la base de Lumus.
 *
 * El plan free de Supabase no tiene backups de ningun tipo, asi que este
 * script es la unica red de contencion que existe. Se corre a mano una vez
 * por semana (`npm run backup`) y deja un archivo cifrado listo para subir
 * a Google Drive.
 *
 * Que respalda:
 *   - schema + datos de `public` (billeteras, transacciones, categorias...)
 *   - datos de `auth` (usuarios). Sin esto, la restauracion deja filas que
 *     apuntan a user_ids inexistentes: datos que no le sirven a nadie.
 *
 * Ver docs/BACKUP.md para el procedimiento de restauracion.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// Destino por defecto: carpeta del usuario en Windows, para poder abrirla en
// el Explorador y arrastrar el archivo a Drive sin pasar por \\wsl$\...
const DEFAULT_BACKUP_DIR = '/mnt/c/Users/rasef/Lumus-Backups'

// Host del pooler. La conexion directa (db.<ref>.supabase.co) es solo IPv6 en
// el plan free y no rutea desde WSL2 — por eso vamos por el pooler.
const DEFAULT_DB_HOST = 'aws-1-us-east-1.pooler.supabase.com'
const DB_PORT = '5432'

// ── Helpers ────────────────────────────────────────────────────────────────

const log = (msg) => console.log(msg)
const fail = (msg) => { console.error(`\n  ERROR: ${msg}\n`); process.exit(1) }

/** Lee .env.local sin dependencias externas. */
function loadEnv() {
  const path = join(ROOT, '.env.local')
  if (!existsSync(path)) fail('No existe .env.local')
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

/** Cuenta las filas de cada bloque COPY del dump. */
function countCopyRows(sql) {
  const counts = {}
  let table = null
  let rows = 0
  for (const line of sql.split('\n')) {
    if (table === null) {
      const m = line.match(/^COPY (\S+) .* FROM stdin;$/)
      if (m) { table = m[1]; rows = 0 }
    } else if (line === '\\.') {
      counts[table] = rows
      table = null
    } else {
      rows++
    }
  }
  return counts
}

// ── 1. Configuracion ───────────────────────────────────────────────────────

const env = loadEnv()
const ref = env.SUPABASE_PROJECT_REF
const dbPassword = env.SUPABASE_DB_PASSWORD
const passphrase = env.LUMUS_BACKUP_PASSPHRASE
const backupDir = env.LUMUS_BACKUP_DIR || DEFAULT_BACKUP_DIR
const dbHost = env.SUPABASE_DB_HOST || DEFAULT_DB_HOST

if (!ref) fail('Falta SUPABASE_PROJECT_REF en .env.local')
if (!dbPassword) fail('Falta SUPABASE_DB_PASSWORD en .env.local')
if (!passphrase) {
  fail(
    'Falta LUMUS_BACKUP_PASSPHRASE en .env.local.\n' +
    '  Es la clave con la que se cifra el backup. Generala con:\n' +
    "    echo \"LUMUS_BACKUP_PASSPHRASE=$(openssl rand -base64 32)\" >> .env.local\n" +
    '  y guardala en el gestor de contrasenas: sin ella los backups no se pueden abrir.'
  )
}

const pgEnv = { ...process.env, PGPASSWORD: dbPassword }
const pgArgs = ['-h', dbHost, '-p', DB_PORT, '-U', `postgres.${ref}`, '-d', 'postgres']

const date = new Date().toISOString().slice(0, 10)
const plainPath = join(backupDir, `lumus-${date}.sql`)
const encPath = `${plainPath}.enc`

log(`\n  Backup de Lumus — ${date}`)
log(`  Origen : ${dbHost}`)
log(`  Destino: ${encPath}\n`)

mkdirSync(backupDir, { recursive: true })

// ── 2. Conteo de filas en produccion (para verificar el dump despues) ──────

log('  Contando filas en produccion...')

const countQuery = `
  select table_name || '=' || (xpath('/row/c/text()', query_to_xml(
           format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
  order by table_name;
`
const liveResult = spawnSync('psql', [...pgArgs, '-t', '-A', '-c', countQuery], { env: pgEnv, encoding: 'utf8' })
if (liveResult.status !== 0) fail(`No se pudo conectar a la base:\n${liveResult.stderr}`)

const liveCounts = {}
for (const line of liveResult.stdout.split('\n')) {
  const [t, c] = line.trim().split('=')
  if (t && c !== undefined) liveCounts[`public.${t}`] = Number(c)
}

for (const t of ['users', 'identities']) {
  liveCounts[`auth.${t}`] = Number(
    spawnSync('psql', [...pgArgs, '-t', '-A', '-c', `select count(*) from auth.${t}`], { env: pgEnv, encoding: 'utf8' })
      .stdout.trim()
  )
}

// ── 3. Dumps ───────────────────────────────────────────────────────────────

const tmpPublic = join(backupDir, `.tmp-public-${date}.sql`)
const tmpAuth = join(backupDir, `.tmp-auth-${date}.sql`)

const cleanup = () => { for (const f of [tmpPublic, tmpAuth]) if (existsSync(f)) rmSync(f) }

try {
  log('  Dumpeando schema public (estructura + datos)...')
  execFileSync('pg_dump', [...pgArgs, '--schema=public', '--no-owner', '--no-privileges', '-f', tmpPublic],
    { env: pgEnv, stdio: ['ignore', 'inherit', 'inherit'] })

  // Solo datos, y solo de las tablas que hacen falta para que los usuarios
  // vuelvan a existir. El DDL del schema `auth` lo maneja GoTrue: recrearlo a
  // mano rompe mas de lo que arregla. Y dumpear el schema entero traeria
  // `auth.schema_migrations` e `instances`, que ya vienen pobladas en
  // cualquier proyecto nuevo y chocarian por clave primaria al restaurar.
  log('  Dumpeando datos de auth (usuarios e identidades)...')
  execFileSync('pg_dump', [...pgArgs, '--data-only', '--no-owner', '--no-privileges',
    '--table=auth.users', '--table=auth.identities', '-f', tmpAuth],
    { env: pgEnv, stdio: ['ignore', 'inherit', 'inherit'] })

  const header = [
    `-- Backup de Lumus — ${new Date().toISOString()}`,
    `-- Proyecto Supabase: ${ref}`,
    '-- Contiene: datos de auth.users/auth.identities y el schema public',
    '-- (estructura + datos), en ese orden.',
    '--',
    '-- El orden importa: las tablas de public tienen FK contra auth.users, asi',
    '-- que los usuarios tienen que existir antes de insertar sus datos.',
    '--',
    '-- Restauracion: ver docs/BACKUP.md',
    '', '',
  ].join('\n')

  // pg_dump emite `CREATE SCHEMA public;` a secas, que falla en cualquier base
  // donde `public` ya exista — o sea, en todas, incluido un proyecto Supabase
  // recien creado. Sin esto la restauracion se corta en la primera linea util.
  const publicSql = readFileSync(tmpPublic, 'utf8')
    .replace(/^CREATE SCHEMA public;$/m, 'CREATE SCHEMA IF NOT EXISTS public;')
  const authSql = readFileSync(tmpAuth, 'utf8')
  writeFileSync(
    plainPath,
    header +
    '-- ===== 1) USUARIOS (auth) =====\n\n' + authSql +
    '\n\n-- ===== 2) SCHEMA PUBLIC (estructura + datos) =====\n\n' + publicSql
  )
} finally {
  cleanup()
}

// ── 4. Verificacion: el dump tiene que coincidir con produccion ────────────

log('  Verificando el dump contra produccion...\n')

const dumpSql = readFileSync(plainPath, 'utf8')
const dumpCounts = countCopyRows(dumpSql)
const problems = []

for (const [table, expected] of Object.entries(liveCounts)) {
  const got = dumpCounts[table] ?? 0
  const ok = got === expected
  if (!ok) problems.push(`${table}: produccion tiene ${expected} filas, el dump ${got}`)
  log(`    ${ok ? 'ok  ' : 'FALLA'} ${table.padEnd(34)} ${String(got).padStart(6)} filas`)
}

const policies = (dumpSql.match(/CREATE POLICY/g) || []).length
const functions = (dumpSql.match(/CREATE FUNCTION/g) || []).length
log(`\n    policies: ${policies} | functions: ${functions}`)

if (policies === 0) problems.push('El dump no tiene ninguna policy de RLS')
if (liveCounts['auth.users'] === 0) problems.push('auth.users vino vacio')

if (problems.length) {
  rmSync(plainPath)
  fail(`El backup no quedo integro, no se genero el archivo:\n  - ${problems.join('\n  - ')}`)
}

// ── 5. Cifrado ─────────────────────────────────────────────────────────────

log('\n  Cifrando...')

const enc = spawnSync('openssl', [
  'enc', '-aes-256-cbc', '-pbkdf2', '-iter', '600000', '-salt',
  '-in', plainPath, '-out', encPath, '-pass', 'env:LUMUS_BACKUP_PASSPHRASE',
], { env: { ...process.env, LUMUS_BACKUP_PASSPHRASE: passphrase }, encoding: 'utf8' })

if (enc.status !== 0) {
  rmSync(plainPath)
  fail(`Fallo el cifrado:\n${enc.stderr}`)
}

// El .sql sin cifrar no puede quedar en una carpeta que se sincroniza a la nube.
rmSync(plainPath)

const size = statSync(encPath).size
if (size < 1024) fail(`El archivo cifrado quedo en ${size} bytes — algo salio mal`)

log(`\n  Listo: ${encPath} (${humanSize(size)})`)
log('\n  Ultimo paso, a mano: abri la carpeta en el Explorador de Windows')
log('  y subi el archivo a la carpeta de Google Drive.\n')
