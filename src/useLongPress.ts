import { useRef, type MouseEvent, type PointerEvent } from 'react'

/**
 * Long press (and right click) for a menu, like iOS context menus. Moving
 * the finger (scrolling) cancels it; the click after a long press is eaten,
 * so the normal tap action does not also run.
 */
export function useLongPress(onLongPress: () => void, delay = 450) {
  const timer = useRef<number>(undefined)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)
  const cancel = () => {
    window.clearTimeout(timer.current)
    start.current = null
  }
  return {
    onPointerDown(event: PointerEvent) {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      fired.current = false
      start.current = { x: event.clientX, y: event.clientY }
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        fired.current = true
        start.current = null
        onLongPress()
      }, delay)
    },
    onPointerMove(event: PointerEvent) {
      const from = start.current
      if (
        from &&
        Math.hypot(event.clientX - from.x, event.clientY - from.y) > 10
      )
        cancel()
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture(event: MouseEvent) {
      if (!fired.current) return
      fired.current = false
      event.preventDefault()
      event.stopPropagation()
    },
    onContextMenu(event: MouseEvent) {
      event.preventDefault()
      cancel()
      fired.current = false
      onLongPress()
    },
  }
}
