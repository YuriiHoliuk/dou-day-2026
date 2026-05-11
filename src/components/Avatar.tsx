import { useState } from 'react'
import type { Speaker } from '@/data/agenda.types'
import { initials } from '@/lib/agenda'
import { cn } from '@/lib/utils'

interface AvatarProps {
  speaker: Speaker
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'size-5 text-[9px]',
  sm: 'size-7 text-[10px]',
  md: 'size-10 text-xs',
  lg: 'size-14 text-sm',
}

export function Avatar({ speaker, size = 'sm', className }: AvatarProps) {
  const [err, setErr] = useState(false)
  const has = !!speaker.photoUrl && !err
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-medium uppercase ring-1 ring-border overflow-hidden',
        SIZE_CLASSES[size],
        className,
      )}
      title={speaker.name}
      aria-label={speaker.name}
    >
      {has ? (
        <img
          src={speaker.photoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setErr(true)}
        />
      ) : (
        <span aria-hidden>{initials(speaker.name)}</span>
      )}
    </span>
  )
}

export function AvatarStack({ speakers, max = 3, size = 'sm' }: { speakers: Speaker[]; max?: number; size?: AvatarProps['size'] }) {
  const shown = speakers.slice(0, max)
  const more = speakers.length - shown.length
  return (
    <span className="inline-flex items-center -space-x-1.5">
      {shown.map((s, i) => (
        <Avatar key={s.name + i} speaker={s} size={size} className="ring-2 ring-card" />
      ))}
      {more > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-card font-medium tabular',
            size === 'xs' ? 'size-5 text-[9px]' : 'size-7 text-[10px]',
          )}
        >
          +{more}
        </span>
      )}
    </span>
  )
}
