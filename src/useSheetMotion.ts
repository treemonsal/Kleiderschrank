import { useEffect, useRef, type RefObject } from 'react'
import {
  animateSpring,
  project,
  releaseVelocity,
  rubberband,
  SPRING_SHEET,
  type SpringAnimation,
  type SpringConfig,
} from './spring'

const ENTER: SpringConfig = { damping: 1, response: 0.36 }
const EXIT: SpringConfig = { damping: 1, response: 0.28 }
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const EDITABLE =
  'input, textarea, select, [contenteditable="true"], [role="slider"], [data-no-swipe]'

/**
 * A sheet that rises on a spring, follows the finger 1:1 when pulled down
 * (by the grabber and header, or from the content once it is scrolled to the
 * top), keeps the finger's velocity on release, projects where a flick would
 * land and can be grabbed again mid-flight. It leaves the way it came.
 */
export function useSheetMotion(
  ref: RefObject<HTMLDialogElement | null>,
  options: {
    /** May the sheet go now? false springs it back (e.g. unsaved changes). */
    request: () => boolean
    /** While false, pulling meets resistance in both directions. */
    movable: () => boolean
    onDismissed: () => void
  },
) {
  const position = useRef(0)
  const animation = useRef<SpringAnimation | null>(null)
  const closing = useRef(false)
  const mounted = useRef(true)
  const latest = useRef(options)
  latest.current = options

  const height = () => ref.current?.offsetHeight || innerHeight
  function apply(y: number) {
    position.current = y
    const dialog = ref.current
    if (!dialog) return
    dialog.style.transform = y ? `translate3d(0, ${y}px, 0)` : ''
    dialog.style.setProperty(
      '--sheet-progress',
      String(Math.min(1, Math.max(0, 1 - y / height()))),
    )
  }
  /** Stops any motion and returns the live velocity (interruptible). */
  function halt() {
    const live = animation.current?.stop()
    animation.current = null
    return live?.velocity ?? 0
  }
  function springTo(
    to: number,
    velocity: number,
    config: SpringConfig,
    done?: () => void,
  ) {
    halt()
    animation.current = animateSpring({
      from: { value: position.current, velocity },
      to,
      config,
      precision: to > 0 ? 6 : 0.5,
      onUpdate: apply,
      onComplete: () => {
        animation.current = null
        done?.()
      },
    })
  }
  /**
   * Closing takes effect at once (the sheet's work stops, focus returns);
   * a silent, inert copy then leaves the way the sheet came.
   */
  function leave(velocity = 0) {
    if (closing.current) return
    closing.current = true
    const dialog = ref.current
    const ghost = dialog
      ? leaveAsGhost(dialog, position.current, velocity)
      : undefined
    halt()
    latest.current.onDismissed()
    // A parent may keep the sheet (e.g. while it saves): then the copy goes
    // and the sheet springs back, still closable afterwards.
    window.setTimeout(() => {
      if (!mounted.current) return
      ghost?.()
      closing.current = false
      if (!reduced()) springTo(0, velocity, SPRING_SHEET)
    }, 0)
  }

  // Arrive from below (or fade in with reduced motion).
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (reduced()) {
      dialog.animate?.([{ opacity: 0 }, { opacity: 1 }], {
        duration: 180,
        easing: 'ease-out',
      })
    } else {
      apply(height())
      springTo(0, 0, ENTER)
    }
    mounted.current = true
    return () => {
      mounted.current = false
      halt()
    }
  }, [])

  // Pulling down: grabber/header with any pointer, content by touch at the top.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    let drag: {
      startY: number
      startX: number
      origin: number
      samples: { value: number; time: number }[]
      active: boolean
      pointer?: number
    } | null = null

    let suppressClickUntil = 0
    function begin(x: number, y: number, active: boolean, pointer?: number) {
      if (reduced()) return false
      drag = {
        startX: x,
        startY: y,
        origin: position.current,
        samples: [{ value: y, time: performance.now() }],
        active,
        pointer,
      }
      if (active) grab(y)
      return true
    }
    /** The finger takes over: a leaving or arriving sheet stops where it is. */
    function grab(y: number) {
      if (!drag || closing.current) return
      halt()
      drag.active = true
      drag.startY = y
      drag.origin = position.current
      drag.samples = [{ value: y, time: performance.now() }]
    }
    function move(y: number) {
      if (!drag) return
      const raw = drag.origin + (y - drag.startY)
      const h = height()
      const free = latest.current.movable()
      apply(raw < 0 || !free ? rubberband(raw, h) : raw)
      drag.samples.push({ value: y, time: performance.now() })
      if (drag.samples.length > 8) drag.samples.shift()
    }
    function end() {
      if (!drag) return
      if (Math.abs(position.current - drag.origin) > 4)
        suppressClickUntil = performance.now() + 350
      const velocity = releaseVelocity(drag.samples, performance.now())
      drag = null
      const h = height()
      const resting = position.current + project(velocity)
      const commit =
        velocity > -60 && resting > h * 0.45 && latest.current.movable()
      if (commit && latest.current.request()) leave(velocity)
      else springTo(0, velocity, SPRING_SHEET)
    }

    const grabbable = (target: EventTarget | null) =>
      target instanceof Element &&
      !!target.closest('.sheet-handle, .sheet-header') &&
      !target.closest('button, a, ' + EDITABLE)

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || !grabbable(event.target))
        return
      if (!begin(event.clientX, event.clientY, true, event.pointerId)) return
      dialog.setPointerCapture?.(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (drag?.pointer === event.pointerId) move(event.clientY)
    }
    const onPointerUp = (event: PointerEvent) => {
      if (drag?.pointer !== event.pointerId) return
      dialog.releasePointerCapture?.(event.pointerId)
      end()
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || drag) return
      const target = event.target
      if (grabbable(target)) return
      if (target instanceof Element && target.closest(EDITABLE)) return
      if (dialog.scrollTop > 0) return
      const touch = event.touches[0]
      begin(touch.clientX, touch.clientY, false)
    }
    const onTouchMove = (event: TouchEvent) => {
      if (!drag || drag.pointer !== undefined) return
      const touch = event.touches[0]
      const dy = touch.clientY - drag.startY
      const dx = touch.clientX - drag.startX
      if (!drag.active) {
        if (Math.abs(dy) < 10 && Math.abs(dx) < 10) return
        // Only a clear pull down at the top becomes a drag; else it scrolls.
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || dialog.scrollTop > 0) {
          drag = null
          return
        }
        grab(touch.clientY)
      }
      event.preventDefault()
      move(touch.clientY)
    }
    const onTouchEnd = () => {
      if (!drag || drag.pointer !== undefined) return
      if (drag.active) end()
      else drag = null
    }

    // A drag that ends over the backdrop must not count as a tap on it.
    const onClick = (event: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        event.stopPropagation()
        event.preventDefault()
      }
    }
    dialog.addEventListener('click', onClick, true)
    dialog.addEventListener('pointerdown', onPointerDown)
    dialog.addEventListener('pointermove', onPointerMove)
    dialog.addEventListener('pointerup', onPointerUp)
    dialog.addEventListener('pointercancel', onPointerUp)
    dialog.addEventListener('touchstart', onTouchStart, { passive: true })
    dialog.addEventListener('touchmove', onTouchMove, { passive: false })
    dialog.addEventListener('touchend', onTouchEnd)
    dialog.addEventListener('touchcancel', onTouchEnd)
    return () => {
      dialog.removeEventListener('click', onClick, true)
      dialog.removeEventListener('pointerdown', onPointerDown)
      dialog.removeEventListener('pointermove', onPointerMove)
      dialog.removeEventListener('pointerup', onPointerUp)
      dialog.removeEventListener('pointercancel', onPointerUp)
      dialog.removeEventListener('touchstart', onTouchStart)
      dialog.removeEventListener('touchmove', onTouchMove)
      dialog.removeEventListener('touchend', onTouchEnd)
      dialog.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  return {
    /** Leaves along the way it came, then reports the sheet as closed. */
    dismiss() {
      if (!closing.current) leave()
    },
  }
}

