import { describe, expect, it } from 'vitest'
import { accessNoticePhase, selectAccessEndingNotices } from './access-ending'

const NOW = new Date('2026-09-16T11:00:00Z')
const EMAIL = 'soporte@example.com'

describe('accessNoticePhase', () => {
  it('avisa a 5, 2 y 0 días, con ventanas por si el cron no corrió un día', () => {
    expect(accessNoticePhase(6, false)).toBeNull()
    expect(accessNoticePhase(5, false)).toBe('faltan5')
    expect(accessNoticePhase(3, false)).toBe('faltan5')
    expect(accessNoticePhase(2, false)).toBe('faltan2')
    expect(accessNoticePhase(1, false)).toBe('faltan2')
    expect(accessNoticePhase(0, false)).toBe('hoy')
  })

  it('si ya venció, avisa que terminó solo los primeros días', () => {
    // Venció hoy a la madrugada: ya no es "termina hoy".
    expect(accessNoticePhase(0, true)).toBe('termino')
    expect(accessNoticePhase(-2, true)).toBe('termino')
    expect(accessNoticePhase(-3, true)).toBeNull()
  })
})

describe('selectAccessEndingNotices', () => {
  const grant = (userId: string, expiresAt: string) => ({ user_id: userId, expires_at: expiresAt })

  it('no le avisa a quien ya se suscribió', () => {
    const notices = selectAccessEndingNotices(
      [grant('a', '2026-09-18T15:00:00Z'), grant('b', '2026-09-18T15:00:00Z')],
      new Set(['a']),
      NOW,
      true,
      EMAIL,
    )
    expect(notices.map(n => n.userId)).toEqual(['b'])
  })

  it('arma el texto y la clave con la fecha de vencimiento', () => {
    const [notice] = selectAccessEndingNotices([grant('a', '2026-09-18T15:00:00Z')], new Set(), NOW, true, EMAIL)
    expect(notice).toMatchObject({
      type: 'acceso_por_vencer',
      title: 'Tu acceso gratis a Lumus termina en 2 días',
      link: '/suscripcion',
      dedupeKey: 'acceso:2026-09-18:faltan2',
    })
    expect(notice.body).toContain('18 de septiembre')
    expect(notice.body).toContain('Suscribite')
  })

  it('con el cobro apagado manda a escribir, no a pagar', () => {
    const [notice] = selectAccessEndingNotices([grant('a', '2026-09-16T20:00:00Z')], new Set(), NOW, false, EMAIL)
    expect(notice.title).toBe('Tu acceso gratis a Lumus termina hoy')
    expect(notice.body).toContain(EMAIL)
    expect(notice.body).not.toContain('Suscribite')
  })

  it('avisa que terminó sin repetir la fecha', () => {
    const [notice] = selectAccessEndingNotices([grant('a', '2026-09-15T15:00:00Z')], new Set(), NOW, true, EMAIL)
    expect(notice.title).toBe('Tu acceso gratis a Lumus terminó')
    expect(notice.dedupeKey).toBe('acceso:2026-09-15:termino')
  })
})
