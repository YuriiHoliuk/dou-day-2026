import { Star, X, Globe, Send, Link as LinkIcon, ExternalLink, Crown, Clock, MapPin } from 'lucide-react'
import { useScheduleStore } from '@/store/schedule'
import type { Talk, SpeakerSocial } from '@/data/agenda.types'
import { Avatar } from './Avatar'
import { TrackTag } from './TrackDot'
import { speakerLabel, trackColorVar, typeLabel } from '@/lib/agenda'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

const SOCIAL_LABEL: Record<SpeakerSocial['type'], string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  twitter: 'Twitter / X',
  github: 'GitHub',
  instagram: 'Instagram',
  youtube: 'YouTube',
  telegram: 'Telegram',
  dou: 'DOU',
  link: 'Профіль',
}

function socialIcon(type: SpeakerSocial['type']) {
  if (type === 'telegram') return Send
  if (type === 'link') return LinkIcon
  return Globe
}

interface Props {
  talk: Talk | null
  onClose: () => void
}

export function TalkDialog({ talk, onClose }: Props) {
  const selected = useScheduleStore((s) => (talk ? s.selectedTalkIds.includes(talk.id) : false))
  const toggle = useScheduleStore((s) => s.toggleTalk)

  const open = !!talk
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm anim-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[min(720px,calc(100vw-2rem))] max-h-[88vh] overflow-y-auto scroll-hairline',
            'rounded-lg border bg-card shadow-2xl shadow-black/30',
            'anim-fade-up',
          )}
        >
          {talk && (
            <article>
              {/* track stripe */}
              <div
                className="h-1 w-full rounded-t-lg"
                style={{ background: trackColorVar(talk.track) }}
              />

              <header className="px-7 pt-7 pb-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <TrackTag track={talk.track} />
                    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground tabular">
                      {typeLabel(talk.type)}
                    </span>
                    {talk.language && talk.language !== 'UA' && (
                      <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider tabular">
                        {talk.language}
                      </span>
                    )}
                  </div>
                  <DialogPrimitive.Close className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                    <X className="size-4" />
                    <span className="sr-only">Закрити</span>
                  </DialogPrimitive.Close>
                </div>
                <DialogPrimitive.Title asChild>
                  <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
                    {talk.title}
                  </h2>
                </DialogPrimitive.Title>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    <span className="tabular">
                      {talk.startTime}–{talk.endTime}
                    </span>
                    <span className="text-xs">· {talk.durationMin} хв</span>
                  </span>
                  {talk.roomLabel && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {talk.roomLabel}
                    </span>
                  )}
                </div>
              </header>

              {talk.description ? (
                <div className="px-7 pb-2">
                  <DialogPrimitive.Description asChild>
                    <p className="text-[15px] leading-relaxed text-foreground/85 max-w-[65ch] whitespace-pre-line">
                      {talk.description}
                    </p>
                  </DialogPrimitive.Description>
                </div>
              ) : (
                /* Accessibility fallback: Radix requires a Description for every Dialog.
                   When the talk has none, supply a screen-reader-only summary. */
                <DialogPrimitive.Description className="sr-only">
                  {`${talk.startTime}–${talk.endTime}${talk.roomLabel ? `, ${talk.roomLabel}` : ''}`}
                </DialogPrimitive.Description>
              )}

              {talk.speakers.length > 0 && (
                <section className="px-7 py-5">
                  <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-3">
                    {talk.speakers.length === 1 ? 'Спікер' : 'Спікери'}
                  </h3>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {talk.speakers.map((sp, i) => (
                      <li
                        key={sp.name + i}
                        className="flex items-start gap-3 rounded-md border bg-background/50 p-3"
                      >
                        <Avatar speaker={sp} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium leading-tight">
                              {sp.name}
                            </span>
                            {sp.isModerator && (
                              <span className="inline-flex items-center gap-0.5 rounded-sm bg-signal/15 text-signal px-1 py-0.5 text-[9px] uppercase font-semibold tracking-wider">
                                <Crown className="size-2.5" /> мод.
                              </span>
                            )}
                          </div>
                          {speakerLabel(sp) && (
                            <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                              {speakerLabel(sp)}
                            </div>
                          )}
                          {sp.socials?.[0] && (() => {
                            const Icon = socialIcon(sp.socials[0].type)
                            const label = SOCIAL_LABEL[sp.socials[0].type] ?? 'Профіль'
                            return (
                              <a
                                href={sp.socials[0].url}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                              >
                                <Icon className="size-3" />
                                <span>{label}</span>
                                <ExternalLink className="size-3" />
                              </a>
                            )
                          })()}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {talk.coverImageUrl && (
                <div className="px-7 pb-5">
                  <img
                    src={talk.coverImageUrl}
                    alt=""
                    loading="lazy"
                    className="w-full rounded-md border"
                  />
                </div>
              )}

              <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-card/95 backdrop-blur px-7 py-4">
                <div className="text-xs text-muted-foreground">
                  {selected ? 'У вашому плані' : 'Не в плані'}
                </div>
                <div className="flex items-center gap-2">
                  {talk.registrationUrl && (
                    <a
                      href={talk.registrationUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                      Реєстрація
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(talk.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                      selected
                        ? 'bg-signal text-signal-foreground hover:bg-signal/90'
                        : 'bg-foreground text-background hover:opacity-90',
                    )}
                  >
                    <Star className={cn('size-3.5', selected && 'fill-current')} />
                    {selected ? 'Прибрати з плану' : 'Додати в план'}
                  </button>
                </div>
              </footer>
            </article>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
