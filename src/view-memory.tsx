import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react'

// Only committed UI state for this running app. No hidden pages, storage,
// network requests, consent changes or unfinished form drafts are retained.
const ViewMemory = createContext<Map<string, unknown> | null>(null)

export function ViewMemoryProvider({ children }: { children: ReactNode }) {
  const [memory] = useState(() => new Map<string, unknown>())
  return <ViewMemory.Provider value={memory}>{children}</ViewMemory.Provider>
}

export function useViewState<T>(key: string, initial: T | (() => T)) {
  const memory = useContext(ViewMemory)
  const [value, setValue] = useState<T>(() =>
    memory?.has(key)
      ? (memory.get(key) as T)
      : typeof initial === 'function'
        ? (initial as () => T)()
        : initial,
  )
  useLayoutEffect(() => {
    memory?.set(key, value)
  }, [memory, key, value])
  return [value, setValue] as const
}

/** Restore once content is tall enough; any deliberate user gesture wins. */
export function restorePageScroll(top: number) {
  if (typeof ResizeObserver === 'undefined') {
    window.scrollTo({ top, behavior: 'instant' })
    return () => {}
  }
  let stopped = false
  const main = document.getElementById('main-content')
  const stop = () => {
    stopped = true
    observer.disconnect()
    clearTimeout(timer)
    for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown'])
      window.removeEventListener(event, stop, true)
  }
  const restore = () => {
    if (stopped) return
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight)
    window.scrollTo({ top: Math.min(top, max), behavior: 'instant' })
    if (max >= top) stop()
  }
  const observer = new ResizeObserver(restore)
  const timer = window.setTimeout(stop, 2000)
  for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown'])
    window.addEventListener(event, stop, { capture: true, passive: true })
  if (main) observer.observe(main)
  restore()
  return stop
}
