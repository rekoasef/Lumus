import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

for (const f of ['.env.local', '.env']) {
  if (existsSync(f)) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
})

const { data: { users } } = await sb.auth.admin.listUsers()
const userId = users[0].id
console.log(`Limpiando datos finance del usuario ${users[0].email}...`)

const t = await sb.from('transactions').delete().eq('user_id', userId)
const w = await sb.from('wallets').delete().eq('user_id', userId)
const c = await sb.from('finance_categories').delete().eq('user_id', userId)

console.log('transactions:', t.error?.message || 'OK')
console.log('wallets:',      w.error?.message || 'OK')
console.log('categories:',   c.error?.message || 'OK')
