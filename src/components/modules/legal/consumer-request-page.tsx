import Link from 'next/link'
import type { ConsumerRequestKind } from '@/lib/legal/consumer-requests'
import { LEGAL_PATHS } from '@/lib/legal/owner'
import { ConsumerRequestForm } from './consumer-request-form'

export interface ConsumerRequestCopy {
  eyebrow: string
  title: string
  intro: string
  points: readonly string[]
  other: { label: string; href: string; text: string }
}

const LABELS = {
  terms: 'Ver los términos',
} as const

/** El esqueleto común de los dos botones: qué pasa, y el formulario. */
export function ConsumerRequestPage({ kind, copy }: { kind: ConsumerRequestKind; copy: ConsumerRequestCopy }) {
  return (
    <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[1fr_minmax(0,24rem)] lg:gap-14">
      <div>
        <p className="lumus-label text-[0.65rem] text-[var(--accent-lumus)]">{copy.eyebrow}</p>
        <h1 className="lumus-heading mt-3 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">{copy.intro}</p>

        <ol className="mt-8 space-y-4">
          {copy.points.map((point, i) => (
            <li key={point} className="flex gap-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              <span className="grid size-6 shrink-0 place-items-center rounded-full border border-white/10 font-mono text-[0.7rem] text-[var(--text-muted)]">
                {i + 1}
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-sm text-[var(--text-muted)]">
          {copy.other.text}{' '}
          <Link href={copy.other.href} className="text-[var(--accent-lumus)] hover:underline">{copy.other.label}</Link>
          {' · '}
          <Link href={LEGAL_PATHS.terms} className="text-[var(--accent-lumus)] hover:underline">{LABELS.terms}</Link>
        </p>
      </div>

      <div className="lumus-glass h-fit rounded-3xl p-6 sm:p-7">
        <ConsumerRequestForm kind={kind} />
      </div>
    </div>
  )
}
