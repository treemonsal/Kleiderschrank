import { useLayoutEffect, type RefObject } from 'react'

/**
 * Shrinks a single line of text until it fits its container, whatever font
 * the device renders (system font, Dynamic Type or a fallback). CSS sets the
 * largest size; this only ever makes it smaller.
 */
export function useFitText(ref: RefObject<HTMLElement | null>, text: string) {
  useLayoutEffect(() => {
    const node = ref.current
    const box = node?.parentElement
    if (!node || !box) return
    // Measuring must see the real size at once: a transition (even the tiny
    // one reduced motion forces on every element) would make it loop.
    node.style.setProperty('transition-property', 'none', 'important')
    const fit = () => {
      node.style.fontSize = ''
      const range = document.createRange()
      range.selectNodeContents(node)
      const needed = range.getBoundingClientRect().width
      const available = box.clientWidth
      if (needed > available && available > 0) {
        const size = parseFloat(getComputedStyle(node).fontSize)
        node.style.fontSize = `${Math.floor(((size * available) / needed) * 0.98 * 10) / 10}px`
      }
    }
    fit()
    let alive = true
    void document.fonts?.ready.then(() => {
      if (alive) fit()
    })
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(fit)
    observer?.observe(box)
    return () => {
      alive = false
      observer?.disconnect()
    }
  }, [ref, text])
}
