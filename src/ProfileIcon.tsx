/*
 * Tab bar icons drawn like TikTok's: a rounded house, a wide plus tile and a
 * plain person (no circle). Outlined when idle, solid when active. Our own
 * colours: white plus tile, no cyan and red edges (TikTok's trademark).
 */
const common = {
  className: 'nav-icon',
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

export function HomeIcon({ filled }: { filled: boolean }) {
  return (
    <svg {...common} data-filled={filled || undefined}>
      <path
        d="M3.6 10.4 11 4.2a1.6 1.6 0 0 1 2 0l7.4 6.2c.4.3.6.8.6 1.3v7.6c0 .9-.7 1.7-1.7 1.7h-3.8v-5.4a1.2 1.2 0 0 0-1.2-1.2h-4.6A1.2 1.2 0 0 0 8.5 15.6V21H4.7C3.7 21 3 20.2 3 19.3v-7.6c0-.5.2-1 .6-1.3Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={filled ? 1 : 1.8}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ProfileIcon({ filled }: { filled: boolean }) {
  return (
    <svg {...common} data-filled={filled || undefined}>
      <circle
        cx="12"
        cy="7.6"
        r="4.1"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4 20.2c0-3.6 3.6-6.2 8-6.2s8 2.6 8 6.2c0 .5-.4.8-.8.8H4.8c-.4 0-.8-.3-.8-.8Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** The add tile: a wide rounded rectangle with a plus, as in TikTok. */
export function AddIcon() {
  return (
    <svg
      className="nav-icon nav-add-icon"
      width="46"
      height="31"
      viewBox="0 0 46 31"
      aria-hidden="true"
    >
      <rect width="46" height="31" rx="15.5" fill="currentColor" />
      <path
        d="M23 9.5v12M17 15.5h12"
        stroke="var(--c-ground)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
