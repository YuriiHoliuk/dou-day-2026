import { trackColorVar } from '@/lib/agenda'
import { cn } from '@/lib/utils'

interface Props {
  track?: string
  className?: string
}

export function TrackDot({ track, className }: Props) {
  return (
    <span
      className={cn('inline-block size-2 rounded-full shrink-0', className)}
      style={{ background: trackColorVar(track) }}
      aria-hidden
    />
  )
}

export function TrackTag({ track, className }: Props) {
  if (!track) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider tabular',
        className,
      )}
      style={{
        background: `color-mix(in oklch, ${trackColorVar(track)} 14%, transparent)`,
        color: trackColorVar(track),
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ background: trackColorVar(track) }}
        aria-hidden
      />
      {track}
    </span>
  )
}
