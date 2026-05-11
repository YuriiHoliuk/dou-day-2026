import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Pencil, Printer, AlertTriangle, ArrowRight, Share2, Coffee, Utensils, Sparkles, Star, X } from 'lucide-react'
import { useScheduleStore } from '@/store/schedule'
import {
  agenda,
  findTalk,
  formatDayLabel,
  overlaps,
  timeToMinutes,
  trackColorVar,
  typeLabel,
} from '@/lib/agenda'
import type { Talk } from '@/data/agenda.types'
import type { CustomEntry } from '@/lib/urlState'
import { TalkDialog } from '@/components/TalkDialog'
import { ShareDialog } from '@/components/ShareDialog'
import { AvatarStack } from '@/components/Avatar'
import { TrackTag } from '@/components/TrackDot'
import { printSchedule } from '@/lib/pdf'
import { cn, plural } from '@/lib/utils'
import { Dialog as DialogPrimitive } from 'radix-ui'

type DayNum = 1 | 2 | 3

interface ScheduleItem {
  kind: 'talk' | 'custom'
  id: string
  day: DayNum
  startMin: number
  endMin: number
  /** original startTime/endTime in HH:MM */
  startTime: string
  endTime: string
  talk?: Talk
  custom?: CustomEntry
  /** overridden start/end (in minutes) */
  effStartMin?: number
  effEndMin?: number
  effStartTime?: string
  effEndTime?: string
}

