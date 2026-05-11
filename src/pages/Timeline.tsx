import { useMemo, useState } from 'react'
import { ExternalLink, MapPin, Star, Pin } from 'lucide-react'
import {
  STAGES,
  dayBounds,
  formatDayLabel,
  agenda,
  minutesToTime,
  sideEventsForDay,
  spanningEntries,
  talksForGantt,
  timeToMinutes,
  trackColorVar,
  typeLabel,
} from '@/lib/agenda'
import type { Talk } from '@/data/agenda.types'
import { useScheduleStore } from '@/store/schedule'
import { TalkCard } from '@/components/TalkCard'
import { TalkDialog } from '@/components/TalkDialog'
import { cn } from '@/lib/utils'

type DayNum = 1 | 2 | 3

// Pixel scale: 1 minute === MINUTE_PX vertical pixels.
const MINUTE_PX = 2.6 // 30min → 78px

export default function Timeline() {
  const [day, setDay] = useState<DayNum>(1)
  const [openTalk, setOpenTalk] = useState<Talk | null>(null)
  const selectedIds = useScheduleStore((s) => s.selectedTalkIds)

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedTalks = useMemo(
    () => agenda.talks.filter((t) => selectedSet.has(t.id) && t.day === day),
    [selectedSet, day],
  )

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 pt-6 pb-16">
      <DayPicker day={day} onChange={setDay} />

      {day === 3 ? (
        <SideEventsGrid onOpen={setOpenTalk} />
      ) : (
        <GanttView day={day} onOpen={setOpenTalk} selectedTalks={selectedTalks} />
      )}

      <TalkDialog talk={openTalk} onClose={() => setOpenTalk(null)} />
    </section>
  )
}

/* ─────────────────────── Day picker ─────────────────────── */

