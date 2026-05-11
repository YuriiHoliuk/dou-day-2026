import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CustomEntry, AttendanceOverride } from '@/lib/urlState'

export interface FriendSchedule {
  id: string
  name: string
  talkIds: string[]
  custom?: CustomEntry[]
  overrides?: AttendanceOverride[]
  addedAt: number
}

export interface ScheduleState {
  /** Talk IDs the user has bookmarked. */
  selectedTalkIds: string[]
  /** Custom user entries (lunch / break / arbitrary). */
  customEntries: CustomEntry[]
  /** Per-talk partial-attendance overrides. */
  overrides: AttendanceOverride[]
  /** Display name used when sharing. */
  displayName: string
  /** Saved friend schedules (imported via share link). */
  friends: FriendSchedule[]

  addTalk: (id: string) => void
  removeTalk: (id: string) => void
  toggleTalk: (id: string) => void
  setTalks: (ids: string[]) => void

  addCustomEntry: (entry: CustomEntry) => void
  updateCustomEntry: (id: string, patch: Partial<CustomEntry>) => void
  removeCustomEntry: (id: string) => void

  setOverride: (id: string, patch: { s?: string | null; e?: string | null }) => void
  clearOverride: (id: string) => void

  setDisplayName: (name: string) => void

  /** Replace the entire user plan with the contents of a shared payload. */
  importAsOwn: (payload: {
    name: string
    talkIds: string[]
    custom?: CustomEntry[]
    overrides?: AttendanceOverride[]
  }) => void

  addFriend: (f: Omit<FriendSchedule, 'id' | 'addedAt'>) => string
  removeFriend: (id: string) => void

  clear: () => void
}

function rid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      selectedTalkIds: [],
      customEntries: [],
      overrides: [],
      displayName: '',
      friends: [],

      addTalk: (id) =>
        set((s) =>
          s.selectedTalkIds.includes(id)
            ? s
            : { selectedTalkIds: [...s.selectedTalkIds, id] },
        ),
      removeTalk: (id) =>
        set((s) => ({
          selectedTalkIds: s.selectedTalkIds.filter((t) => t !== id),
          overrides: s.overrides.filter((o) => o.id !== id),
        })),
      toggleTalk: (id) =>
        set((s) =>
          s.selectedTalkIds.includes(id)
            ? {
                selectedTalkIds: s.selectedTalkIds.filter((t) => t !== id),
                overrides: s.overrides.filter((o) => o.id !== id),
              }
            : { selectedTalkIds: [...s.selectedTalkIds, id] },
        ),
      setTalks: (ids) => set({ selectedTalkIds: [...new Set(ids)] }),

      addCustomEntry: (entry) =>
        set((s) => ({ customEntries: [...s.customEntries, entry] })),
      updateCustomEntry: (id, patch) =>
        set((s) => ({
          customEntries: s.customEntries.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        })),
      removeCustomEntry: (id) =>
        set((s) => ({
          customEntries: s.customEntries.filter((c) => c.id !== id),
        })),

      setOverride: (id, patch) =>
        set((s) => {
          const existing = s.overrides.find((o) => o.id === id)
          const next: AttendanceOverride = {
            id,
            s:
              patch.s === null
                ? undefined
                : patch.s !== undefined
                ? patch.s
                : existing?.s,
            e:
              patch.e === null
                ? undefined
                : patch.e !== undefined
                ? patch.e
                : existing?.e,
          }
          const stripped = !next.s && !next.e
          const others = s.overrides.filter((o) => o.id !== id)
          return { overrides: stripped ? others : [...others, next] }
        }),
      clearOverride: (id) =>
        set((s) => ({ overrides: s.overrides.filter((o) => o.id !== id) })),

      setDisplayName: (name) => set({ displayName: name }),

      importAsOwn: ({ name, talkIds, custom, overrides }) =>
        set({
          selectedTalkIds: [...new Set(talkIds)],
          customEntries: custom ? [...custom] : [],
          overrides: overrides ? [...overrides] : [],
          displayName: name,
        }),

      addFriend: (f) => {
        const id = rid()
        set((s) => ({
          friends: [
            ...s.friends.filter((x) => x.name !== f.name),
            { ...f, id, addedAt: Date.now() },
          ],
        }))
        return id
      },
      removeFriend: (id) =>
        set((s) => ({ friends: s.friends.filter((f) => f.id !== id) })),

      clear: () =>
        set({
          selectedTalkIds: [],
          customEntries: [],
          overrides: [],
          displayName: '',
        }),
    }),
    {
      name: 'dou-day-2026:state',
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
)
