import {
  BarChart2,
  CreditCard,
  Gauge,
  Goal,
  HandCoins,
  LayoutDashboard,
  LineChart,
  Repeat,
  Tags,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

/**
 * Los destinos de la app, en un solo lugar.
 *
 * Existe por un bug concreto: "Mercado" estaba listado en `top-nav.tsx` y no en
 * `bottom-nav.tsx`, así que era una página entera **invisible desde el
 * teléfono**. Con dos listas escritas a mano eso vuelve a pasar sí o sí. Acá el
 * tier dice cuánto se promociona un destino, y las dos barras derivan de la
 * misma lista: un destino puede estar más escondido en una pantalla que en la
 * otra, pero **no puede ser inalcanzable en ninguna**.
 *
 * El orden es por frecuencia de uso, no por categoría: Movimientos se toca
 * todos los días y Categorías dos veces por año, y hasta hoy pesaban igual.
 */

export type NavTier =
  /** Barra principal en las dos pantallas. */
  | 'primary'
  /** Barra principal solo en desktop, que tiene ancho de sobra. En mobile va al menú. */
  | 'desktop'
  /** Siempre dentro del menú "Más". */
  | 'more'

export interface NavDestination {
  href: string
  label: string
  icon: LucideIcon
  tier: NavTier
}

export const NAV_DESTINATIONS: readonly NavDestination[] = [
  // Panel no va en la barra de mobile por espacio, y no queda huérfano: el logo
  // del header —visible en las dos pantallas— linkea al dashboard.
  { href: '/dashboard',              label: 'Panel',        icon: LayoutDashboard, tier: 'desktop' },
  { href: '/finanzas',               label: 'Gastos',       icon: Wallet,          tier: 'primary' },
  { href: '/finanzas/billeteras',    label: 'Billeteras',   icon: CreditCard,      tier: 'primary' },
  // En mobile va al menú desde el 2026-09-17: la barra quedó en cuatro destinos
  // más el `+`, para que el `+` caiga justo en el centro.
  { href: '/finanzas/inversiones',   label: 'Inversiones',  icon: TrendingUp,      tier: 'desktop' },
  { href: '/finanzas/reportes',      label: 'Reportes',     icon: BarChart2,       tier: 'primary' },
  { href: '/finanzas/fijos',         label: 'Fijos',        icon: Repeat,          tier: 'more' },
  { href: '/finanzas/prestamos',     label: 'Préstamos',    icon: HandCoins,       tier: 'more' },
  { href: '/finanzas/presupuestos',  label: 'Presupuestos', icon: Gauge,           tier: 'more' },
  { href: '/finanzas/metas',         label: 'Metas',        icon: Goal,            tier: 'more' },
  { href: '/finanzas/mercado',       label: 'Mercado',      icon: LineChart,       tier: 'more' },
  { href: '/finanzas/categorias',    label: 'Categorías',   icon: Tags,            tier: 'more' },
]

/** Lo que se ve directo en la barra de desktop. */
export const DESKTOP_PRIMARY = NAV_DESTINATIONS.filter(d => d.tier !== 'more')

/** Lo que se ve directo en la barra de mobile — el resto entra por "Más". */
export const MOBILE_PRIMARY = NAV_DESTINATIONS.filter(d => d.tier === 'primary')

export const DESKTOP_MORE = NAV_DESTINATIONS.filter(d => d.tier === 'more')

export const MOBILE_MORE = NAV_DESTINATIONS.filter(d => d.tier !== 'primary')

/**
 * `/finanzas` es prefijo de todas las rutas de finanzas, así que un
 * `startsWith` lo dejaría marcado como activo estando en Metas. Solo las rutas
 * con hijos propios usan prefijo.
 */
export function isActiveHref(pathname: string, href: string): boolean {
  if (pathname === href) return true
  const hasOwnChildren = href !== '/dashboard' && href !== '/finanzas'
  return hasOwnChildren && pathname.startsWith(`${href}/`)
}
