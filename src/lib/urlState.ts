import LZString from 'lz-string'

/**
 * Compact URL-state codec for sharing a personal schedule.
 *
 * Wire format (versioned, JSON → lz-string base64url):
 *   { v: 1, n: string, t: string[], c?: CustomEntry[], o?: Override[] }
 *
 * Hash form:  #/s/<encoded>
 */

export interface CustomEntry {
  id: string
  day: 1 | 2 | 3
  startTime: string
  endTime: string
  title: string
  kind: 'break' | 'lunch' | 'custom'
}

export interface AttendanceOverride {
  /** Talk id this applies to. */
  id: string
  /** Override start (HH:MM) — "I'll arrive at". */
  s?: string
  /** Override end (HH:MM) — "I'll leave at". */
  e?: string
}

export interface SharedSchedulePayload {
  v: 1
  name: string
  talkIds: string[]
  custom?: CustomEntry[]
  overrides?: AttendanceOverride[]
}

interface Wire {
  v: 1
  n: string
  t: string[]
  c?: CustomEntry[]
  o?: AttendanceOverride[]
}

export function encodeSchedule(payload: SharedSchedulePayload): string {
  const wire: Wire = {
    v: 1,
    n: payload.name,
    t: payload.talkIds,
    ...(payload.custom?.length ? { c: payload.custom } : {}),
    ...(payload.overrides?.length ? { o: payload.overrides } : {}),
  }
  return LZString.compressToEncodedURIComponent(JSON.stringify(wire))
}

export function decodeSchedule(encoded: string): SharedSchedulePayload | null {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(encoded)
    if (!raw) return null
    const obj = JSON.parse(raw) as Wire
    if (obj.v !== 1) return null
    return {
      v: 1,
      name: typeof obj.n === 'string' ? obj.n : '',
      talkIds: Array.isArray(obj.t) ? obj.t : [],
      custom: obj.c,
      overrides: obj.o,
    }
  } catch {
    return null
  }
}

export function buildShareUrl(payload: SharedSchedulePayload): string {
  const encoded = encodeSchedule(payload)
  // Use current origin + path (works with HashRouter under any base path).
  const { origin, pathname } = window.location
  return `${origin}${pathname}#/s/${encoded}`
}

/** Parse the share segment from a hash like "#/s/<encoded>" or full URL. */
export function extractShareFromHash(hashOrUrl: string): string | null {
  let hash = hashOrUrl
  try {
    const u = new URL(hashOrUrl)
    hash = u.hash
  } catch {
    // not a URL, treat as raw hash
  }
  const m = hash.match(/#\/s\/([^/?#]+)/)
  return m ? m[1] : null
}
