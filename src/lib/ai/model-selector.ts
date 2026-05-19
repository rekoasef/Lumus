import type { AITask } from '@/types'

export function selectModel(task: AITask): string {
  const claudeTasks: AITask[] = ['chat', 'summary', 'analysis']
  return claudeTasks.includes(task) ? 'claude-sonnet-4-5' : 'gpt-4o-mini'
}
