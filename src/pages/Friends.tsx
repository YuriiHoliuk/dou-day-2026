import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Plus, Trash2, Users, GitCompare, X, Sparkles } from 'lucide-react'
import { useScheduleStore } from '@/store/schedule'
import { decodeSchedule, extractShareFromHash } from '@/lib/urlState'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn, plural } from '@/lib/utils'

export default function Friends() {
  const friends = useScheduleStore((s) => s.friends)
  const removeFriend = useScheduleStore((s) => s.removeFriend)
  const [open, setOpen] = useState(false)

  return (
    <section className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 pt-6 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
            Соціальний шар
          </div>
          <h1 className="mt-1 text-3xl sm:text-[36px] font-semibold tracking-[-0.02em] leading-none">
            Друзі
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-[60ch]">
            Імпортуй плани друзів — побачиш кого зустрінеш на конкретних доповідях і де ваші розклади розходяться.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="size-4" />
          Додати друга
        </button>
      </header>

      {friends.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 px-6 py-16 text-center">
          <Users className="mx-auto size-7 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground max-w-[42ch] mx-auto">
            Попроси друзів натиснути «Поділитись» у своєму плані і вставити сюди посилання — побачиш збіги ваших розкладів.
          </p>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {friends.map((f) => (
            <li
              key={f.id}
              className="group relative flex flex-col gap-3 rounded-lg border bg-card p-4 transition-[border-color,transform] duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:border-foreground/30"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-secondary font-semibold tabular text-sm">
                  {f.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="font-medium tracking-tight truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground tabular">
                    {f.talkIds.length} {plural(f.talkIds.length, ['доповідь', 'доповіді', 'доповідей'])}
                    {f.custom?.length
                      ? ` · ${f.custom.length} ${plural(f.custom.length, ['власний', 'власні', 'власних'])}`
                      : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFriend(f.id)}
                  className="ml-auto inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Прибрати друга"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div className="text-[11px] text-muted-foreground">
                додано {new Date(f.addedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
              </div>
              <RouterLink
                to={`/compare?friends=${f.id}`}
                className="mt-auto inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                <GitCompare className="size-3" />
                Порівняти
              </RouterLink>
            </li>
          ))}
        </ul>
      )}

      <AddFriendDialog open={open} onOpenChange={setOpen} />
    </section>
  )
}

function AddFriendDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const addFriend = useScheduleStore((s) => s.addFriend)
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ name: string; talks: number } | null>(null)

  function parse(value: string) {
    setUrl(value)
    setError(null)
    setPreview(null)
    const seg = extractShareFromHash(value.trim())
    if (!seg) {
      if (value.trim()) setError('Не схоже на посилання шерингу.')
      return
    }
    const decoded = decodeSchedule(seg)
    if (!decoded) {
      setError('Не вдалося розшифрувати посилання.')
      return
    }
    setPreview({ name: decoded.name || 'Без імені', talks: decoded.talkIds.length })
  }

  function handleAdd() {
    const seg = extractShareFromHash(url.trim())
    if (!seg) return
    const decoded = decodeSchedule(seg)
    if (!decoded) return
    addFriend({
      name: decoded.name || 'Без імені',
      talkIds: decoded.talkIds,
      custom: decoded.custom,
      overrides: decoded.overrides,
    })
    onOpenChange(false)
    setUrl('')
    setPreview(null)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm anim-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(520px,calc(100vw-2rem))] rounded-lg border bg-card shadow-2xl shadow-black/30 anim-fade-up">
          <header className="flex items-start justify-between gap-3 border-b px-6 py-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
                Додати друга
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-0.5 text-xs text-muted-foreground">
                Встав сюди посилання вигляду <span className="tabular">…#/s/…</span>
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </header>
          <div className="px-6 py-5 space-y-4">
            <textarea
              value={url}
              onChange={(e) => parse(e.target.value)}
              placeholder="https://… #/s/…"
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-xs tabular leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {error && (
              <p className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-xs">
                {error}
              </p>
            )}
            {preview && (
              <div className="flex items-center gap-3 rounded-md border bg-signal-soft/40 px-3 py-2.5">
                <Sparkles className="size-4 text-signal shrink-0" />
                <div className="text-sm">
                  <span className="font-medium">{preview.name}</span>
                  <span className="text-muted-foreground">
                    {' · '}
                    {preview.talks} {plural(preview.talks, ['доповідь', 'доповіді', 'доповідей'])}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!preview}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-opacity',
                  'bg-foreground text-background',
                  preview ? 'hover:opacity-90' : 'opacity-40 cursor-not-allowed',
                )}
              >
                Зберегти
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
