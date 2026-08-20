export type FeedbackKind = 'bug' | 'mejora' | 'otro'
export type FeedbackStatus = 'nuevo' | 'visto' | 'resuelto'

export interface Feedback {
  id: string
  user_id: string | null
  kind: FeedbackKind
  message: string
  path: string | null
  user_agent: string | null
  status: FeedbackStatus
  created_at: string
}
