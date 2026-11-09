import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { DEFAULT_PREFERENCES } from './outfit-model'
import { interviewNotice } from './style-interview'

export const STYLIST_READ_KEY = 'mystyle-stylist-read-v1'
export interface StylistReadMarkers {
  reply?: string
  interview?: string
}
export function parseReadMarkers(value: string | null): StylistReadMarkers {
  try {
    const item = JSON.parse(value ?? '{}')
    if (!item || typeof item !== 'object' || Array.isArray(item)) return {}
    const marker = (v: unknown) =>
      typeof v === 'string' && v.length <= 200 ? v : undefined
    return { reply: marker(item.reply), interview: marker(item.interview) }
  } catch {
    return {}
  }
}
function readMarkers() {
  try {
    return parseReadMarkers(localStorage.getItem(STYLIST_READ_KEY))
  } catch {
    return {}
  }
}
export function unreadStylist(
  reply: string | undefined,
  interview: string | undefined,
  read: StylistReadMarkers,
) {
  return {
    reply: !!reply && reply !== read.reply,
    interview: !!interview && interview !== read.interview,
  }
}
export function useStylistInbox() {
  const data = useLiveQuery(async () => {
    try {
      return await db.transaction('r', db.preferences, db.chat, async () => ({
        preferences:
          (await db.preferences.get('personal')) ?? DEFAULT_PREFERENCES,
        reply: (await db.chat.get('stylist'))?.messages
          .filter((m) => m.role === 'assistant')
          .at(-1)?.id,
      }))
    } catch {
      return undefined
    }
  })
  const [read, setRead] = useState(readMarkers)
  const current = useRef({ data, read })
  current.current = { data, read }
  const mark = useCallback((patch: StylistReadMarkers) => {
    if (
      Object.entries(patch).every(
        ([key, value]) =>
          current.current.read[key as keyof StylistReadMarkers] === value,
      )
    )
      return
    const next = { ...current.current.read, ...readMarkers(), ...patch }
    try {
      localStorage.setItem(STYLIST_READ_KEY, JSON.stringify(next))
    } catch {
      /* Keep the read state in memory when browser storage is blocked. */
    }
    current.current.read = next
    setRead(next)
  }, [])
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === null || event.key === STYLIST_READ_KEY)
        setRead(readMarkers())
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])
  const markReply = useCallback(
    (id: string) => {
      if (current.current.data?.reply === id) mark({ reply: id })
    },
    [mark, data?.reply],
  )
  const markInterview = useCallback(
    (token: string) => {
      const preferences = current.current.data?.preferences
      if (preferences && interviewNotice(preferences) === token)
        mark({ interview: token })
    },
    [
      mark,
      data?.preferences.styleInterview?.updatedAt,
      data?.preferences.styleProfile?.status,
    ],
  )
  const token = data && interviewNotice(data.preferences)
  const unread = unreadStylist(data?.reply, token, read)
  return {
    hasUnread: unread.reply || unread.interview,
    newInterview: unread.interview,
    markReply,
    markInterview,
  }
}

/** A hidden tab or an offscreen card must not acknowledge a new message. */
export function useVisibleNotice(
  ref: RefObject<HTMLElement | null>,
  token: string | undefined,
  acknowledge: (token: string) => void,
  refreshKey?: boolean,
) {
  useEffect(() => {
    const node = ref.current
    if (!node || !token) return
    let alive = true
    let visible = false
    const read = () => {
      if (alive && visible && document.visibilityState === 'visible')
        acknowledge(token)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.1,
        )
        read()
      },
      { root: node.closest('dialog'), threshold: [0, 0.1] },
    )
    observer.observe(node)
    document.addEventListener('visibilitychange', read)
    return () => {
      alive = false
      observer.disconnect()
      document.removeEventListener('visibilitychange', read)
    }
  }, [ref, token, acknowledge, refreshKey])
}
