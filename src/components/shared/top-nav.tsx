'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Search, Settings } from 'lucide-react'

const TOP_NAV = [
  { href: '/dashboard',    label: 'Inicio' },
  { href: '/organizacion', label: 'Organización' },
  { href: '/finanzas',     label: 'Finanzas' },
  { href: '/comidas',      label: 'Comidas' },
  { href: '/fit',          label: 'Fit' },
]

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
}

export function TopNav() {
  const pathname = usePathname()

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-white/[0.075] bg-[#111018]/78 backdrop-blur-2xl">
      <div className="flex h-full items-center gap-5 px-5 lg:px-8">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
            <Image
              src="/logoLumus.png"
              alt="Lumus"
              width={96}
              height={96}
              className="h-full w-full scale-[2.9] object-cover object-center opacity-80 mix-blend-screen"
              priority
            />
          </span>
          <span className="lumus-heading hidden text-xl font-semibold text-[#d9d2ff] sm:block">
            LUMUS
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {TOP_NAV.map(item => {
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative py-5 text-[0.78rem] font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                style={{ letterSpacing: '0.08em' }}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-px rounded-full bg-[var(--accent-lumus)] shadow-[0_0_18px_rgba(189,180,255,0.65)]" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden h-10 w-[230px] items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.045] px-4 text-[var(--text-muted)] lg:flex">
            <Search size={17} />
            <span className="text-sm">Buscar parámetro</span>
          </div>
          <button className="grid size-9 place-items-center rounded-full text-[#d8d1ff] transition-colors hover:bg-white/[0.06]" aria-label="Notificaciones">
            <Bell size={19} />
          </button>
          <button className="grid size-9 place-items-center rounded-full text-[#d8d1ff] transition-colors hover:bg-white/[0.06]" aria-label="Configuración">
            <Settings size={19} />
          </button>
          <Link
            href="/perfil"
            className="relative grid size-9 place-items-center overflow-hidden rounded-full border border-[#bdb4ff]/30 bg-[#201f2b]"
            aria-label="Perfil"
          >
            <Image
              src="/logoLumus.png"
              alt=""
              width={96}
              height={96}
              className="h-full w-full scale-[2.6] object-cover object-center opacity-75 mix-blend-screen"
            />
          </Link>
        </div>
      </div>
    </header>
  )
}
