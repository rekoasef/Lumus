import { describe, it, expect } from 'vitest'
import { isAdmin, parseAdminIds } from './access'

const OWNER = 'd1656422-9c7e-49f5-9b13-941f937409b8'
const TESTER = 'c6803ae4-3886-4b85-818d-fcbfec50cfe1'

describe('isAdmin', () => {
  it('sin la variable configurada no hay admin', () => {
    // El caso que importa: un deploy sin ADMIN_USER_IDS cierra el panel, no lo abre.
    expect(isAdmin(OWNER, undefined)).toBe(false)
    expect(isAdmin(OWNER, '')).toBe(false)
  })

  it('reconoce al admin y a nadie más', () => {
    expect(isAdmin(OWNER, OWNER)).toBe(true)
    expect(isAdmin(TESTER, OWNER)).toBe(false)
  })

  it('tolera espacios, mayúsculas y comas de sobra', () => {
    expect(isAdmin(OWNER, ` ${OWNER.toUpperCase()} ,, ${TESTER} ,`)).toBe(true)
    expect(isAdmin(TESTER, ` ${OWNER.toUpperCase()} ,, ${TESTER} ,`)).toBe(true)
  })

  it('una entrada vacía no convierte en admin a un id vacío', () => {
    expect(parseAdminIds(' , ,').size).toBe(0)
    expect(isAdmin('', ',')).toBe(false)
  })
})
