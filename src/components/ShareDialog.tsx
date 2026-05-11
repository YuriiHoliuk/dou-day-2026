import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Check, Share2, X, Download } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useScheduleStore } from '@/store/schedule'
import { buildShareUrl } from '@/lib/urlState'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function ShareDialog({ open, onOpenChange }: Props) {
  const displayName = useScheduleStore((s) => s.displayName)
  const setDisplayName = useScheduleStore((s) => s.setDisplayName)
  const talkIds = useScheduleStore((s) => s.selectedTalkIds)
  const customEntries = useScheduleStore((s) => s.customEntries)
  const overrides = useScheduleStore((s) => s.overrides)

  const [draftName, setDraftName] = useState(displayName)
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (open) setDraftName(displayName)
  }, [open, displayName])

  const url = useMemo(() => {
    if (typeof window === 'undefined') return ''
    if (!draftName.trim()) return ''
    return buildShareUrl({
      v: 1,
      name: draftName.trim(),
      talkIds,
      custom: customEntries,
      overrides,
    })
  }, [draftName, talkIds, customEntries, overrides])

  useEffect(() => {
    if (!url) {
      setQrDataUrl('')
      return
    }
    const dark = theme === 'dark'
    QRCode.toDataURL(url, {
      margin: 1,
      width: 240,
      color: {
        dark: dark ? '#fafaf9' : '#0c0a09',
        light: dark ? '#19181500' : '#ffffff00',
      },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(() => setQrDataUrl(''))
  }, [url, theme])

  const handleCopy = async () => {
    if (!url) return
    setDisplayName(draftName.trim())
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // older browsers — fallback selection
      const range = document.createRange()
      const sel = window.getSelection()
      const node = document.createTextNode(url)
      document.body.appendChild(node)
      range.selectNodeContents(node)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }

  const handleDownloadQr = () => {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `dou-day-2026-${(draftName || 'plan').trim()}.png`
    a.click()
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm anim-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[min(540px,calc(100vw-2rem))] max-h-[88vh] overflow-y-auto',
            'rounded-lg border bg-card shadow-2xl shadow-black/30',
            'anim-fade-up',
          )}
        >
          <header className="flex items-start justify-between gap-3 border-b px-7 pt-6 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                <Share2 className="size-3" /> Поділитися
              </div>
              <DialogPrimitive.Title className="mt-2 text-2xl font-semibold tracking-tight">
                Твій план DOU Day
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                Згенеруй посилання — друг зможе побачити твій розклад і порівняти зі своїм.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </header>

          <div className="px-7 py-6 space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-1.5">
                Ваше ім'я
              </label>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Олена К."
                autoFocus
                className="w-full rounded-md border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {talkIds.length} {pluralize(talkIds.length, ['доповідь', 'доповіді', 'доповідей'])}
                {customEntries.length > 0 &&
                  ` · ${customEntries.length} ${pluralize(customEntries.length, ['власний запис', 'власні записи', 'власних записів'])}`}
              </p>
            </div>

            {url ? (
              <>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-1.5">
                    Посилання
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={url}
                      className="flex-1 min-w-0 rounded-md border bg-muted/40 px-3 py-2 text-xs tabular text-muted-foreground"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        copied
                          ? 'bg-signal text-signal-foreground'
                          : 'bg-foreground text-background hover:opacity-90',
                      )}
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {copied ? 'Скопійовано' : 'Копія'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-5 rounded-lg border bg-background/40 p-4">
                  <div className="size-[152px] shrink-0 rounded-md bg-background flex items-center justify-center overflow-hidden">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR-код посилання" className="size-full" />
                    ) : (
                      <div className="text-xs text-muted-foreground">…</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">QR-код</div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      Покажи екран другу — він відсканує телефоном і одразу отримає твій план.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      disabled={!qrDataUrl}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                    >
                      <Download className="size-3" />
                      Завантажити PNG
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                Введи ім'я, щоб згенерувати посилання.
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function pluralize(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const n1 = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (n1 > 1 && n1 < 5) return forms[1]
  if (n1 === 1) return forms[0]
  return forms[2]
}

export { pluralize }
