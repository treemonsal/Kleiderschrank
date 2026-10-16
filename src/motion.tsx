import { useEffect, useRef, type MouseEvent } from 'react'

/** Short, replayable feedback. It never controls an action or a saved state. */
export function useTapMotion() {
  const active = useRef(new Map<Element, Animation>())
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const stop = () => {
      for (const animation of active.current.values()) animation.cancel()
      active.current.clear()
    }
    const change = () => {
      if (preference.matches) stop()
    }
    preference.addEventListener('change', change)
    return () => {
      preference.removeEventListener('change', change)
      stop()
    }
  }, [])
  return (event: MouseEvent<HTMLElement>) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('button[data-motion]')
        : null
    if (!button || button.disabled) return
    const animate = (
      target: Element | null,
      frames: Keyframe[],
      duration: number,
    ) => {
      if (!target?.animate) return
      try {
        active.current.get(target)?.cancel()
        const animation = target.animate(frames, {
          duration,
          easing: 'cubic-bezier(.22,.8,.3,1)',
        })
        active.current.set(target, animation)
        const clear = () => {
          if (active.current.get(target) === animation)
            active.current.delete(target)
        }
        animation.onfinish = clear
        animation.oncancel = clear
      } catch {
        /* Motion is optional; the button's action still runs. */
      }
    }
    const icon = button.querySelector('.nav-icon, svg')
    switch (button.dataset.motion) {
      case 'laundry':
        animate(
          icon,
          [
            { transform: 'rotate(0)' },
            { transform: 'rotate(-9deg)', offset: 0.2 },
            { transform: 'rotate(6deg)', offset: 0.45 },
            { transform: 'rotate(-3deg)', offset: 0.7 },
            { transform: 'rotate(0)' },
          ],
          520,
        )
        animate(
          button.querySelector('[data-washer-drum]'),
          [
            { transform: 'rotate(0)' },
            { transform: 'rotate(385deg)', offset: 0.8 },
            { transform: 'rotate(360deg)' },
          ],
          680,
        )
        break
      case 'heart':
        animate(
          icon,
          button.getAttribute('aria-pressed') === 'true'
            ? [
                { transform: 'scale(1)' },
                { transform: 'scale(.82)', offset: 0.3 },
                { transform: 'scale(1)' },
              ]
            : [
                { transform: 'scale(1)' },
                { transform: 'scale(.78)', offset: 0.15 },
                { transform: 'scale(1.28)', offset: 0.45 },
                { transform: 'scale(.96)', offset: 0.75 },
                { transform: 'scale(1)' },
              ],
          420,
        )
        break
      case 'nav':
        animate(
          icon,
          [
            { transform: 'translateY(0) scale(1)' },
            { transform: 'translateY(-3px) scale(1.12)', offset: 0.4 },
            { transform: 'translateY(1px) scale(.98)', offset: 0.75 },
            { transform: 'translateY(0) scale(1)' },
          ],
          390,
        )
        break
      case 'turn':
        animate(
          icon,
          [{ transform: 'rotate(0)' }, { transform: 'rotate(180deg)' }],
          420,
        )
        break
      default:
        animate(
          icon,
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.18)', offset: 0.45 },
            { transform: 'scale(1)' },
          ],
          340,
        )
    }
  }
}

export function LaundryIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="laundry-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="2" width="18" height="20" rx="2" />
      <path d="M7 6h3m6 0h.01" />
      <g data-washer-drum="">
        <circle cx="12" cy="14" r="5" />
        <path d="M7 14c2-2 3 2 5 0s3 2 5 0" />
      </g>
    </svg>
  )
}