export default function MySchedule() {
  const selected = useScheduleStore((s) => s.selectedTalkIds)
  const customEntries = useScheduleStore((s) => s.customEntries)
  const overrides = useScheduleStore((s) => s.overrides)
  const displayName = useScheduleStore((s) => s.displayName)
  const removeTalk = useScheduleStore((s) => s.removeTalk)
  const removeCustom = useScheduleStore((s) => s.removeCustomEntry)
  const setOverride = useScheduleStore((s) => s.setOverride)
  const clearOverride = useScheduleStore((s) => s.clearOverride)

  const [openTalk, setOpenTalk] = useState<Talk | null>(null)
  const [customOpen, setCustomOpen] = useState<{ day: DayNum } | null>(null)
  const [editingOverride, setEditingOverride] = useState<Talk | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  const items = useMemo(() => buildItems(selected, customEntries, overrides), [selected, customEntries, overrides])

  const byDay = useMemo(() => {
    const groups = new Map<DayNum, ScheduleItem[]>([[1, []], [2, []], [3, []]])
    for (const it of items) groups.get(it.day)!.push(it)
    for (const arr of groups.values()) {
      arr.sort((a, b) => a.effStartMin! - b.effStartMin!)
    }
    return groups
  }, [items])

  const conflicts = useMemo(() => detectConflicts(items), [items])

  const totalTalks = selected.length

  return (
    <section className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 pt-6 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
            Персональний розклад
          </div>
          <h1 className="mt-1 text-3xl sm:text-[36px] font-semibold tracking-[-0.02em] leading-none">
            Мій план
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {totalTalks ? (
              <>
                {totalTalks} {plural(totalTalks, ['обрана доповідь', 'обрані доповіді', 'обраних доповідей'])}
                {customEntries.length > 0 && (
                  <>
                    {' · '}
                    {customEntries.length} {plural(customEntries.length, ['власний запис', 'власні записи', 'власних записів'])}
                  </>
                )}
                {' · '}
                {conflicts.size} {plural(conflicts.size, ['конфлікт', 'конфлікти', 'конфліктів'])}
              </>
            ) : (
              'Поки порожньо — повертайся в Розклад і обери доповіді.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Share2 className="size-3.5" />
            Поділитись
          </button>
          <button
            type="button"
            onClick={printSchedule}
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Printer className="size-3.5" />
            PDF
          </button>
        </div>
      </header>

      {/* Print header */}
      <div className="print-only mb-6">
        <div className="border-b pb-3">
          <div className="text-[10px] uppercase tracking-wider font-semibold">
            DOU Day 2026 · {agenda.event.venue}
          </div>
          <div className="mt-1 text-xl font-bold">
            План: {displayName || '—'}
          </div>
        </div>
      </div>

      {totalTalks + customEntries.length === 0 && <EmptyState />}

      <div className="space-y-10">
        {agenda.event.days.map((d) => {
          const dayItems = byDay.get(d.day as DayNum) ?? []
          if (dayItems.length === 0) return null
          return (
            <article key={d.day} className="print-avoid-break">
              <div className="flex items-end justify-between gap-3 mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground tabular">
                    День {d.day} / {d.date}
                  </div>
                  <h2 className="mt-0.5 text-lg sm:text-xl font-semibold tracking-tight">
                    {formatDayLabel(d.date)}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomOpen({ day: d.day as DayNum })}
                  className="no-print inline-flex items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  <Plus className="size-3" />
                  Додати запис
                </button>
              </div>

              <ol className="space-y-2">
                {dayItems.map((it, i) => {
                  const conflict = conflicts.get(it.id)
                  return (
                    <ScheduleRow
                      key={it.id + i}
                      item={it}
                      conflict={conflict}
                      onOpen={() => it.talk && setOpenTalk(it.talk)}
                      onEditOverride={() => it.talk && setEditingOverride(it.talk)}
                      onRemove={() => {
                        if (it.kind === 'talk') removeTalk(it.id)
                        else removeCustom(it.id)
                      }}
                    />
                  )
                })}
              </ol>
            </article>
          )
        })}
      </div>

      <TalkDialog talk={openTalk} onClose={() => setOpenTalk(null)} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
      <CustomEntryDialog
        day={customOpen?.day ?? null}
        onClose={() => setCustomOpen(null)}
      />
      <OverrideDialog
        talk={editingOverride}
        onClose={() => setEditingOverride(null)}
        onClear={(id) => {
          clearOverride(id)
          setEditingOverride(null)
        }}
        onSave={(id, patch) => {
          setOverride(id, patch)
          setEditingOverride(null)
        }}
      />
    </section>
  )
}

function buildItems(
  selectedIds: string[],
  custom: CustomEntry[],
  overrides: { id: string; s?: string; e?: string }[],
): ScheduleItem[] {
  const overrideMap = new Map(overrides.map((o) => [o.id, o]))
  const items: ScheduleItem[] = []
  for (const id of selectedIds) {
    const talk = findTalk(id)
    if (!talk) continue
    const ovr = overrideMap.get(id)
    const startTime = ovr?.s || talk.startTime
    const endTime = ovr?.e || talk.endTime
    items.push({
      kind: 'talk',
      id: talk.id,
      day: talk.day,
      startTime: talk.startTime,
      endTime: talk.endTime,
      startMin: timeToMinutes(talk.startTime),
      endMin: timeToMinutes(talk.endTime),
      effStartTime: startTime,
      effEndTime: endTime,
      effStartMin: timeToMinutes(startTime),
      effEndMin: timeToMinutes(endTime),
      talk,
    })
  }
  for (const c of custom) {
    items.push({
      kind: 'custom',
      id: c.id,
      day: c.day,
      startTime: c.startTime,
      endTime: c.endTime,
      startMin: timeToMinutes(c.startTime),
      endMin: timeToMinutes(c.endTime),
      effStartMin: timeToMinutes(c.startTime),
      effEndMin: timeToMinutes(c.endTime),
      effStartTime: c.startTime,
      effEndTime: c.endTime,
      custom: c,
    })
  }
  return items
}

function detectConflicts(
  items: ScheduleItem[],
): Map<string, { otherTitle: string; minutes: number }> {
  const out = new Map<string, { otherTitle: string; minutes: number }>()
  for (let i = 0; i < items.length; i++) {
    const a = items[i]
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j]
      if (a.day !== b.day) continue
      if (overlaps(a.effStartMin!, a.effEndMin!, b.effStartMin!, b.effEndMin!)) {
        const overlap =
          Math.min(a.effEndMin!, b.effEndMin!) - Math.max(a.effStartMin!, b.effStartMin!)
        const aTitle = a.talk?.title ?? a.custom?.title ?? ''
        const bTitle = b.talk?.title ?? b.custom?.title ?? ''
        out.set(a.id, { otherTitle: bTitle, minutes: overlap })
        out.set(b.id, { otherTitle: aTitle, minutes: overlap })
      }
    }
  }
  return out
}