function DayPicker({ day, onChange }: { day: DayNum; onChange: (d: DayNum) => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
          Програма / {agenda.event.venue}
        </div>
        <h1 className="mt-1 text-3xl sm:text-[36px] font-semibold tracking-[-0.02em] leading-none">
          {agenda.event.name}
        </h1>
      </div>

      <div
        role="tablist"
        aria-label="Дні конференції"
        className="inline-flex items-center rounded-full border bg-card p-0.5"
      >
        {agenda.event.days.map((d) => {
          const active = d.day === day
          return (
            <button
              key={d.day}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(d.day as DayNum)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="tabular text-[10px] opacity-80">D{d.day}</span>
              <span className="hidden sm:inline">{formatDayLabel(d.date).replace(/,.*$/, '')}</span>
              <span className="sm:hidden">{formatDayLabel(d.date).split(',')[0]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────── Gantt view ─────────────────────── */

interface GanttProps {
  day: DayNum
  onOpen: (t: Talk) => void
  selectedTalks: Talk[]
}

function GanttView({ day, onOpen, selectedTalks }: GanttProps) {
  const bounds = useMemo(() => dayBounds(day), [day])
  const totalMin = bounds.endMin - bounds.startMin
  const totalHeight = totalMin * MINUTE_PX

  // 30-min grid ticks
  const ticks = useMemo(() => {
    const arr: number[] = []
    for (let m = bounds.startMin; m <= bounds.endMin; m += 30) arr.push(m)
    return arr
  }, [bounds])

  const gantt = useMemo(() => talksForGantt(day), [day])
  const spanning = useMemo(() => spanningEntries(day), [day])

  // Conflict detection — talks whose time overlaps with anything selected.
  const conflictSet = useMemo(() => {
    const out = new Set<string>()
    for (const c of gantt) {
      const cs = timeToMinutes(c.startTime)
      const ce = timeToMinutes(c.endTime)
      for (const s of selectedTalks) {
        if (s.id === c.id) continue
        const ss = timeToMinutes(s.startTime)
        const se = timeToMinutes(s.endTime)
        if (cs < se && ss < ce) {
          out.add(c.id)
          break
        }
      }
    }
    return out
  }, [gantt, selectedTalks])

  return (
    <div className="anim-fade-up">
      {/* Mobile per-stage list view */}
      <div className="lg:hidden">
        <MobileListView day={day} onOpen={onOpen} conflictSet={conflictSet} />
      </div>

      {/* Desktop / tablet Gantt */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto scroll-hairline rounded-lg border bg-card">
          <div className="min-w-[1100px]">
            {/* spanning entries banner — day-wide events (registration, lunch, afterparty…) */}
            {spanning.length > 0 && (
              <div
                className="grid border-b bg-muted/40"
                style={{ gridTemplateColumns: `72px repeat(${STAGES.length}, minmax(0, 1fr))` }}
              >
                <div className="py-2" />
                <div
                  className="px-3 py-2 flex flex-wrap items-center gap-x-5 gap-y-1"
                  style={{ gridColumn: `2 / span ${STAGES.length}` }}
                >
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/80">
                    Ден загалом:
                  </span>
                  {spanning.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <span className="tabular font-medium text-foreground/85">
                        {s.startTime}
                      </span>
                      <span className="uppercase tracking-wider text-[9px] font-semibold text-foreground/70">
                        {typeLabel(s.type)}
                      </span>
                      <span className="truncate max-w-[28ch]">{s.title}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* stage header */}
            <div
              className="grid border-b bg-card"
              style={{ gridTemplateColumns: `72px repeat(${STAGES.length}, minmax(0, 1fr))` }}
            >
              <div className="border-r flex items-end justify-end pr-2 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                час
              </div>
              {STAGES.map((stage, i) => (
                <StageHeader key={stage} stage={stage} isLast={i === STAGES.length - 1} />
              ))}
            </div>

            {/* grid body */}
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `72px repeat(${STAGES.length}, minmax(0, 1fr))`,
                height: totalHeight,
              }}
            >
              {/* time axis column */}
              <div className="relative border-r">
                {ticks.map((t) => {
                  const top = (t - bounds.startMin) * MINUTE_PX
                  const hour = t % 60 === 0
                  return (
                    <div
                      key={t}
                      style={{ top }}
                      className={cn(
                        'absolute right-0 left-0 flex justify-end pr-2 -translate-y-2',
                        hour ? 'text-foreground/80' : 'text-muted-foreground/60',
                      )}
                    >
                      <span
                        className={cn(
                          'tabular text-[10px]',
                          hour && 'text-[11px] font-semibold',
                        )}
                      >
                        {minutesToTime(t)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* stage columns */}
              {STAGES.map((stage, idx) => (
                <StageColumn
                  key={stage}
                  stage={stage}
                  bounds={bounds}
                  totalHeight={totalHeight}
                  ticks={ticks}
                  talks={gantt.filter((t) => t.room === stage)}
                  onOpen={onOpen}
                  conflictSet={conflictSet}
                  isLast={idx === STAGES.length - 1}
                />
              ))}
            </div>
          </div>
        </div>

        <Legend />
      </div>
    </div>
  )
}

function StageHeader({ stage, isLast }: { stage: string; isLast: boolean }) {
  // Stage description hints from the data
  const subtitle = useMemo(() => {
    const example = agenda.talks.find((t) => t.room === stage && t.roomLabel)
    return example?.roomLabel.replace(/^[^,]+,\s*/, '') ?? ''
  }, [stage])
  return (
    <div className={cn('px-3 py-2.5', !isLast && 'border-r')}>
      <div className="flex items-baseline gap-2">
        <span className="text-[13px] font-semibold tracking-[-0.01em]">{stage}</span>
        {subtitle && (
          <span className="text-[10px] text-muted-foreground tabular">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}

function StageColumn({
  stage,
  bounds,
  totalHeight,
  ticks,
  talks,
  onOpen,
  conflictSet,
  isLast,
}: {
  stage: string
  bounds: { startMin: number; endMin: number }
  totalHeight: number
  ticks: number[]
  talks: Talk[]
  onOpen: (t: Talk) => void
  conflictSet: Set<string>
  isLast: boolean
}) {
  return (
    <div
      data-stage={stage}
      className={cn('relative', !isLast && 'border-r')}
      style={{ height: totalHeight }}
    >
      {/* grid lines */}
      {ticks.map((t) => {
        const top = (t - bounds.startMin) * MINUTE_PX
        const hour = t % 60 === 0
        return (
          <div
            key={t}
            style={{ top }}
            className={cn(
              'pointer-events-none absolute left-0 right-0 h-px',
              hour ? 'bg-grid-line-strong' : 'bg-grid-line',
            )}
          />
        )
      })}

      {/* talk cards */}
      {talks.map((t) => {
        const start = timeToMinutes(t.startTime) - bounds.startMin
        const dur = t.durationMin
        const top = start * MINUTE_PX
        const height = Math.max(40, dur * MINUTE_PX - 4)
        const density = dur < 25 ? 'compact' : 'comfortable'
        return (
          <div
            key={t.id}
            style={{ top, height, left: 4, right: 4 }}
            className="absolute"
          >
            <TalkCard
              talk={t}
              onClick={() => onOpen(t)}
              hasConflict={conflictSet.has(t.id)}
              density={density}
              style={{ height: '100%' }}
            />
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────── Mobile per-stage list ─────────────────── */

function MobileListView({
  day,
  onOpen,
  conflictSet,
}: {
  day: DayNum
  onOpen: (t: Talk) => void
  conflictSet: Set<string>
}) {
  const [stage, setStage] = useState<string>(STAGES[0])
  const talks = useMemo(
    () =>
      talksForGantt(day)
        .filter((t) => t.room === stage)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
    [day, stage],
  )

  return (
    <div>
      <div className="overflow-x-auto scroll-hairline -mx-4 px-4 mb-3">
        <div className="inline-flex items-center gap-1.5">
          {STAGES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                stage === s
                  ? 'bg-foreground text-background border-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <MapPin className="size-3" />
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {talks.length === 0 && (
          <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
            На сцені {stage} в цей день немає доповідей.
          </p>
        )}
        {talks.map((t) => (
          <div key={t.id} className="relative">
            <TalkCard
              talk={t}
              onClick={() => onOpen(t)}
              hasConflict={conflictSet.has(t.id)}
              density="comfortable"
              style={{ minHeight: 96 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────── Side events (Day 3) ─────────────────── */

function SideEventsGrid({ onOpen }: { onOpen: (t: Talk) => void }) {
  const items = sideEventsForDay(3)
  return (
    <div className="anim-fade-up">
      <header className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
          День 3 / {formatDayLabel('2026-05-17')}
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Партнерські події</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-[65ch]">
          Мітапи й сайд-івенти від спільноти на зовнішніх локаціях. Кожна подія має власну реєстрацію через lu.ma.
        </p>
      </header>

      <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((t) => (
          <SideEventCard key={t.id} talk={t} onOpen={onOpen} />
        ))}
      </ul>
    </div>
  )
}

function SideEventCard({ talk, onOpen }: { talk: Talk; onOpen: (t: Talk) => void }) {
  const selected = useScheduleStore((s) => s.selectedTalkIds.includes(talk.id))
  const toggle = useScheduleStore((s) => s.toggleTalk)
  return (
    <li className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-[transform,border-color] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:border-foreground/30">
      {talk.coverImageUrl && (
        <button
          type="button"
          onClick={() => onOpen(talk)}
          className="block aspect-[1.6/1] w-full overflow-hidden bg-muted"
        >
          <img
            src={talk.coverImageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </button>
      )}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground tabular">
          <Pin className="size-3" />
          <span>{talk.roomLabel || 'External'}</span>
          <span className="ml-auto tabular text-foreground/80">
            {talk.startTime}
            {talk.endTime && talk.startTime !== talk.endTime ? ` – ${talk.endTime}` : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onOpen(talk)}
          className="text-left font-semibold tracking-tight leading-snug text-[15px] hover:underline decoration-foreground/30 underline-offset-2"
        >
          {talk.title}
        </button>
        {talk.description && (
          <p className="line-clamp-3 text-[13px] text-muted-foreground leading-relaxed">
            {talk.description}
          </p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-1">
          {talk.registrationUrl && (
            <a
              href={talk.registrationUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              <ExternalLink className="size-3" />
              lu.ma
            </a>
          )}
          <button
            type="button"
            onClick={() => toggle(talk.id)}
            className={cn(
              'ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              selected
                ? 'bg-signal text-signal-foreground'
                : 'border hover:bg-accent',
            )}
          >
            <Star className={cn('size-3', selected && 'fill-current')} />
            {selected ? 'У плані' : 'В план'}
          </button>
        </div>
      </div>
    </li>
  )
}

/* ─────────────────── Legend ─────────────────── */

function Legend() {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
      <span className="font-semibold uppercase tracking-wider text-[10px] mr-1">
        Треки:
      </span>
      {agenda.event.tracks.map((tr) => (
        <span key={tr} className="inline-flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full"
            style={{ background: trackColorVar(tr) }}
          />
          {tr}
        </span>
      ))}
      <span className="mx-2 h-3 w-px bg-border" aria-hidden />
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-signal" />
        у твоєму плані
      </span>
    </div>
  )
}

