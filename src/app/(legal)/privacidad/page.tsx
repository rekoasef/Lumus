import type { Metadata } from 'next'
import { LegalDocumentView } from '@/components/modules/legal/legal-document-view'
import { PRIVACY } from '@/lib/legal/documents'

export const metadata: Metadata = { title: `${PRIVACY.title} — Lumus` }

export default function PrivacidadPage() {
  return <LegalDocumentView document={PRIVACY} />
}