/* ────── Row ────── */

function ScheduleRow({
  item,
  conflict,
  onOpen,
  onEditOverride,
  onRemove,
}: {
  item: ScheduleItem
  conflict: { otherTitle: string; minutes: number } | undefined
  onOpen: () => void
  onEditOverride: () => void
  onRemove: () => void
}) {
  const t = item.talk
  const c = item.custom
  const hasOverride =
    t && (item.effStartTime !== t.startTime || item.effEndTime !== t.endTime)

  return (
    <li
      className={cn(
        'group relative grid gap-3 rounded-lg border bg-card px-3 sm:px-4 py-3 print-avoid-break',
        'grid-cols-[72px_1fr_auto] sm:grid-cols-[80px_1fr_auto] items-center',
        conflict && 'border-destructive/40',
      )}
      style={
        t
          ? ({ '--track': trackColorVar(t.track) } as React.CSSProperties)
          : undefined
      }
    >
      {/* time block */}
      <div className="flex flex-col items-end pr-3 border-r border-border tabular">
        <span className="text-sm font-semibold leading-tight">
          {item.effStartTime}
        </span>
        <span className="text-[10px] text-muted-foreground leading-tight">
          {item.effEndTime}
        </span>
        {hasOverride && (
          <span className="mt-1 text-[9px] uppercase tracking-wider font-semibold text-signal">
            змінено
          </span>
        )}
      </div>

      {/* content */}
      <div className="min-w-0">
        {t ? (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <TrackTag track={t.track} />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {t.room}
              </span>
              {t.type !== 'talk' && (
                <span
                  className="rounded-sm px-1 py-[1px] text-[9px] uppercase font-semibold tracking-wider"
                  style={{
                    background: 'color-mix(in oklch, var(--track) 16%, transparent)',
                    color: 'var(--track)',
                  }}
                >
                  {typeLabel(t.type)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onOpen}
              className="block text-left font-medium tracking-tight leading-snug hover:underline decoration-foreground/30 underline-offset-2"
            >
              {t.title}
            </button>
            {t.speakers.length > 0 && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                <AvatarStack speakers={t.speakers} max={3} size="xs" />
                <span className="truncate">
                  {t.speakers.map((s) => s.name).join(', ')}
                </span>
              </div>
            )}
          </>
        ) : c ? (
          <>
            <div className="flex items-center gap-2 mb-0.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              <CustomIcon kind={c.kind} />
              {c.kind === 'lunch' ? 'Ланч' : c.kind === 'break' ? 'Перерва' : 'Власний запис'}
            </div>
            <div className="font-medium leading-snug">{c.title}</div>
          </>
        ) : null}

        {conflict && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-sm bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
            <AlertTriangle className="size-3" />
            Перетинається {conflict.minutes ? `на ${conflict.minutes} хв ` : ''}з «{conflict.otherTitle}»
          </div>
        )}
      </div>

      {/* actions */}
      <div className="flex items-center gap-0.5 no-print">
        {t && (
          <button
            type="button"
            onClick={onEditOverride}
            title="Часткова присутність"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          title="Прибрати"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  )
}

function CustomIcon({ kind }: { kind: CustomEntry['kind'] }) {
  if (kind === 'lunch') return <Utensils className="size-3" />
  if (kind === 'break') return <Coffee className="size-3" />
  return <Sparkles className="size-3" />
}

/* ────── Empty ────── */

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-16 text-center">
      <Star className="mx-auto size-6 text-muted-foreground/60" />
      <p className="mt-3 text-sm text-muted-foreground max-w-[42ch] mx-auto">
        Тут будуть твої обрані доповіді, перерви та власні записи. Відкрий <strong className="font-medium text-foreground">Розклад</strong> і клацни на зірочку біля доповіді.
      </p>
    </div>
  )
}

