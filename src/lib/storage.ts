/**
 * Tiny typed wrapper around localStorage used by the zustand persist middleware
 * and ad-hoc reads. Centralises the keys + JSON parsing so the rest of the
 * app stays safe.
 */

const PREFIX = 'dou-day-2026:'

export function readKey<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeKey<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // quota / private mode — swallow.
  }
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    // noop
  }
}
