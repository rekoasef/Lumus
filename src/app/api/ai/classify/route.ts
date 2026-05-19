import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bodySchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
})

const CATEGORIES = [
  'comida', 'transporte', 'ocio', 'salud', 'educacion',
  'ropa', 'hogar', 'tecnologia', 'suscripciones', 'otro'
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { description, amount } = parsed.data

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 20,
    messages: [{
      role: 'user',
      content: `Clasificá este gasto en UNA sola categoría de esta lista: ${CATEGORIES.join(', ')}. Devolvé SOLO el nombre de la categoría, sin nada más.\nGasto: "${description}" por $${amount}`,
    }],
  })

  const raw = response.choices[0].message.content?.trim().toLowerCase() ?? 'otro'
  const category = CATEGORIES.includes(raw) ? raw : 'otro'

  return NextResponse.json({ category })
}
