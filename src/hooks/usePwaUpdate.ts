import { useEffect, useState, useCallback } from 'react'
import { registerSW } from 'virtual:pwa-register'

export function usePwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const update = registerSW({
      immediate: true,
      onNeedRefresh: () => setNeedRefresh(true),
    })
    setUpdateSW(() => update)
  }, [])

  const apply = useCallback(async () => {
    if (updateSW) await updateSW(true)
  }, [updateSW])

  return {
    needRefresh,
    dismiss: () => setNeedRefresh(false),
    apply,
  }
}
