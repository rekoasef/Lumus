import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

interface MpPreapprovalStatus {
  id: string
  status: string // 'pending' | 'authorized' | 'paused' | 'cancelled'
  next_payment_date?: string
}

// Formato de x-signature: "ts=1710000000000,v1=<hmac-sha256 hex>"
function parseSignatureHeader(header: string): { ts: string; v1: string } | null {
  const parts = Object.fromEntries(
    header.split(',').map(p => p.trim().split('=').map(s => s.trim()))
  )
  if (!parts.ts || !parts.v1) return null
  return { ts: parts.ts, v1: parts.v1 }
}

// NOTA: formato del manifest tomado de la documentación pública de MP —
// no es 100% consistente entre países/versiones, validar con el simulador
// de webhooks de MP si algún evento real llega con firma inválida.
function isValidSignature(dataId: string, requestId: string, ts: string, v1: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const dataId = url.searchParams.get('data.id')
  const requestId = req.headers.get('x-request-id')
  const signatureHeader = req.headers.get('x-signature')

  if (!dataId || !requestId || !signatureHeader) {
    return NextResponse.json({ error: 'Faltan headers de firma' }, { status: 400 })
  }

  const parsed = parseSignatureHeader(signatureHeader)
  if (!parsed || !isValidSignature(dataId, requestId, parsed.ts, parsed.v1)) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
  }

  // No confiar en el payload del webhook — consultar el estado real a MP.
  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
  })

  if (!mpRes.ok) {
    return NextResponse.json({ error: 'No se pudo consultar el preapproval en MP' }, { status: 502 })
  }

  const preapproval = await mpRes.json() as MpPreapprovalStatus

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('billing_subscriptions')
    .update({
      status: preapproval.status,
      next_payment_date: preapproval.next_payment_date ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('mp_preapproval_id', preapproval.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
