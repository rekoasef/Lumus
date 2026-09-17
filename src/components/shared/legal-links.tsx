import Link from 'next/link'
import { LEGAL_OWNER, LEGAL_PATHS } from '@/lib/legal/owner'

const LABELS = {
  terms: 'Términos y condiciones',
  privacy: 'Privacidad',
  withdrawal: 'Botón de arrepentimiento',
  cancellation: 'Botón de baja del servicio',
  support: 'Soporte',
  consumer: 'Defensa de las y los consumidores. Para reclamos ingrese aquí',
} as const

/** El formulario oficial de reclamos (Ventanilla Única Federal). */
const CONSUMER_CLAIMS_URL = 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario'

/**
 * Los links que la ley pide a la vista: términos, privacidad y los dos
 * botones (Ley 24.240, Disposición 954/2025). Van en la landing, en el login y
 * en el perfil. Es un solo componente para que ningún pie se quede sin uno.
 */
export function LegalLinks({ className = '', showOwner = false }: { className?: string; showOwner?: boolean }) {
  const linkClass = 'py-1 transition-colors hover:text-[var(--text-primary)]'

  return (
    <div className={className}>
      <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--text-muted)]">
        <Link href={LEGAL_PATHS.withdrawal} className={`${linkClass} font-medium text-[var(--text-secondary)]`}>{LABELS.withdrawal}</Link>
        <Link href={LEGAL_PATHS.cancellation} className={`${linkClass} font-medium text-[var(--text-secondary)]`}>{LABELS.cancellation}</Link>
        <Link href={LEGAL_PATHS.terms} className={linkClass}>{LABELS.terms}</Link>
        <Link href={LEGAL_PATHS.privacy} className={linkClass}>{LABELS.privacy}</Link>
        <a href={`mailto:${LEGAL_OWNER.email}`} className={linkClass}>{LABELS.support}: {LEGAL_OWNER.email}</a>
        <a href={CONSUMER_CLAIMS_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>{LABELS.consumer}</a>
      </nav>
      {showOwner && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          {LEGAL_OWNER.name} · CUIT {LEGAL_OWNER.cuit} · {LEGAL_OWNER.address}
        </p>
      )}
    </div>
  )
}
