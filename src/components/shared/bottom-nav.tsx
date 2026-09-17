'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Menu, MessageSquarePlus, Plus, UserCircle, X } from 'lucide-react'
import { MOBILE_MORE, MOBILE_PRIMARY, isActiveHref } from '@/lib/nav/destinations'
import { openQuickExpense } from './quick-expense'
import { openFeedback } from './feedback-button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

/**
 * Barra inferior de dos niveles.
 *
 * Doce destinos no entran en una barra: el límite no es de diseño, es el ancho
 * del pulgar. Cinco lugares iguales: dos destinos, el `+` de cargar un gasto en
 * el centro exacto —el lugar más fácil de acertar sin mirar—, un destino y
 * "Más", donde vive el resto. La lista sale de `lib/nav/destinations`, la misma
 * que usa la barra de desktop.
 *
 * Hasta el 2026-09-17 eran seis lugares y el `+` quedaba corrido a la
 * izquierda; los testers además pedían íconos más grandes, que con seis no
 * entraban. Con cinco, cada lugar tiene 72px en una pantalla de 360: íconos de
 * 24 y zonas táctiles de más de 48, el mínimo para acertar con el pulgar.
 */
export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  // Navegar cierra el menú. Sin esto, volver de Metas deja el panel abierto
  // tapando la pantalla a la que se acaba de llegar.
  //
  // Ajuste durante el render y no en un efecto, igual que la sección activa de
  // Finanzas: un efecto pintaría un frame con el panel todavía abierto sobre la
  // pantalla nueva.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    if (moreOpen) setMoreOpen(false)
  }

  // Con el menú abierto el fondo no scrollea: es una hoja a pantalla completa.
  useEffect(() => {
    if (!moreOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [moreOpen])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const moreActive = MOBILE_MORE.some(d => isActiveHref(pathname, d.href))

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#111018] pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
              onClick={e => e.stopPropagation()}
            >
              {/* El relleno de abajo deja lugar a la barra, que queda encima de
                  la hoja: sin él, "Cerrar sesión" quedaba tapado. */}
              <div className="flex items-center justify-between px-5 pb-2 pt-5">
                <h2 className="lumus-heading text-lg font-semibold text-[var(--text-primary)]">
                  Todo
                </h2>
                <button
                  onClick={() => setMoreOpen(false)}
                  aria-label="Cerrar"
                  className="flex size-10 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 px-4 pt-2">
                {MOBILE_MORE.map(({ href, label, icon: Icon }) => {
                  const active = isActiveHref(pathname, href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center text-xs font-medium transition-colors active:scale-[0.97] ${
                        active
                          ? 'border-[var(--accent-lumus)]/30 bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                          : 'border-white/[0.07] bg-white/[0.02] text-[var(--text-secondary)] hover:bg-white/[0.05]'
                      }`}
                    >
                      <Icon size={24} />
                      <span>{label}</span>
                    </Link>
                  )
                })}

                <Link
                  href="/perfil"
                  className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center text-xs font-medium transition-colors active:scale-[0.97] ${
                    pathname === '/perfil'
                      ? 'border-[var(--accent-lumus)]/30 bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                      : 'border-white/[0.07] bg-white/[0.02] text-[var(--text-secondary)] hover:bg-white/[0.05]'
                  }`}
                >
                  <UserCircle size={24} />
                  <span>Perfil</span>
                </Link>
              </div>

              <div className="mx-4 mt-3 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => { setMoreOpen(false); openFeedback() }}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.07] p-4 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/[0.05]"
                >
                  <MessageSquarePlus size={18} />
                  Comentarios
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.07] p-4 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <LogOut size={18} />
                  Cerrar sesión
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-white/[0.075] bg-[#111018]/90 backdrop-blur-2xl safe-area-pb lg:hidden">
        {MOBILE_PRIMARY.slice(0, 2).map(dest => (
          <NavTab key={dest.href} {...dest} active={isActiveHref(pathname, dest.href)} />
        ))}

        {/* El `+` va al centro exacto: es la acción que se repite veinte veces
            por semana y el punto de la barra que el pulgar acierta sin mirar.
            Sobresale de la barra para que se note que es otra cosa. */}
        <div className="flex flex-1 items-start justify-center">
          <button
            onClick={() => openQuickExpense()}
            aria-label="Cargar gasto"
            className="-mt-5 flex size-[60px] items-center justify-center rounded-full text-white ring-[5px] ring-[#0b0b12] transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #9d90ff 0%, #7c6dfa 100%)',
              boxShadow: '0 8px 24px rgba(124,109,250,0.55)',
            }}
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>

        {MOBILE_PRIMARY.slice(2).map(dest => (
          <NavTab key={dest.href} {...dest} active={isActiveHref(pathname, dest.href)} />
        ))}

        <button
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={`flex min-h-[64px] min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors active:scale-95 ${
            moreActive || moreOpen
              ? 'text-[var(--accent-lumus)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Menu size={24} />
          <span>Más</span>
        </button>
      </nav>
    </>
  )
}

function NavTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[64px] min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors active:scale-95 ${
        active ? 'text-[var(--accent-lumus)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
      }`}
    >
      <Icon size={24} />
      <span className="max-w-full truncate px-0.5">{label}</span>
    </Link>
  )
}
