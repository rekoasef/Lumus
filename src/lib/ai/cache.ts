import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export function generateCacheKey(userId: string, module: string, message: string): string {
  const raw = `${userId}:${module}:${message.toLowerCase().trim()}`
  return createHash('sha256').update(raw).digest('hex')
}

export async function getCachedResponse(
  supabase: SupabaseClient,
  userId: string,
  cacheKey: string
): Promise<string | null> {
  const { data } = await supabase
    .from('ai_cache')
    .select('response')
    .eq('user_id', userId)
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single()

  return data?.response ?? null
}

export async function setCachedResponse(
  supabase: SupabaseClient,
  userId: string,
  cacheKey: string,
  module: string,
  response: string,
  modelUsed: string,
  ttlHours = 24
): Promise<void> {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + ttlHours)

  await supabase.from('ai_cache').upsert({
    user_id: userId,
    cache_key: cacheKey,
    module,
    response,
    model_used: modelUsed,
    expires_at: expiresAt.toISOString(),
  })
}
