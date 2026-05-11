import { Star, Crown, AlertTriangle } from 'lucide-react'
import type { Talk } from '@/data/agenda.types'
import { trackColorVar, trackSoftVar, typeLabel } from '@/lib/agenda'
import { useScheduleStore } from '@/store/schedule'
import { AvatarStack } from './Avatar'
import { cn } from '@/lib/utils'

interface Props {
  talk: Talk
  onClick: () => void
  hasConflict?: boolean
  /** absolute layout within the gantt grid */
  style?: React.CSSProperties
  density?: 'compact' | 'comfortable'
}

export function TalkCard({ talk, onClick, hasConflict, style, density = 'comfortable' }: Props) {
  const selected = useScheduleStore((s) => s.selectedTalkIds.includes(talk.id))
  const toggle = useScheduleStore((s) => s.toggleTalk)
  const hasModerator = talk.speakers.some((s) => s.isModerator)
  const isCompact = density === 'compact'

  return (
    <article
      style={
        {
          ...style,
          '--track': trackColorVar(talk.track),
          '--track-soft': trackSoftVar(talk.track),
        } as React.CSSProperties
      }
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-md border bg-card text-left',
        'transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]',
        'hover:border-foreground/30 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)]',
        'cursor-pointer',
        selected && 'ring-1 ring-signal/70 border-signal/60 bg-[color:var(--track-soft)]',
      )}
    >
      {/* track top stripe */}
      <span
        className="block h-[3px] w-full shrink-0"
        style={{ background: 'var(--track)' }}
        aria-hidden
      />

      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 flex-col gap-1 px-2.5 py-1.5 text-left min-h-0"
      >
        {/* meta row */}
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground tabular">
          <span className="text-foreground/80">{talk.startTime}</span>
          <span className="text-foreground/30">→</span>
          <span>{talk.endTime}</span>
          {talk.language && talk.language !== 'UA' && (
            <span className="ml-auto rounded-sm bg-secondary px-1 py-[1px] text-[9px]">
              {talk.language}
            </span>
          )}
          {talk.type !== 'talk' && talk.type !== 'keynote' && (
            <span
              className={cn(
                talk.language === 'UA' || !talk.language ? 'ml-auto' : '',
                'rounded-sm px-1 py-[1px] text-[9px]',
              )}
              style={{
                background: `color-mix(in oklch, var(--track) 16%, transparent)`,
                color: 'var(--track)',
              }}
            >
              {typeLabel(talk.type)}
            </span>
          )}
        </div>

        {/* title — always visible; shrink-0 protects it from being squeezed out by mt-auto speakers */}
        <h3
          className={cn(
            'font-semibold leading-snug tracking-tight text-foreground/95 shrink-0',
            isCompact ? 'text-[11px] line-clamp-2' : 'text-[12.5px] sm:text-[13px] line-clamp-3',
          )}
        >
          {talk.title}
        </h3>

        {talk.speakers.length > 0 && !isCompact && (
          <div className="mt-auto flex items-center gap-2 pt-1">
            <AvatarStack speakers={talk.speakers} max={3} size="xs" />
            <span className="min-w-0 truncate text-[10.5px] text-muted-foreground">
              {talk.speakers[0].name}
              {talk.speakers.length > 1 && (
                <span className="text-foreground/40"> +{talk.speakers.length - 1}</span>
              )}
            </span>
            {hasModerator && (
              <Crown className="size-2.5 text-signal shrink-0" aria-label="модератор" />
            )}
          </div>
        )}
      </button>

      {/* corner pin */}
      {selected && (
        <span
          className="absolute right-1 top-1 inline-flex size-4 items-center justify-center rounded-full bg-signal text-signal-foreground"
          aria-label="у плані"
        >
          <Star className="size-2.5 fill-current" />
        </span>
      )}

      {/* conflict ribbon */}
      {hasConflict && !selected && (
        <span
          className="absolute right-1 top-1 inline-flex size-4 items-center justify-center rounded-full bg-destructive/15 text-destructive"
          title="Конфлікт за часом"
        >
          <AlertTriangle className="size-2.5" />
        </span>
      )}

      {/* quick toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          toggle(talk.id)
        }}
        className={cn(
          'absolute bottom-1 right-1 inline-flex size-6 items-center justify-center rounded-full border bg-card/80 backdrop-blur-sm',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-foreground hover:text-background hover:border-foreground',
          selected && 'opacity-100 bg-signal text-signal-foreground border-signal',
        )}
        aria-label={selected ? 'Прибрати з плану' : 'Додати в план'}
      >
        <Star className={cn('size-3', selected && 'fill-current')} />
      </button>
    </article>
  )
}
