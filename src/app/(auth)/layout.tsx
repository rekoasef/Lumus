import { AuthBrandPanel, AuthBrandMark } from '@/components/shared/auth-brand'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[var(--bg-base)]">
      <AuthBrandPanel />

      <div className="relative flex flex-1 items-center justify-center px-4 py-12">
        {/* En desktop el ambiente lo pone el panel; acá solo un halo suave para
            que la columna del formulario no quede plana. */}
        <div className="pointer-events-none absolute inset-0 lumus-panel-grid opacity-40 lg:opacity-0" aria-hidden />
        <div
          className="pointer-events-none absolute -top-52 left-1/2 size-[38rem] -translate-x-1/2 rounded-full bg-[#bdb4ff]/[0.06] blur-3xl"
          aria-hidden
        />

        <div className="relative w-full max-w-md">
          <AuthBrandMark />
          {children}
        </div>
      </div>
    </div>
  )
}
