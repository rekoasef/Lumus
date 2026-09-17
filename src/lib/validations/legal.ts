import { z } from 'zod'
import { CONSUMER_REQUEST_KINDS } from '@/lib/legal/consumer-requests'

export const consumerRequestSchema = z.object({
  kind: z.enum(CONSUMER_REQUEST_KINDS),
  email: z.email('Ingresá un mail válido').max(320),
  reason: z.string().trim().max(1000).nullable().optional(),
  // Trampa para bots: un campo que una persona no ve y no completa.
  website: z.string().max(0, 'Datos inválidos').optional(),
})

export const confirmConsumerRequestSchema = z.object({
  token: z.string().min(20).max(200),
})

export const acceptTermsSchema = z.object({
  version: z.string().min(1).max(40),
})

export type ConsumerRequestInput = z.infer<typeof consumerRequestSchema>
