'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart2,
  LayoutDashboard,
  Wallet,
  UserCircle,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard',         label: 'Dashboard', icon: LayoutDashboard },
  { href: '/finanzas',          label: 'Gastos',    icon: Wallet },
  { href: '/finanzas/reportes', label: 'Reportes',  icon: BarChart2 },
]

const NAV_BOTTOM = [
  { href: '/perfil', label: 'Perfil', icon: UserCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  const expanded = pathname === '/dashboard'

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-white/[0.075] bg-[#111018]/62 backdrop-blur-2xl transition-[width] duration-300 lg:flex ${
        expanded ? 'w-72' : 'w-[72px]'
      }`}
      style={{ minHeight: 'calc(100vh - 4rem)' }}
    >
      {expanded && (
        <div className="flex items-center gap-4 px-6 py-8">
          <div className="relative grid size-10 shrink-0 overflow-hidden rounded-xl border border-[#bdb4ff]/20 bg-white/[0.035] shadow-[0_0_24px_rgba(189,180,255,0.14)]">
            <Image
              src="/logoLumus.png"
              alt="Lumus"
              width={96}
              height={96}
              className="h-full w-full scale-[2.9] object-cover object-center opacity-80 mix-blend-screen"
              priority
            />
          </div>
          <div>
            <p className="lumus-heading text-xl font-semibold text-[#cfc6ff]">Lumus</p>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Finanzas</p>
          </div>
        </div>
      )}

      <nav className={`flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden ${expanded ? 'px-3 py-6' : 'items-center py-4 gap-2'}`}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`group relative flex items-center rounded-xl transition-all duration-150 ${
                expanded ? 'h-10 gap-3 px-3 text-sm' : 'size-10 justify-center'
              }`}
              style={{
                backgroundColor: active ? 'rgba(189,180,255,0.14)' : 'transparent',
                color: active ? '#d8d1ff' : 'var(--text-secondary)',
              }}
            >
              {active && expanded && (
                <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#bdb4ff]" />
              )}
              <Icon size={expanded ? 16 : 18} />
              {expanded && <span className="font-medium">{label}</span>}
              {!expanded && (
                <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg border border-white/10 bg-[#1d1b28] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className={`flex flex-col gap-1 border-t border-white/[0.075] py-4 ${expanded ? 'px-3' : 'items-center'}`}>
        {NAV_BOTTOM.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={`group relative flex items-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-white/[0.06] hover:text-[var(--text-primary)] ${
              expanded ? 'h-10 gap-3 px-3 text-sm' : 'size-10 justify-center'
            }`}
          >
            <Icon size={expanded ? 16 : 18} />
            {expanded && <span>{label}</span>}
            {!expanded && (
              <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg border border-white/10 bg-[#1d1b28] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                {label}
              </span>
            )}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          className={`group relative flex items-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger-muted)] hover:text-[var(--danger)] ${
            expanded ? 'h-10 gap-3 px-3 text-sm' : 'size-10 justify-center'
          }`}
        >
          <LogOut size={expanded ? 16 : 18} />
          {expanded && <span>Cerrar sesión</span>}
          {!expanded && (
            <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg border border-white/10 bg-[#1d1b28] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)] opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
              Cerrar sesión
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}
