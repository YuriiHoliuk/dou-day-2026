import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { CalendarDays, Star, ArrowRight, X, Sparkles, RefreshCw, Users } from 'lucide-react'
import Timeline from '@/pages/Timeline'
import MySchedule from '@/pages/MySchedule'
import Friends from '@/pages/Friends'
import Compare from '@/pages/Compare'
import { Header } from '@/components/Header'
import { ThemeProvider } from '@/lib/theme'
import { decodeSchedule, extractShareFromHash } from '@/lib/urlState'
import { useScheduleStore } from '@/store/schedule'
import { usePwaUpdate } from '@/hooks/usePwaUpdate'
import { agenda } from '@/lib/agenda'
import { cn, plural } from '@/lib/utils'

function Shell() {
  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/my" element={<MySchedule />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <ShareImporter />
      <UpdateToast />
    </div>
  )
}

function Footer() {
  return (
    <footer
      data-app-footer
      className="no-print border-t mt-10 py-8 text-xs text-muted-foreground"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          Неофіційний клієнт DOU Day 2026 ·{' '}
          <a
            href={agenda.event.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="underline-offset-2 hover:underline"
          >
            офіційна агенда
          </a>
        </div>
        <div className="tabular">
          {agenda.talks.length} записів · {agenda.event.tracks.length} треків · {agenda.event.rooms.length} сцен
        </div>
      </div>
    </footer>
  )
}

/* ─────────────── Hero ─────────────── */

function Hero() {
  const selected = useScheduleStore((s) => s.selectedTalkIds.length)
  return (
    <section className="relative overflow-hidden grain">
      {/* radial atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background:
            'radial-gradient(80% 60% at 50% -10%, color-mix(in oklch, var(--signal) 20%, transparent), transparent 60%)',
        }}
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 pt-16 sm:pt-24 pb-20 relative">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur px-3 py-1 text-[11px] tabular text-muted-foreground anim-fade-up">
          <span className="size-1.5 rounded-full bg-signal animate-pulse" />
          15–17 травня 2026 · {agenda.event.venue}
        </div>

        <h1
          className="mt-6 text-5xl sm:text-7xl lg:text-[88px] font-semibold tracking-[-0.035em] leading-[0.95] anim-fade-up"
          style={{ animationDelay: '60ms' }}
        >
          Збери свій{' '}
          <span className="relative inline-block">
            <span className="relative z-10">DOU&nbsp;Day</span>
            <span
              className="absolute -bottom-1 left-0 right-0 h-[10px] -z-0 rounded-full"
              style={{ background: 'color-mix(in oklch, var(--signal) 70%, transparent)' }}
              aria-hidden
            />
          </span>
          <br />
          <span className="text-muted-foreground/80">так як хочеш ти.</span>
        </h1>

        <p
          className="mt-6 max-w-[58ch] text-[15px] sm:text-base text-muted-foreground leading-relaxed anim-fade-up"
          style={{ animationDelay: '120ms' }}
        >
          6 сцен, 85 доповідей, 97 спікерів — без бюрократії таблиць. Зірочка біля доповіді → твій план.{' '}
          Поділись посиланням, побач, що дивляться друзі, збережи у PDF на A4.
        </p>

        <div
          className="mt-8 flex flex-wrap items-center gap-3 anim-fade-up"
          style={{ animationDelay: '180ms' }}
        >
          <NavLink
            to="/timeline"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity group"
          >
            <CalendarDays className="size-4" />
            Відкрити розклад
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </NavLink>
          <NavLink
            to="/my"
            className="inline-flex items-center gap-1.5 rounded-md border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Star className="size-4" />
            Мій план
            {selected > 0 && (
              <span className="ml-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-signal text-signal-foreground px-1.5 text-[10px] font-semibold tabular">
                {selected}
              </span>
            )}
          </NavLink>
        </div>

        {/* feature grid */}
        <div
          className="mt-16 grid sm:grid-cols-3 gap-px bg-border rounded-lg overflow-hidden border anim-fade-up"
          style={{ animationDelay: '240ms' }}
        >
          <FeatureBox
            label="Гантт"
            title="Подивись усі 6 сцен одночасно"
            body="Густий таймлайн із кроком 30 хв і кольорами треків — побачиш конфлікти ще до того як їх створиш."
          />
          <FeatureBox
            label="Шеринг"
            title="Один лінк, нуль акаунтів"
            body="Стиснута URL-нагрузка + QR. Друг сканує — і ваші плани вже поряд."
          />
          <FeatureBox
            label="PWA"
            title="Працює без інтернету"
            body="Встанови як застосунок на телефон. Уся агенда зашита всередині — Wi-Fi у Kyiv Expo не потрібен."
          />
        </div>
      </div>
    </section>
  )
}

function FeatureBox({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <div className="bg-card p-5 sm:p-6">
      <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground tabular">
        {label}
      </div>
      <h3 className="mt-3 font-semibold tracking-tight leading-tight">{title}</h3>
      <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed">{body}</p>
    </div>
  )
}

/* ─────── Share-link importer (banner when #/s/… in URL) ─────── */

function ShareImporter() {
  const navigate = useNavigate()
  const setTalks = useScheduleStore((s) => s.setTalks)
  const setDisplayName = useScheduleStore((s) => s.setDisplayName)
  const addFriend = useScheduleStore((s) => s.addFriend)
  const [pending, setPending] = useState<{ name: string; talkIds: string[]; custom?: import('@/lib/urlState').CustomEntry[]; overrides?: import('@/lib/urlState').AttendanceOverride[] } | null>(null)

  useEffect(() => {
    const seg = extractShareFromHash(window.location.hash)
    if (!seg) return
    const decoded = decodeSchedule(seg)
    if (!decoded) return
    setPending({
      name: decoded.name || 'Без імені',
      talkIds: decoded.talkIds,
      custom: decoded.custom,
      overrides: decoded.overrides,
    })
  }, [])

  if (!pending) return null

  const close = () => {
    // strip hash
    history.replaceState(null, '', window.location.pathname + window.location.search)
    setPending(null)
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 no-print w-[min(540px,calc(100vw-2rem))] anim-fade-up">
      <div className="rounded-lg border bg-card shadow-2xl shadow-black/30 p-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-md bg-signal/15 text-signal shrink-0">
            <Sparkles className="size-4" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold tracking-tight">
              Імпортувати план — {pending.name}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pending.talkIds.length} {plural(pending.talkIds.length, ['доповідь', 'доповіді', 'доповідей'])}
              {pending.custom?.length
                ? ` · ${pending.custom.length} ${plural(pending.custom.length, ['власний запис', 'власні записи', 'власних записів'])}`
                : ''}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  addFriend({
                    name: pending.name,
                    talkIds: pending.talkIds,
                    custom: pending.custom,
                    overrides: pending.overrides,
                  })
                  close()
                  navigate('/friends')
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-90"
              >
                <Users className="size-3.5" />
                Зберегти як друга
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Замінити твій поточний план на цей?')) {
                    setTalks(pending.talkIds)
                    setDisplayName(pending.name)
                    close()
                    navigate('/my')
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Завантажити як мій
              </button>
              <button
                type="button"
                onClick={close}
                className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label="Закрити"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────── PWA update toast ─────── */

function UpdateToast() {
  const { needRefresh, apply, dismiss } = usePwaUpdate()
  if (!needRefresh) return null
  return (
    <div className={cn('fixed top-16 right-4 z-50 no-print w-[min(360px,calc(100vw-2rem))] anim-fade-up')}>
      <div className="rounded-lg border bg-card shadow-xl p-3.5 flex items-start gap-3">
        <span className="inline-flex size-8 items-center justify-center rounded-md bg-signal/15 text-signal shrink-0">
          <RefreshCw className="size-3.5" />
        </span>
        <div className="flex-1 text-xs">
          <div className="font-semibold text-sm">Доступне оновлення</div>
          <p className="mt-0.5 text-muted-foreground">
            Перезавантаж сторінку — підтягне свіжу версію.
          </p>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => void apply()}
              className="rounded-md bg-foreground text-background px-2.5 py-1 text-xs font-medium hover:opacity-90"
            >
              Оновити
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Пізніше
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Shell />
      </BrowserRouter>
    </ThemeProvider>
  )
}
