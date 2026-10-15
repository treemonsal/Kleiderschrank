import { useRef, type TouchEvent } from 'react'
const pages = ['home', 'wardrobe', 'outfits', 'settings'] as const
type Page = (typeof pages)[number]
export function useSwipeNavigation(page: Page, navigate: (page: Page) => void) {
  const start = useRef<{
    x: number
    y: number
    time: number
    id: number
  } | null>(null)
  function blocked(target: EventTarget | null, root: HTMLElement) {
    if (
      document.querySelector('dialog[open]') ||
      document.activeElement?.matches(
        'input,textarea,select,[contenteditable="true"]',
      ) ||
      window.getSelection()?.toString()
    )
      return true
    let node = target instanceof Element ? target : null
    if (
      node?.closest(
        'button,input,textarea,select,a,summary,label,[role="slider"],[contenteditable="true"],[data-no-swipe]',
      )
    )
      return true
    while (node && node !== root) {
      if (
        node.scrollWidth > node.clientWidth + 2 &&
        /auto|scroll/.test(getComputedStyle(node).overflowX)
      )
        return true
      node = node.parentElement
    }
    return false
  }
  return {
    onTouchStart(event: TouchEvent<HTMLElement>) {
      start.current = null
      if (
        event.touches.length !== 1 ||
        blocked(event.target, event.currentTarget)
      )
        return
      const touch = event.touches[0]
      // Leave the screen edges to the browser's own back/forward gestures.
      if (touch.clientX < 24 || touch.clientX > innerWidth - 24) return
      start.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        id: touch.identifier,
      }
    },
    onTouchMove(event: TouchEvent<HTMLElement>) {
      if (event.touches.length !== 1) {
        start.current = null
        return
      }
      const touch = event.touches[0],
        first = start.current
      if (
        first &&
        Math.abs(touch.clientY - first.y) > 30 &&
        Math.abs(touch.clientY - first.y) > Math.abs(touch.clientX - first.x)
      )
        start.current = null
    },
    onTouchCancel() {
      start.current = null
    },
    onTouchEnd(event: TouchEvent<HTMLElement>) {
      const first = start.current
      start.current = null
      if (!first || blocked(event.target, event.currentTarget)) return
      const touch = Array.from(event.changedTouches).find(
        (touch) => touch.identifier === first.id,
      )
      if (!touch) return
      const dx = touch.clientX - first.x,
        dy = touch.clientY - first.y
      if (
        Math.abs(dx) < 80 ||
        Math.abs(dx) < Math.abs(dy) * 1.8 ||
        Date.now() - first.time > 800
      )
        return
      const next = pages[pages.indexOf(page) + (dx < 0 ? 1 : -1)]
      if (next) navigate(next)
    },
  }
}
