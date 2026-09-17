import Image from 'next/image'
import Link from 'next/link'
import { Check, Plus } from 'lucide-react'
import { SUBSCRIPTION_PRICE_ARS, SUBSCRIPTION_CURRENCY, TRIAL_DAYS } from '@/lib/billing/plan'
import { SUPPORT_EMAIL } from '@/lib/contact'
import { formatCurrency } from '@/lib/utils/format-currency'
import { LegalLinks } from '@/components/shared/legal-links'
import { LivingOrb } from './living-orb'
import { Reveal } from './reveal'
import { FAQ, FINAL_CTA, FOOTER, PRICING, STEPS } from './landing-copy'

/**
 * Las secciones sin estado propio. Son server components: lo único que se
 * anima adentro es `Reveal` y el orbe, que ya son de cliente.
 */

export function StepsSection() {
  return (
    <section className="px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="lumus-label text-[#cfc6ff]">{STEPS.eyebrow}</p>
          <h2 className="landing-title mt-4 text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">{STEPS.title}</h2>
        </Reveal>

        <div className="relative mt-14">
          <div className="pointer-events-none absolute top-6 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-[var(--accent-lumus)]/40 to-transparent sm:block" aria-hidden />
          <ol className="grid gap-10 sm:grid-cols-3 sm:gap-6">
            {STEPS.items.map((step, i) => (
              <Reveal as="li" key={step.title} delay={0.12 * i} className="relative text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-full border border-[var(--accent-lumus)]/30 bg-[#12111b] text-sm font-semibold text-[var(--accent-lumus)] shadow-[0_0_24px_rgba(157,140,255,0.25)]">
                  {i + 1}
                </span>
                <p className="mt-5 text-lg font-semibold text-[var(--text-primary)]">{step.title}</p>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">{step.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export function PricingSection() {
  const price = formatCurrency(SUBSCRIPTION_PRICE_ARS, SUBSCRIPTION_CURRENCY, 'rounded')

  return (
    <section id="precio" className="scroll-mt-20 px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="lumus-label text-[#cfc6ff]">{PRICING.eyebrow}</p>
          <h2 className="landing-title mt-4 text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">{PRICING.title}</h2>
        </Reveal>

        <Reveal delay={0.15} className="mx-auto mt-12 max-w-md">
          <div className="relative rounded-[30px] bg-gradient-to-b from-[var(--accent-lumus)]/60 via-white/10 to-white/5 p-px shadow-[0_30px_100px_-30px_rgba(124,109,250,0.6)]">
            <div className="rounded-[29px] bg-[#0f0e17] p-7 sm:p-9">
              <div className="flex items-center justify-between">
                <p className="lumus-heading text-lg font-semibold tracking-[0.16em] text-[#e4dfff]">{PRICING.plan.toUpperCase()}</p>
                <span className="rounded-full bg-[var(--accent-muted)] px-3 py-1 text-xs font-semibold text-[var(--accent-lumus)]">
                  {PRICING.trialBadge(TRIAL_DAYS)}
                </span>
              </div>

              <p className="mt-6 flex items-baseline gap-2">
                <span className="landing-display text-5xl font-bold text-[var(--text-primary)] sm:text-6xl">{price}</span>
                <span className="text-sm text-[var(--text-muted)]">{PRICING.perMonth}</span>
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{PRICING.trial}</p>

              <ul className="mt-7 space-y-3">
                {PRICING.includes.map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[var(--text-primary)]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent-lumus)]" strokeWidth={2.5} />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className="mt-8 block rounded-full bg-[var(--accent-lumus)] py-3.5 text-center text-sm font-bold text-[#190f5d] shadow-[0_0_30px_rgba(157,140,255,0.35)] transition-transform active:scale-[0.97]"
              >
                {PRICING.cta}
              </Link>
              <p className="mt-4 text-center text-xs leading-relaxed text-[var(--text-muted)]">{PRICING.fine}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/**
 * Preguntas con `<details>`: se abren y cierran sin JavaScript, con teclado y
 * con lector de pantalla, sin que haya que reinventar nada.
 */
export function FaqSection() {
  return (
    <section className="px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="lumus-label text-[#cfc6ff]">{FAQ.eyebrow}</p>
          <h2 className="landing-title mt-4 text-4xl font-bold text-[var(--text-primary)] sm:text-5xl">{FAQ.title}</h2>
        </Reveal>

        <Reveal delay={0.1} className="landing-faq mt-12 divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {FAQ.items.map(item => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium text-[var(--text-primary)] sm:text-lg">
                {item.q}
                <Plus className="size-5 shrink-0 text-[var(--text-muted)] transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <p className="mt-3 pr-8 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">{item.a}</p>
            </details>
          ))}
        </Reveal>

        <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
          {FAQ.contact}{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-[var(--accent-lumus)] hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-28 sm:pt-24 sm:pb-36">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[36rem] bg-[radial-gradient(ellipse_at_bottom,rgba(124,109,250,0.22),transparent_65%)]" aria-hidden />
      <Reveal className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <LivingOrb size={150} />
        <h2 className="landing-display mt-10 text-4xl font-bold sm:text-6xl">
          <span className="landing-gradient-text">{FINAL_CTA.title}</span>
        </h2>
        <p className="mt-4 text-base text-[var(--text-secondary)] sm:text-lg">{FINAL_CTA.body}</p>
        <Link
          href="/register"
          className="mt-8 rounded-full bg-[var(--text-primary)] px-8 py-3.5 text-sm font-bold text-[#0b0b12] shadow-[0_0_50px_rgba(189,180,255,0.35)] transition-transform active:scale-[0.97]"
        >
          {FINAL_CTA.cta}
        </Link>
      </Reveal>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.06] px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative grid size-8 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
            <Image src="/logoLumus.png" alt="" width={64} height={64} className="h-full w-full scale-[2.7] object-cover opacity-90 mix-blend-screen" />
          </span>
          <div>
            <p className="lumus-heading text-sm font-semibold tracking-[0.16em] text-[#e4dfff]">LUMUS</p>
            <p className="text-xs text-[var(--text-muted)]">{FOOTER.tagline}</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
          <Link href="/login" className="hover:text-[var(--text-primary)]">{FOOTER.login}</Link>
          <Link href="/register" className="hover:text-[var(--text-primary)]">{FOOTER.register}</Link>
        </nav>
      </div>
      <LegalLinks className="mx-auto mt-8 max-w-6xl border-t border-white/[0.04] pt-6" showOwner />
      <p className="mx-auto mt-4 max-w-6xl text-xs text-[var(--text-muted)]">© {new Date().getFullYear()} Lumus · {FOOTER.disclaimer}</p>
    </footer>
  )
}
