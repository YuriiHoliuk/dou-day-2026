import agendaJson from '@/data/agenda.json'
import type { Agenda, Talk, Speaker } from '@/data/agenda.types'

export const agenda = agendaJson as Agenda

/** Ordered stage column list for the gantt (excludes empty/External). */
export const STAGES: string[] = ['CORE', 'ENGINE', 'GROWTH', 'FUTURE', 'BUSINESS', 'PODCAST']

/** All canonical tracks in the order presented on the site. */
export const TRACKS: string[] = agenda.event.tracks

/** Convert HH:MM to minutes from midnight. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export interface DayBounds {
  startMin: number
  endMin: number
}

/**
 * Compute the [start,end] window for a day, snapped to the half-hour.
 * Only considers talks that are actually rendered in the gantt grid
 * (stage talks). Day-wide entries like registration / afterparty have
 * their own banner and must not stretch the timeline vertically.
 */
export function dayBounds(day: 1 | 2 | 3): DayBounds {
  const talks = agenda.talks.filter(
    (t) =>
      t.day === day &&
      t.type !== 'sideEvent' &&
      STAGES.includes(t.room),
  )
  if (talks.length === 0) return { startMin: 9 * 60, endMin: 18 * 60 }
  let start = Infinity
  let end = -Infinity
  for (const t of talks) {
    const s = timeToMinutes(t.startTime)
    const e = timeToMinutes(t.endTime)
    if (s < start) start = s
    if (e > end) end = e
  }
  // snap outward to half-hour
  start = Math.floor(start / 30) * 30
  end = Math.ceil(end / 30) * 30
  return { startMin: start, endMin: end }
}

/** Talks on a given day, filtered by gantt-grid eligibility. */
export function talksForGantt(day: 1 | 2 | 3): Talk[] {
  return agenda.talks.filter(
    (t) =>
      t.day === day &&
      t.type !== 'sideEvent' &&
      STAGES.includes(t.room),
  )
}

/** Day-wide "spanning" entries that don't belong to a single stage (registration, lunch, afterparty…). */
export function spanningEntries(day: 1 | 2 | 3): Talk[] {
  return agenda.talks.filter(
    (t) =>
      t.day === day &&
      t.type !== 'sideEvent' &&
      !STAGES.includes(t.room),
  )
}

/** Day-3 side events list. */
export function sideEventsForDay(day: 1 | 2 | 3): Talk[] {
  return agenda.talks.filter((t) => t.day === day && t.type === 'sideEvent')
}

/** Quick lookup by id. */
const talkIndex = new Map(agenda.talks.map((t) => [t.id, t]))
export function findTalk(id: string): Talk | undefined {
  return talkIndex.get(id)
}

/** Track key → CSS var suffix (lowercase). */
export function trackKey(track: string | undefined): string {
  if (!track) return 'leadership' // neutral default; rarely used since talks have tracks
  return track.toLowerCase()
}

export const trackColorVar = (track: string | undefined) =>
  `var(--track-${trackKey(track)})`

export const trackSoftVar = (track: string | undefined) =>
  `var(--track-${trackKey(track)}-soft)`

/** Speaker initials for avatar fallback. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function speakerLabel(s: Speaker): string {
  if (s.role && s.company) return `${s.role}, ${s.company}`
  return s.role || s.company || ''
}

/** Localised entry-type label (UA). */
export function typeLabel(type: Talk['type']): string {
  switch (type) {
    case 'talk': return 'Доповідь'
    case 'keynote': return 'Кейноут'
    case 'panel': return 'Панель'
    case 'workshop': return 'Воркшоп'
    case 'podcast': return 'Подкаст'
    case 'break': return 'Перерва'
    case 'lunch': return 'Ланч'
    case 'registration': return 'Реєстрація'
    case 'afterparty': return 'Афтерпаті'
    case 'performance': return 'Виступ'
    case 'sideEvent': return 'Сайд-івент'
    default: return type
  }
}

/** Check whether two intervals overlap (open intervals at end). */
export function overlaps(
  aStart: number, aEnd: number,
  bStart: number, bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** Format a date like "15 травня, П'ятниця" for Ukrainian locale. */
const DAY_LABEL_CACHE = new Map<string, string>()
export function formatDayLabel(date: string): string {
  if (DAY_LABEL_CACHE.has(date)) return DAY_LABEL_CACHE.get(date)!
  const d = new Date(date + 'T00:00:00')
  const fmt = new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(d)
  DAY_LABEL_CACHE.set(date, fmt)
  return fmt
}
