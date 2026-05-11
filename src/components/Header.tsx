import { NavLink } from 'react-router-dom'
import { CalendarDays, Star, Users, GitCompare, Moon, Sun, Share2, Download } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '@/lib/theme'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { cn } from '@/lib/utils'
import { ShareDialog } from './ShareDialog'
import { useScheduleStore } from '@/store/schedule'

const NAV = [
  { to: '/timeline', label: 'Розклад', icon: CalendarDays },
  { to: '/my', label: 'Мій план', icon: Star },
  { to: '/friends', label: 'Друзі', icon: Users },
  { to: '/compare', label: 'Порівняти', icon: GitCompare },
] as const

export function Header() {
  const { theme, toggle } = useTheme()
  const { canInstall, install } = usePwaInstall()
  const [shareOpen, setShareOpen] = useState(false)
  const selectedCount = useScheduleStore((s) => s.selectedTalkIds.length)

  return (
    <header
      data-app-header
      className="no-print sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 h-14 flex items-center gap-3 sm:gap-6">
        {/* wordmark */}
        <NavLink to="/" className="group inline-flex items-center gap-2.5 shrink-0">
          <span
            className="inline-block size-2.5 rounded-sm rotate-45 bg-signal"
            aria-hidden
          />
          <span className="font-semibold tracking-tight text-[15px]">
            DOU Day
          </span>
          <span className="tabular text-muted-foreground text-[13px] hidden sm:inline">
            ’26
          </span>
        </NavLink>

        {/* divider */}
        <div className="hidden sm:block h-5 w-px bg-border" aria-hidden />

        {/* nav — icons-only at narrow widths so all 4 destinations always fit;
            full labels appear from md upwards. whitespace-nowrap stops the
            active label from wrapping when the chip is wider than its slot. */}
        <nav
          data-app-nav
          className="flex items-center gap-0.5 sm:gap-1 text-sm overflow-x-auto scroll-hairline -mx-2 px-2"
        >
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                cn(
                  'relative inline-flex items-center gap-1.5 rounded-md px-2 sm:px-2.5 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap',
                  'text-muted-foreground hover:text-foreground hover:bg-accent/60',
                  isActive && 'text-foreground bg-accent',
                )
              }
            >
              <Icon className="size-3.5" aria-hidden />
              <span className="hidden md:inline">{label}</span>
              {to === '/my' && selectedCount > 0 && (
                <span className="ml-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-signal text-signal-foreground px-1 text-[10px] font-semibold tabular">
                  {selectedCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-1 sm:gap-1.5">
          {canInstall && (
            <button
              type="button"
              onClick={install}
              title="Встановити застосунок"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              <Download className="size-3.5" />
              Встановити
            </button>
          )}
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            title="Поділитися моїм планом"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-2.5 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Share2 className="size-3.5" />
            <span className="hidden sm:inline">Поділитись</span>
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Перемкнути на світлу тему' : 'Перемкнути на темну тему'}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </div>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
    </header>
  )
}
