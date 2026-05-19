export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--bg-base)]">
      <div className="pointer-events-none absolute inset-0 lumus-panel-grid opacity-45" />
      <div className="pointer-events-none absolute -top-64 right-1/4 size-[42rem] rounded-full bg-[#bdb4ff]/[0.07] blur-3xl" />
      {children}
    </div>
  )
}
