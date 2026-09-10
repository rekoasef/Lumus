'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Menu, Plus, UserCircle, X } from 'lucide-react'
import { MOBILE_MORE, MOBILE_PRIMARY, isActiveHref } from '@/lib/nav/destinations'
import { openQuickExpense } from './quick-expense'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

/**
 * Barra inferior de dos niveles.
 *
 * Doce destinos no entran en una barra: el límite no es de diseño, es el ancho
 * del pulgar. Quedan a la vista los cuatro que se miran seguido, el `+` de
 * cargar un gasto ocupa el centro —que es el lugar más fácil de acertar sin
 * mirar— y el resto vive en "Más". La lista sale de `lib/nav/destinations`, la
 * misma que usa la barra de desktop.
 *
 * Seis slots es el techo: en una pantalla de 360px cada uno queda en 60, que es
 * lo mínimo para un ícono con su etiqueta debajo. Panel no entra por eso, y no
 * queda huérfano porque el logo del header linkea al dashboard.
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
              className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#111018] pb-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 pb-2 pt-5">
                <h2 className="lumus-heading text-lg font-semibold text-[var(--text-primary)]">
                  Todo
                </h2>
                <button
                  onClick={() => setMoreOpen(false)}
                  aria-label="Cerrar"
                  className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 px-4 pt-2">
                {MOBILE_MORE.map(({ href, label, icon: Icon }) => {
                  const active = isActiveHref(pathname, href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center text-[0.7rem] font-medium transition-colors ${
                        active
                          ? 'border-[var(--accent-lumus)]/30 bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                          : 'border-white/[0.07] bg-white/[0.02] text-[var(--text-secondary)] hover:bg-white/[0.05]'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{label}</span>
                    </Link>
                  )
                })}

                <Link
                  href="/perfil"
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center text-[0.7rem] font-medium transition-colors ${
                    pathname === '/perfil'
                      ? 'border-[var(--accent-lumus)]/30 bg-[var(--accent-muted)] text-[var(--accent-lumus)]'
                      : 'border-white/[0.07] bg-white/[0.02] text-[var(--text-secondary)] hover:bg-white/[0.05]'
                  }`}
                >
                  <UserCircle size={20} />
                  <span>Perfil</span>
                </Link>
              </div>

              <button
                onClick={handleLogout}
                className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-2xl border border-white/[0.07] p-4 text-[0.75rem] font-medium text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-white/[0.075] bg-[#111018]/90 backdrop-blur-2xl safe-area-pb lg:hidden">
        {MOBILE_PRIMARY.slice(0, 2).map(dest => (
          <NavTab key={dest.href} {...dest} active={isActiveHref(pathname, dest.href)} />
        ))}

        {/* El `+` va al centro: es la acción que se repite veinte veces por
            semana y el punto de la barra que el pulgar acierta sin mirar. */}
        <button
          onClick={() => openQuickExpense()}
          aria-label="Cargar gasto"
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
        >
          <span
            className="flex size-10 items-center justify-center rounded-2xl text-white transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #8b7dff 0%, #7c6dfa 100%)',
              boxShadow: '0 4px 16px rgba(124,109,250,0.45)',
            }}
          >
            <Plus size={22} strokeWidth={2.5} />
          </span>
        </button>

        {MOBILE_PRIMARY.slice(2).map(dest => (
          <NavTab key={dest.href} {...dest} active={isActiveHref(pathname, dest.href)} />
        ))}

        <button
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-semibold transition-colors ${
            moreActive || moreOpen
              ? 'text-[var(--accent-lumus)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Menu size={19} />
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
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-semibold transition-colors ${
        active ? 'text-[var(--accent-lumus)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
      }`}
    >
      <Icon size={19} />
      <span className="max-w-full truncate px-0.5">{label}</span>
    </Link>
  )
}
