/**
 * Quién es admin de Lumus.
 *
 * Una variable de entorno y no una columna en `user_profiles`: la policy de esa
 * tabla deja que cada usuario edite su fila, así que un `is_admin` ahí sería
 * hacerse admin desde la consola del navegador — la misma trampa que `B3` evitó
 * con `free_access_grants`. Una env var no se puede auto-otorgar.
 *
 * `ADMIN_USER_IDS` lleva uuids separados por coma. Es server-only: sin
 * `NEXT_PUBLIC_`, nunca llega al navegador.
 */
export function parseAdminIds(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map(id => id.trim().toLowerCase())
      .filter(id => id.length > 0),
  )
}

export function isAdmin(userId: string, raw: string | undefined = process.env.ADMIN_USER_IDS): boolean {
  return parseAdminIds(raw).has(userId.toLowerCase())
}
