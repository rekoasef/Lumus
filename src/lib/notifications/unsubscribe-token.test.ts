import { describe, it, expect, beforeAll } from 'vitest'
import { createUnsubscribeToken, readUnsubscribeToken } from './unsubscribe-token'

beforeAll(() => {
  process.env.NOTIFICATIONS_UNSUBSCRIBE_SECRET = 'secreto-de-prueba-no-usar-en-produccion'
})

const USER_ID = '9f8b7c6d-1234-4a5b-8c9d-0e1f2a3b4c5d'

describe('token de baja', () => {
  it('lo que firma se puede volver a leer', () => {
    expect(readUnsubscribeToken(createUnsubscribeToken(USER_ID))).toBe(USER_ID)
  })

  it('rechaza un token con la firma cambiada', () => {
    const token = createUnsubscribeToken(USER_ID)
    const tampered = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`

    expect(readUnsubscribeToken(tampered)).toBeNull()
  })

  it('rechaza que alguien cambie el user_id y se lleve la firma ajena', () => {
    // Sin esto, cualquiera con su propio link daría de baja a otro usuario.
    const token = createUnsubscribeToken(USER_ID)
    const signature = token.slice(token.lastIndexOf('.') + 1)

    expect(readUnsubscribeToken(`otro-usuario.${signature}`)).toBeNull()
  })

  it('rechaza basura y tokens sin firma', () => {
    expect(readUnsubscribeToken('')).toBeNull()
    expect(readUnsubscribeToken(USER_ID)).toBeNull()
    expect(readUnsubscribeToken(`.${USER_ID}`)).toBeNull()
  })

  it('firma distinto con otro secreto', () => {
    const token = createUnsubscribeToken(USER_ID)
    process.env.NOTIFICATIONS_UNSUBSCRIBE_SECRET = 'otro-secreto-distinto'

    expect(readUnsubscribeToken(token)).toBeNull()

    process.env.NOTIFICATIONS_UNSUBSCRIBE_SECRET = 'secreto-de-prueba-no-usar-en-produccion'
  })
})
