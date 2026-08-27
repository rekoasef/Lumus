import { describe, it, expect } from 'vitest'
import { channelsFor, indexPreferences, preferenceKey, isNotificationType, allChannelsFor } from './preferences'

const USER = 'user-1'

describe('channelsFor', () => {
  it('sin fila devuelve el default del tipo', () => {
    const empty = new Map()

    expect(channelsFor(empty, USER, 'vencimiento')).toEqual({ inApp: true, email: true })
  })

  it('el resumen semanal arranca apagado sin sembrarle una fila a nadie', () => {
    expect(channelsFor(new Map(), USER, 'resumen_semanal')).toEqual({ inApp: false, email: false })
  })

  it('la fila explícita gana sobre el default', () => {
    const prefs = new Map([[preferenceKey(USER, 'vencimiento'), { inApp: true, email: false }]])

    expect(channelsFor(prefs, USER, 'vencimiento')).toEqual({ inApp: true, email: false })
  })

  it('no mezcla las preferencias de dos usuarios', () => {
    const prefs = new Map([[preferenceKey('otro', 'vencimiento'), { inApp: false, email: false }]])

    expect(channelsFor(prefs, USER, 'vencimiento')).toEqual({ inApp: true, email: true })
  })
})

describe('indexPreferences', () => {
  it('arma el mapa desde las filas de la base', () => {
    const map = indexPreferences([
      { user_id: USER, type: 'vencimiento', in_app_enabled: false, email_enabled: true },
    ])

    expect(map.get(preferenceKey(USER, 'vencimiento'))).toEqual({ inApp: false, email: true })
  })

  it('ignora un tipo que el código no conoce', () => {
    // Puede pasar si la base va adelante del deploy: mejor caer al default que
    // romper el feed entero.
    const map = indexPreferences([
      { user_id: USER, type: 'tipo_del_futuro', in_app_enabled: false, email_enabled: false },
    ])

    expect(map.size).toBe(0)
  })
})

describe('allChannelsFor', () => {
  it('devuelve los seis tipos con defaults aplicados', () => {
    const all = allChannelsFor(new Map(), USER)

    expect(Object.keys(all)).toHaveLength(6)
    expect(all.vencimiento.email).toBe(true)
    expect(all.resumen_semanal.email).toBe(false)
  })
})

describe('isNotificationType', () => {
  it('reconoce los tipos válidos y descarta el resto', () => {
    expect(isNotificationType('meta_alcanzada')).toBe(true)
    expect(isNotificationType('cualquier_cosa')).toBe(false)
  })
})
