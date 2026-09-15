import { Database, Mail, MessageSquareWarning, Sparkles, type LucideIcon } from 'lucide-react'
import { RESEND_DAILY_EMAIL_LIMIT, SUPABASE_FREE_DB_BYTES, usageRatio } from '@/lib/admin/metrics'
import type { AdminPlatformStats } from '@/types/admin.types'

const BYTES_PER_MB = 1024 * 1024

interface Gauge {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  /** Sin tope no hay barra: las llamadas a la IA no tienen un límite contra el cual medirse. */
  ratio?: number
}

function barColor(ratio: number): string {
  if (ratio >= 0.9) return 'var(--danger)'
  if (ratio >= 0.7) return 'var(--warning)'
  return 'var(--success)'
}

export function AdminPlatformHealth({ platform }: { platform: AdminPlatformStats }) {
  const gauges: Gauge[] = [
    {
      label: 'Mails hoy',
      value: `${platform.emailsToday}/${RESEND_DAILY_EMAIL_LIMIT}`,
      detail: 'Digest y avisos de feedback. No cuenta los códigos de verificación ni los de recuperar contraseña, que salen por el mismo Resend.',
      icon: Mail,
      ratio: usageRatio(platform.emailsToday, RESEND_DAILY_EMAIL_LIMIT),
    },
    {
      label: 'Base de datos',
      value: `${(platform.dbBytes / BYTES_PER_MB).toFixed(1)} MB`,
      detail: `De ${SUPABASE_FREE_DB_BYTES / BYTES_PER_MB} MB del plan free de Supabase.`,
      icon: Database,
      ratio: usageRatio(platform.dbBytes, SUPABASE_FREE_DB_BYTES),
    },
    {
      label: 'IA este mes',
      value: String(platform.aiCallsMonth),
      detail: 'Reportes y análisis de patrimonio generados o rehechos. Aproximado.',
      icon: Sparkles,
    },
    {
      label: 'Feedback sin resolver',
      value: String(platform.feedbackOpen),
      detail: platform.feedbackOpen === 0 ? 'Bandeja al día.' : 'Ver la bandeja más abajo.',
      icon: MessageSquareWarning,
    },
  ]

  return (
    <section className="lumus-glass rounded-3xl p-5 sm:p-7">
      <p className="lumus-label text-[0.6rem] text-[var(--text-muted)]">Plataforma</p>
      <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Costos y límites</h2>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2">
        {gauges.map(({ label, value, detail, icon: Icon, ratio }) => (
          <li key={label}>
            <div className="flex items-center gap-2">
              <Icon size={14} className="text-[var(--text-muted)]" />
              <p className="lumus-label text-[0.56rem] text-[var(--text-muted)]">{label}</p>
            </div>
            <p className="mt-2 text-lg font-bold tabular-nums text-[var(--text-primary)]">{value}</p>
            {ratio !== undefined && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 2 : 0)}%`, backgroundColor: barColor(ratio) }}
                />
              </div>
            )}
            <p className="mt-2 text-[0.66rem] leading-snug text-[var(--text-muted)]">{detail}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