/* ────── Custom entry dialog ────── */

function CustomEntryDialog({ day, onClose }: { day: DayNum | null; onClose: () => void }) {
  const addCustom = useScheduleStore((s) => s.addCustomEntry)
  const [kind, setKind] = useState<CustomEntry['kind']>('break')
  const [title, setTitle] = useState('Кава з колегами')
  const [start, setStart] = useState('13:00')
  const [end, setEnd] = useState('14:00')

  const open = day !== null
  if (!day) return <DialogPrimitive.Root open={false}><></></DialogPrimitive.Root>

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm anim-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(440px,calc(100vw-2rem))] rounded-lg border bg-card shadow-2xl shadow-black/30 anim-fade-up">
          <header className="flex items-start justify-between gap-3 border-b px-6 py-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
                Додати запис у план
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-muted-foreground mt-0.5">
                День {day}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </header>
          <form
            className="px-6 py-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (timeToMinutes(end) <= timeToMinutes(start)) return
              addCustom({
                id: 'c-' + Math.random().toString(36).slice(2, 10),
                day,
                kind,
                title: title.trim() || (kind === 'lunch' ? 'Ланч' : kind === 'break' ? 'Перерва' : 'Запис'),
                startTime: start,
                endTime: end,
              })
              onClose()
            }}
          >
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-1.5">
                Тип
              </label>
              <div className="inline-flex w-full rounded-md border p-0.5 bg-background">
                {(['break', 'lunch', 'custom'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setKind(k)
                      if (k === 'lunch' && title === 'Кава з колегами') setTitle('Ланч')
                      if (k === 'break' && title === 'Ланч') setTitle('Кава')
                    }}
                    className={cn(
                      'flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                      kind === k ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {k === 'break' ? 'Перерва' : k === 'lunch' ? 'Ланч' : 'Інше'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-1.5">
                Назва
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-1.5">
                  Початок
                </label>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm tabular"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-1.5">
                  Кінець
                </label>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm tabular"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Скасувати
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Додати <ArrowRight className="size-3.5" />
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/* ────── Override dialog (partial attendance) ────── */

function OverrideDialog({
  talk,
  onClose,
  onClear,
  onSave,
}: {
  talk: Talk | null
  onClose: () => void
  onClear: (id: string) => void
  onSave: (id: string, patch: { s?: string | null; e?: string | null }) => void
}) {
  const overrides = useScheduleStore((s) => s.overrides)
  const current = talk ? overrides.find((o) => o.id === talk.id) : undefined
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  // reset whenever talk changes
  useEffect(() => {
    setStart(current?.s ?? '')
    setEnd(current?.e ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talk?.id])

  return (
    <DialogPrimitive.Root open={!!talk} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm anim-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(460px,calc(100vw-2rem))] rounded-lg border bg-card shadow-2xl shadow-black/30 anim-fade-up">
          {talk && (
            <>
              <header className="flex items-start justify-between gap-3 border-b px-6 py-4">
                <div className="min-w-0">
                  <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
                    Часткова присутність
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {talk.title}
                  </DialogPrimitive.Description>
                  <p className="mt-2 text-xs text-muted-foreground tabular">
                    Доповідь: {talk.startTime}–{talk.endTime}
                  </p>
                </div>
                <DialogPrimitive.Close className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                  <X className="size-4" />
                </DialogPrimitive.Close>
              </header>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-1.5">
                      Прийду о
                    </label>
                    <input
                      type="time"
                      value={start}
                      placeholder={talk.startTime}
                      onChange={(e) => setStart(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm tabular"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-1.5">
                      Піду о
                    </label>
                    <input
                      type="time"
                      value={end}
                      placeholder={talk.endTime}
                      onChange={(e) => setEnd(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm tabular"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onClear(talk.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Скинути зміни
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      Скасувати
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSave(talk.id, {
                          s: start && start !== talk.startTime ? start : null,
                          e: end && end !== talk.endTime ? end : null,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Зберегти
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

