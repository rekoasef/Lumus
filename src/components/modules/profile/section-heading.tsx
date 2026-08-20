interface SectionHeadingProps {
  index: string
  label: string
  action?: React.ReactNode
}

export function SectionHeading({ index, label, action }: SectionHeadingProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <span
          aria-hidden
          className="lumus-heading text-base font-bold tabular-nums"
          style={{ color: 'rgba(189,180,255,0.4)' }}
        >
          {index}
        </span>
        <p className="lumus-label text-[var(--text-secondary)]">{label}</p>
      </div>
      {action}
    </div>
  )
}