/**
 * An inert visual copy of a closing sheet that springs out of view.
 * Returns a function that removes it at once.
 */
function leaveAsGhost(
  dialog: HTMLDialogElement,
  from: number,
  velocity: number,
): (() => void) | undefined {
  const rect = dialog.getBoundingClientRect()
  if (!rect.height) return undefined
  const scrim = document.createElement('div')
  scrim.className = 'sheet-ghost-scrim'
  const ghost = document.createElement('div')
  ghost.className = `${dialog.className} sheet-ghost`
  ghost.setAttribute('aria-hidden', 'true')
  ghost.inert = true
  Object.assign(ghost.style, {
    left: `${rect.left}px`,
    top: `${rect.top - from}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  })
  const inner = document.createElement('div')
  inner.style.transform = `translateY(${-dialog.scrollTop}px)`
  for (const child of Array.from(dialog.children))
    inner.append(child.cloneNode(true))
  silence(inner)
  ghost.append(inner)
  document.body.append(scrim, ghost)
  const remove = () => {
    scrim.remove()
    ghost.remove()
  }
  const progress = dialog.style.getPropertyValue('--sheet-progress')
  if (progress) scrim.style.opacity = progress
  if (reduced()) {
    ghost.style.transform = `translate3d(0, ${from}px, 0)`
    const fadeOut = [{ opacity: 1 }, { opacity: 0 }]
    const timing = {
      duration: 160,
      easing: 'ease-out',
      fill: 'forwards',
    } as const
    scrim.animate?.(fadeOut, timing)
    const animation = ghost.animate?.(fadeOut, timing)
    if (animation) animation.onfinish = remove
    else remove()
    return remove
  }
  const distance = rect.height + 24
  const spring = animateSpring({
    from: { value: from, velocity: Math.max(velocity, 0) },
    to: distance,
    config: EXIT,
    precision: 6,
    onUpdate: (y) => {
      ghost.style.transform = `translate3d(0, ${y}px, 0)`
      scrim.style.opacity = String(Math.max(0, 1 - y / rect.height))
    },
    onComplete: remove,
  })
  return () => {
    spring.stop()
    remove()
  }
}

/** The copy must not be found as a second form: no labels, names or ids. */
function silence(root: HTMLElement) {
  for (const label of Array.from(root.querySelectorAll('label'))) {
    const span = document.createElement('span')
    span.className = label.className
    span.append(...Array.from(label.childNodes))
    label.replaceWith(span)
  }
  for (const node of Array.from(root.querySelectorAll('*')))
    for (const name of [
      'id',
      'for',
      'name',
      'role',
      'title',
      'placeholder',
      'aria-label',
      'aria-labelledby',
      'aria-describedby',
    ])
      node.removeAttribute(name)
  for (const image of Array.from(root.querySelectorAll('img'))) image.alt = ''
}
