import { describe, it, expect } from 'vitest'
import { describeAdminAction } from './action-log'

describe('describeAdminAction', () => {
  it('describe una invitación con y sin vencimiento', () => {
    expect(describeAdminAction('invite', 'a@b.com', { access_days: 90 })).toBe('Invitó a a@b.com (90 días)')
    expect(describeAdminAction('invite', 'a@b.com', { access_days: null })).toBe('Invitó a a@b.com (sin vencimiento)')
  })

  it('una extensión muestra el antes y el después', () => {
    const line = describeAdminAction('set_grant', 'a@b.com', {
      had_grant: true,
      previous_expires_at: null,
      expires_at: null,
    })
    expect(line).toBe('Cambió la cortesía de a@b.com: sin vencimiento → sin vencimiento')
  })

  it('aclara cuando la invitación cayó sobre una cuenta que ya existía', () => {
    expect(describeAdminAction('set_grant', 'a@b.com', { via: 'invite_existing_account', expires_at: null }))
      .toBe('Dio cortesía a a@b.com, sin vencimiento (ya tenía cuenta)')
  })

  it('no rompe con details vacíos, raros o de otro tipo', () => {
    expect(describeAdminAction('set_feedback_status', null, 'basura')).toBe('Cambió el estado de un feedback')
    expect(describeAdminAction('revoke_grant', null, [])).toBe('Revocó la cortesía de un usuario')
    expect(describeAdminAction('accion_nueva', null, {})).toBe('accion_nueva')
  })
})
