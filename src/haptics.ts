/**
 * Haptic feedback on the web. Safari has no vibration API, but since iOS 18
 * toggling a native switch (`<input type="checkbox" switch>`) through its
 * label gives the system tap. A hidden switch does exactly that. It works
 * only during a tap (user gesture), so call `haptic()` right in the click
 * handler, before any `await`. Android and others use `navigator.vibrate`.
 * Reduced motion turns it off as well; it never throws.
 */
let label: HTMLLabelElement | null = null

function hiddenSwitch(): HTMLLabelElement {
  if (label?.isConnected) return label
  label = document.createElement('label')
  label.setAttribute('aria-hidden', 'true')
  label.style.cssText =
    'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-10px;top:-10px'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  input.tabIndex = -1
  label.append(input)
  document.body.append(label)
  return label
}

export function haptic(kind: 'tap' | 'success' = 'tap') {
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(kind === 'success' ? [12, 60, 12] : 10)
      return
    }
    hiddenSwitch().click()
  } catch {
    // Haptics are a bonus; nothing depends on them.
  }
}
