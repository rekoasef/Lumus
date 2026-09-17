import type { LegalDocument } from '@/lib/legal/documents'

const LABELS = {
  updated: 'Última actualización:',
} as const

/** Dibuja un documento legal. Texto largo: ancho de lectura y jerarquía clara, nada más. */
export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="lumus-heading text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">{document.title}</h1>
      <p className="mt-2 text-xs text-[var(--text-muted)]">{LABELS.updated} {document.updated}</p>
      <p className="mt-6 text-base leading-relaxed text-[var(--text-secondary)]">{document.intro}</p>

      <div className="mt-10 space-y-9">
        {document.sections.map(section => (
          <section key={section.title}>
            <h2 className="lumus-heading text-lg font-semibold text-[var(--text-primary)]">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {section.paragraphs.map(p => <p key={p}>{p}</p>)}
              {section.bullets && (
                <ul className="list-disc space-y-2 pl-5 marker:text-[var(--accent-lumus)]">
                  {section.bullets.map(b => <li key={b}>{b}</li>)}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </article>
  )
}
