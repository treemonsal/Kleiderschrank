import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

/** Progressive enhancement: navigation stays functional without the animation API. */
export function useViewMotion() {
  const active = useRef<ViewTransition | undefined>(undefined)
  const sequence = useRef(0)
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const stop = () => {
      if (preference.matches) active.current?.skipTransition()
    }
    preference.addEventListener('change', stop)
    return () => {
      sequence.current++
      preference.removeEventListener('change', stop)
      active.current?.skipTransition()
    }
  }, [])
  return (update: () => void, animate = true, after?: () => void) => {
    const request = ++sequence.current
    active.current?.skipTransition()
    const commit = () => {
      if (request === sequence.current) {
        flushSync(update)
        after?.()
      }
    }
    if (
      !animate ||
      !document.startViewTransition ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      document.documentElement.dataset.viewMotion = 'fallback'
      commit()
      return
    }
    try {
      document.documentElement.dataset.viewMotion = 'native'
      const transition = document.startViewTransition(commit)
      active.current = transition
      // Hidden pages or a second quick tap may skip snapshots; the update still applies.
      void transition.ready.catch(() => {})
      void transition.finished
        .catch(() => {})
        .finally(() => {
          if (active.current === transition) active.current = undefined
        })
    } catch {
      document.documentElement.dataset.viewMotion = 'fallback'
      commit()
    }
  }
}
