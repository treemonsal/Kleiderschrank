import { useId } from 'react'

/**
 * Profile tab icon. Outlined like Lucide's circle-user-round; filled when
 * the tab is active, with head and shoulders cut out, so it reads as filled
 * exactly like the Home icon next to it.
 */
export function ProfileIcon({ filled }: { filled: boolean }) {
  const mask = useId()
  if (!filled)
    return (
      <svg
        className="nav-icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 20a6 6 0 0 0-12 0" />
        <circle cx="12" cy="10" r="4" />
        <circle cx="12" cy="12" r="10" />
      </svg>
    )
  return (
    <svg
      className="nav-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <mask id={mask}>
        <rect width="24" height="24" fill="white" />
        <circle cx="12" cy="10" r="3.6" fill="black" />
        <path d="M5.6 20.4a6.4 6.4 0 0 1 12.8 0V24H5.6z" fill="black" />
      </mask>
      <circle
        cx="12"
        cy="12"
        r="10.85"
        fill="currentColor"
        mask={`url(#${CSS.escape(mask)})`}
      />
    </svg>
  )
}
