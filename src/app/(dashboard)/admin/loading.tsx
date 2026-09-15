function Block({ className }: { className: string }) {
  return <div className={`lumus-glass animate-pulse ${className}`} />
}

export default function AdminLoading() {
  return (
    <div className="min-h-screen px-3 py-5 sm:px-5 sm:py-8 lg:px-12 lg:py-12">
      <div className="mx-auto max-w-[1120px] space-y-4 sm:space-y-6">
        <div className="mb-2 space-y-3">
          <div className="h-3 w-28 rounded bg-white/[0.06]" />
          <div className="h-8 w-72 max-w-full rounded-lg bg-white/[0.06]" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => <Block key={i} className="h-[7.5rem] rounded-2xl" />)}
        </div>
        <Block className="h-80 rounded-3xl" />
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Block className="h-96 rounded-3xl" />
          <Block className="h-96 rounded-3xl" />
        </div>
      </div>
    </div>
  )
}
