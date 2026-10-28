import {
  useLayoutEffect,
  useRef,
  type TouchEvent,
  type MouseEvent,
} from 'react'
import { shiftDay } from './calendar'
import {
  animateSpring,
  project,
  releaseVelocity,
  rubberband,
  SPRING_SHEET,
  type SpringAnimation,
} from './spring'

export function useDaySwipe(move: (offset: number) => void, day: string) {
  const root = useRef<HTMLDivElement>(null)
  const start = useRef<{
    x: number
    y: number
    time: number
    id: number
    dragged: boolean
    samples: { value: number; time: number }[]
  } | null>(null)
  const settle = useRef<SpringAnimation | null>(null)
  const offsetX = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const frame = useRef<number | undefined>(undefined)
  const arriving = useRef(0)
  const moving = useRef(false)
  const suppressClick = useRef(0)
  const callback = useRef(move)
  callback.current = move
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  const card = () => root.current?.querySelector<HTMLElement>('.day-slide')
  function place(x: number) {
    offsetX.current = x
    const node = card()
    if (node) {
      node.style.transition = 'none'
      node.style.transform = x ? `translateX(${x}px)` : ''
    }
  }
  /** Springs the card home, keeping the finger's velocity. */
  function reset(animate = true, velocity = 0) {
    settle.current?.stop()
    settle.current = null
    const node = card()
    if (!node) return
    if (!animate || reduced() || !offsetX.current) {
      node.style.transition = ''
      node.style.transform = ''
      offsetX.current = 0
      return
    }
    settle.current = animateSpring({
      from: { value: offsetX.current, velocity },
      to: 0,
      config: SPRING_SHEET,
      onUpdate: place,
      onComplete: () => (settle.current = null),
    })
  }
  // Manual navigation cancels an unfinished swipe. A completed swipe brings the new day in.
  useLayoutEffect(() => {
    clearTimeout(timer.current)
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    settle.current?.stop()
    settle.current = null
    offsetX.current = 0
    start.current = null
    moving.current = false
    const direction = arriving.current
    arriving.current = 0
    const node = card()
    if (node && direction && !reduced()) {
      // The new day arrives from the side the finger pushed towards.
      place(direction * 40)
      frame.current = requestAnimationFrame(() => reset())
    } else reset(false)
    return () => {
      clearTimeout(timer.current)
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    }
  }, [day])

  function blocked(target: EventTarget | null, element: HTMLElement) {
    if (
      document.querySelector('dialog[open]') ||
      element.querySelector('[data-day-busy="true"]') ||
      document.activeElement?.matches(
        'input,textarea,select,[contenteditable="true"]',
      ) ||
      window.getSelection()?.toString()
    )
      return true
    let node = target instanceof Element ? target : null
    const control = node?.closest(
      'button,input,textarea,select,a,summary,label,[role="slider"],[contenteditable="true"],[data-no-swipe]',
    )
    if (
      control &&
      !control.matches('.outfit-piece, .piece-swap, .home-week-strip > button')
    )
      return true
    while (node && node !== element) {
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
    ref: root,
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (
        performance.now() < suppressClick.current &&
        (event.target as Element).closest(
          '.outfit-piece, .piece-swap, .home-week-strip > button',
        )
      ) {
        event.preventDefault()
        event.stopPropagation()
      }
    },
    onTouchStart(event: TouchEvent<HTMLElement>) {
      if (moving.current) return
      // Grabbing the card mid-spring continues from where it is.
      const live = settle.current ? offsetX.current : 0
      settle.current?.stop()
      settle.current = null
      if (!live) reset(false)
      start.current = null
      if (
        event.touches.length !== 1 ||
        blocked(event.target, event.currentTarget)
      )
        return
      const touch = event.touches[0]
      // Leave screen edges to the browser's back/forward gestures.
      if (touch.clientX < 24 || touch.clientX > innerWidth - 24) return
      start.current = {
        x: touch.clientX - live,
        y: touch.clientY,
        time: Date.now(),
        id: touch.identifier,
        dragged: false,
        samples: [{ value: touch.clientX, time: performance.now() }],
      }
    },
    onTouchMove(event: TouchEvent<HTMLElement>) {
      const first = start.current
      if (!first) return
      if (
        event.touches.length !== 1 ||
        blocked(event.target, event.currentTarget)
      ) {
        start.current = null
        reset()
        return
      }
      const touch = event.touches[0],
        dx = touch.clientX - first.x,
        dy = touch.clientY - first.y
      if (Math.abs(dy) > 30 && Math.abs(dy) > Math.abs(dx)) {
        start.current = null
        reset()
        return
      }
      first.samples.push({ value: touch.clientX, time: performance.now() })
      if (first.samples.length > 8) first.samples.shift()
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.8) {
        first.dragged = true
        if (!reduced())
          // No neighbouring day: the card resists like a boundary.
          place(
            shiftDay(day, dx < 0 ? 1 : -1)
              ? Math.max(-innerWidth * 0.7, Math.min(innerWidth * 0.7, dx))
              : rubberband(dx, innerWidth),
          )
      }
    },
    onTouchCancel() {
      if (start.current?.dragged)
        suppressClick.current = performance.now() + 400
      start.current = null
      reset()
    },
    onTouchEnd(event: TouchEvent<HTMLElement>) {
      const first = start.current
      start.current = null
      if (!first) return
      if (first.dragged) suppressClick.current = performance.now() + 400
      const touch = Array.from(event.changedTouches).find(
        (touch) => touch.identifier === first.id,
      )
      if (!touch || blocked(event.target, event.currentTarget)) {
        reset()
        return
      }
      const dx = touch.clientX - first.x,
        dy = touch.clientY - first.y
      const offset = dx < 0 ? 1 : -1
      const velocity = releaseVelocity(
        [...first.samples, { value: touch.clientX, time: performance.now() }],
        performance.now(),
      )
      // Far enough, or thrown far enough; a flick back cancels.
      const thrown =
        Math.abs(dx) >= 48 &&
        Math.abs(dx + project(velocity)) > innerWidth * 0.5
      if (
        !(Math.abs(dx) >= 80 || thrown) ||
        velocity * dx < -40000 ||
        Math.abs(dx) < Math.abs(dy) * 1.8 ||
        !shiftDay(day, offset)
      ) {
        reset(true, velocity)
        return
      }
      if (reduced()) {
        reset(false)
        callback.current(offset)
        return
      }
      const node = card()
      if (node) {
        node.style.transition = 'transform 120ms ease-in'
        node.style.transform = `translateX(${-offset * innerWidth}px)`
      }
      moving.current = true
      timer.current = setTimeout(() => {
        // Recheck before a delayed change, e.g. when a dialog opened meanwhile.
        if (root.current && !blocked(root.current, root.current)) {
          arriving.current = offset
          callback.current(offset)
        } else {
          moving.current = false
          reset()
        }
      }, 125)
    },
  }
}
