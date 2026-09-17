'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Plus, UserCircle } from 'lucide-react'
import { LumusOrbIcon } from '@/components/lumus/lumus-orb'
import { NotificationBell } from '@/components/modules/notifications/notification-bell'
import { createClient } from '@/lib/supabase/client'
import { DESKTOP_MORE, DESKTOP_PRIMARY, isActiveHref } from '@/lib/nav/destinations'
import { openQuickExpense } from './quick-expense'

/**
 * `unreadNotifications` llega del server component del layout y no de un fetch acá:
 * el badge no puede pegarle a la base en cada render del nav.
 *
 * Los destinos salen de `lib/nav/destinations`, la misma lista que usa la barra
 * inferior. Desktop promociona más items porque tiene ancho, pero **nada queda
 * fuera de alcance en ninguna de las dos**: lo que no entra acá vive en "Más".
 */
export function TopNav({ unreadNotifications = 0 }: { unreadNotifications?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  // Ajuste durante el render y no en un efecto: un efecto dejaría el menú
  // abierto un frame sobre la pantalla a la que se acaba de navegar.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    if (moreOpen) setMoreOpen(false)
  }

  useEffect(() => {
    if (!moreOpen) return
    function onPointerDown(e: MouseEvent) {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [moreOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const moreActive = DESKTOP_MORE.some(d => isActiveHref(pathname, d.href))

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 h-16"
      style={{
        background: 'rgba(13,13,20,0.82)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="flex h-full items-center gap-4 px-5 xl:px-8">

        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2.5 mr-2"
          aria-label="Lumus — Inicio"
        >
          <LumusOrbIcon size={28} />
          <span
            className="hidden text-base font-bold tracking-wide text-[#d9d2ff] sm:block"
            style={{ fontFamily: 'var(--font-geist-sans)', letterSpacing: '0.06em' }}
          >
            LUMUS
          </span>
        </Link>

        {/* Divider */}
        <div className="hidden h-5 w-px bg-white/10 md:block shrink-0" />

        {/* Nav items */}
        <nav className="hidden md:flex items-center flex-1 min-w-0">
          <div className="flex items-center gap-0.5">
            {DESKTOP_PRIMARY.map(({ href, label, icon: Icon }) => {
              const active = isActiveHref(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={`group relative flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition-all duration-150 whitespace-nowrap ${
                    active
                      ? 'bg-white/[0.08] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <Icon size={14} />
                  {/* Label: visible on xl+, hidden on md-xl */}
                  <span className="hidden xl:block text-[0.72rem] font-medium">
                    {label}
                  </span>
                  {/* Active indicator */}
                  {active && (
                    <span
                      className="absolute inset-x-2 bottom-0 h-px rounded-full"
                      style={{ background: '#7c6dfa', boxShadow: '0 0 8px rgba(124,109,250,0.8)' }}
                    />
                  )}
                  {/* Tooltip on md (icon-only mode) */}
                  <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#1d1b28] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] opacity-0 shadow-xl transition-opacity xl:hidden group-hover:opacity-100">
                    {label}
                  </span>
                </Link>
              )
            })}

            {/* Más */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(o => !o)}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                className={`relative flex items-center gap-1 rounded-lg px-2.5 py-2 transition-all duration-150 whitespace-nowrap ${
                  moreActive || moreOpen
                    ? 'bg-white/[0.08] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-[var(--text-secondary)]'
                }`}
              >
                <span className="text-[0.72rem] font-medium">Más</span>
                <ChevronDown size={13} className={moreOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                {moreActive && (
                  <span
                    className="absolute inset-x-2 bottom-0 h-px rounded-full"
                    style={{ background: '#7c6dfa', boxShadow: '0 0 8px rgba(124,109,250,0.8)' }}
                  />
                )}
              </button>

              {moreOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#1d1b28] py-1 shadow-2xl"
                >
                  {DESKTOP_MORE.map(({ href, label, icon: Icon }) => {
                    const active = isActiveHref(pathname, href)
                    return (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-[0.78rem] transition-colors ${
                          active
                            ? 'bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                            : 'text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Icon size={15} />
                        {label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* El equivalente del `+` de la barra inferior: cargar un gasto no
              puede depender de en qué pantalla estás. Debajo de `lg` ya está
              el de la barra, y dos botones iguales en la misma pantalla confunden. */}
          <button
            onClick={() => openQuickExpense()}
            title="Cargar gasto"
            className="hidden items-center lg:flex gap-1.5 rounded-lg bg-[var(--accent-lumus)] px-2.5 py-2 text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span className="hidden text-[0.72rem] font-semibold lg:block">Nuevo gasto</span>
          </button>

          <NotificationBell initialUnread={unreadNotifications} />

          <Link
            href="/perfil"
            title="Perfil"
            className={`flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[var(--text-muted)] transition-colors hover:bg-white/[0.05] lg:h-auto lg:min-w-0 lg:py-2 hover:text-[var(--text-secondary)] ${
              pathname === '/perfil' ? 'text-[var(--text-primary)] bg-white/[0.08]' : ''
            }`}
          >
            <UserCircle size={16} />
            <span className="hidden xl:block text-[0.72rem] font-medium">Perfil</span>
          </Link>

          {/* En el celular cerrar sesión está en "Más": acá quedaba pegado a
              Perfil y era fácil tocarlo sin querer. */}
          <div className="hidden h-5 w-px bg-white/10 lg:block" />

          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="hidden items-center lg:flex gap-1.5 rounded-lg px-2.5 py-2 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={14} />
            <span className="hidden xl:block text-[0.72rem] font-medium">Salir</span>
          </button>
        </div>

      </div>
    </header>
  )
}
