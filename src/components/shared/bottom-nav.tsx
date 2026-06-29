'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, LayoutDashboard, Wallet, UserCircle } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard',         label: 'Panel',    icon: LayoutDashboard },
  { href: '/finanzas',          label: 'Gastos',   icon: Wallet },
  { href: '/finanzas/reportes', label: 'Reportes', icon: BarChart2 },
  { href: '/perfil',            label: 'Perfil',   icon: UserCircle },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-white/[0.075] bg-[#111018]/90 backdrop-blur-2xl safe-area-pb lg:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-[10px] font-semibold transition-colors ${
              active
                ? 'text-[var(--accent-lumus)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
