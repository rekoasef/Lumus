'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart2,
  LayoutDashboard,
  Wallet,
  UserCircle,
  LogOut,
  Mic,
} from 'lucide-react'
import { LumusOrbIcon } from '@/components/lumus/lumus-orb'
import { VoiceModal } from '@/components/lumus/voice-modal'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/finanzas',           label: 'Gastos',    icon: Wallet },
  { href: '/finanzas/reportes',  label: 'Reportes',  icon: BarChart2 },
]

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
}

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [voiceOpen, setVoiceOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
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
        <nav className="hidden md:flex items-center flex-1 min-w-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href)
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
          </div>
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* Botón de voz */}
          <button
            onClick={() => setVoiceOpen(true)}
            title="Hablar con Lumus"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[var(--text-muted)] transition-colors hover:bg-[rgba(124,109,250,0.12)] hover:text-[#bdb4ff]"
            style={{ border: '1px solid transparent' }}
            onMouseEnter={e => (e.currentTarget.style.border = '1px solid rgba(124,109,250,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.border = '1px solid transparent')}
          >
            <Mic size={15} />
            <span className="hidden xl:block text-[0.72rem] font-medium">Voz financiera</span>
          </button>
          <div className="h-5 w-px bg-white/10" />
          <Link
            href="/perfil"
            title="Perfil"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[var(--text-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--text-secondary)] ${
              pathname === '/perfil' ? 'text-[var(--text-primary)] bg-white/[0.08]' : ''
            }`}
          >
            <UserCircle size={16} />
            <span className="hidden xl:block text-[0.72rem] font-medium">Perfil</span>
          </Link>

          <div className="h-5 w-px bg-white/10" />

          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={14} />
            <span className="hidden xl:block text-[0.72rem] font-medium">Salir</span>
          </button>
        </div>

      </div>
    </header>

    {voiceOpen && <VoiceModal onClose={() => setVoiceOpen(false)} />}
    </>
  )
}
