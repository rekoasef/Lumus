import type { Metadata } from 'next'
import { LegalDocumentView } from '@/components/modules/legal/legal-document-view'
import { TERMS } from '@/lib/legal/documents'

export const metadata: Metadata = { title: `${TERMS.title} — Lumus` }

export default function TerminosPage() {
  return <LegalDocumentView document={TERMS} />
}
