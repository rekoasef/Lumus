export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-base)] px-4 py-12">
      <div className="pointer-events-none absolute inset-0 lumus-panel-grid opacity-50" />
      <div className="pointer-events-none absolute -top-60 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-[#bdb4ff]/[0.07] blur-3xl" />
      <div className="relative w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
