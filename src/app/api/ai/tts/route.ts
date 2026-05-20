import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bodySchema = z.object({
  text: z.string().min(1).max(1000),
  voice: z.enum(['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer']).optional().default('nova'),
})

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { text, voice } = parsed.data

  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice,
    input: text,
    speed: 1.15,
  })

  const buffer = Buffer.from(await mp3.arrayBuffer())

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'no-store',
    },
  })
}
