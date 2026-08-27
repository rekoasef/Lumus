import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Ruta temporal para verificar `C2`: tira un error a propósito desde producción
 * para confirmar que llega a Sentry y que el evento no trae datos sensibles.
 * El payload de prueba incluye a propósito un monto, una descripción y un mail:
 * si el scrubbing funciona, nada de eso aparece en el evento.
 *
 * Se borra apenas se verifique. Pide sesión igual, para que no la pueda
 * disparar cualquiera desde afuera.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const amount = 128_450.75
  const description = 'Supermercado Coto — compra semanal'
  const email = user.email

  console.error('[sentry-check] disparando error de prueba', { amount, description, email })

  throw new Error('Sentry check: error de prueba disparado a mano desde /api/debug/sentry-check')
}
