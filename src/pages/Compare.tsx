import { useMemo, useState } from 'react'
import { Users as UsersIcon, Sparkles, Check } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { useScheduleStore } from '@/store/schedule'
import {
  agenda,
  findTalk,
  formatDayLabel,
  timeToMinutes,
  trackColorVar,
  typeLabel,
} from '@/lib/agenda'
import type { Talk } from '@/data/agenda.types'
import { TalkDialog } from '@/components/TalkDialog'
import { cn, plural } from '@/lib/utils'

type DayNum = 1 | 2 | 3

export default function Compare() {
  const myIds = useScheduleStore((s) => s.selectedTalkIds)
  const myName = useScheduleStore((s) => s.displayName)
  const friends = useScheduleStore((s) => s.friends)
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(() => friends.map((f) => f.id))
  const [day, setDay] = useState<DayNum>(1)
  const [openTalk, setOpenTalk] = useState<Talk | null>(null)

  const selectedFriends = friends.filter((f) => selectedFriendIds.includes(f.id))
  const friendCount = selectedFriends.length

  /** All unique talk IDs across me + selected friends */
  const allIds = useMemo(() => {
    const ids = new Set<string>(myIds)
    for (const f of selectedFriends) for (const id of f.talkIds) ids.add(id)
    return Array.from(ids)
  }, [myIds, selectedFriends])

  const rows = useMemo(() => {
    const items = allIds
      .map((id) => findTalk(id))
      .filter((t): t is Talk => !!t)
      .filter((t) => t.day === day)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
    return items.map((t) => {
      const mine = myIds.includes(t.id)
      const attending = selectedFriends.filter((f) => f.talkIds.includes(t.id))
      return { talk: t, mine, attending }
    })
  }, [allIds, myIds, selectedFriends, day])

  const sharedCount = useMemo(() => {
    if (selectedFriends.length === 0) return 0
    return rows.filter((r) => r.mine && r.attending.length > 0).length
  }, [rows, selectedFriends.length])

  return (
    <section className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 pt-6 pb-16">
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
          Порівняння
        </div>
        <h1 className="mt-1 text-3xl sm:text-[36px] font-semibold tracking-[-0.02em] leading-none">
          Я vs друзі
        </h1>
        {friends.length > 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {friendCount === 0
              ? 'Обери одного або кількох друзів — побачиш, де ваші плани збігаються.'
              : `${sharedCount} ${plural(sharedCount, ['спільна доповідь', 'спільні доповіді', 'спільних доповідей'])} з ${friendCount} ${plural(friendCount, ['другом', 'друзями', 'друзями'])}`}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Спочатку додай хоча б одного друга у{' '}
            <RouterLink to="/friends" className="underline">розділі Друзі</RouterLink>.
          </p>
        )}
      </header>

      {friends.length > 0 && (
        <>
          {/* friend selector */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mr-1">
              Друзі:
            </span>
            {friends.map((f) => {
              const on = selectedFriendIds.includes(f.id)
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    setSelectedFriendIds((s) =>
                      s.includes(f.id) ? s.filter((x) => x !== f.id) : [...s, f.id],
                    )
                  }
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
                    on
                      ? 'bg-foreground text-background border-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {on && <Check className="size-3" />}
                  {f.name}
                </button>
              )
            })}
          </div>

          {/* day picker */}
          <div
            role="tablist"
            className="mb-4 inline-flex items-center rounded-full border bg-card p-0.5"
          >
            {agenda.event.days.map((d) => (
              <button
                key={d.day}
                type="button"
                role="tab"
                aria-selected={day === d.day}
                onClick={() => setDay(d.day as DayNum)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors tabular',
                  day === d.day
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                D{d.day}
                <span className="ml-1.5 hidden sm:inline opacity-70">
                  {formatDayLabel(d.date).split(',')[0]}
                </span>
              </button>
            ))}
          </div>

          {/* legend */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mb-4">
            <LegendDot className="bg-signal" label="спільне з другом" />
            <LegendDot className="bg-foreground" label={myName ? `тільки ${myName}` : 'тільки моє'} />
            <LegendDot className="bg-muted-foreground/40" label="тільки друг" />
          </div>

          {/* rows */}
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-16 text-center text-sm text-muted-foreground">
              На цей день нічого не обрано — ні в тебе, ні в друзів.
            </div>
          ) : (
            <ol className="space-y-2">
              {rows.map(({ talk, mine, attending }) => {
                const both = mine && attending.length > 0
                const onlyFriend = !mine && attending.length > 0
                return (
                  <li
                    key={talk.id}
                    className={cn(
                      'group grid grid-cols-[80px_1fr_auto] items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors',
                      both && 'ring-1 ring-signal/60 border-signal/50 bg-signal-soft/30',
                      onlyFriend && 'opacity-90',
                    )}
                  >
                    <div className="text-right tabular border-r pr-3 border-border">
                      <div className="text-sm font-semibold leading-tight">{talk.startTime}</div>
                      <div className="text-[10px] text-muted-foreground">{talk.endTime}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {talk.track && (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider"
                            style={{
                              background: `color-mix(in oklch, ${trackColorVar(talk.track)} 14%, transparent)`,
                              color: trackColorVar(talk.track),
                            }}
                          >
                            <span
                              className="size-1.5 rounded-full"
                              style={{ background: trackColorVar(talk.track) }}
                            />
                            {talk.track}
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                          {talk.room} · {typeLabel(talk.type)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenTalk(talk)}
                        className="block text-left font-medium tracking-tight leading-snug hover:underline decoration-foreground/30 underline-offset-2"
                      >
                        {talk.title}
                      </button>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        {mine && (
                          <span className="inline-flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-foreground" />
                            ти
                          </span>
                        )}
                        {attending.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <UsersIcon className="size-3" />
                            {attending.map((f) => f.name).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    {both && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-signal/15 text-signal px-2 py-1 text-[10px] uppercase tracking-wider font-semibold">
                        <Sparkles className="size-3" />
                        збіг
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
        </>
      )}

      <TalkDialog talk={openTalk} onClose={() => setOpenTalk(null)} />
    </section>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2 rounded-full', className)} />
      {label}
    </span>
  )
}
