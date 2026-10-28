import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Cloud, LoaderCircle, RefreshCw } from 'lucide-react'
import { db } from './db'
import { DriveAuthError } from './drive'
import {
  completeGoogleSignIn,
  GOOGLE_SESSION_CHANGED,
  googleClientId,
  readSession,
  sessionUsable,
  signOut,
  startGoogleSignIn,
  type GoogleSession,
} from './google-auth'
import { ErrorMessage } from './ui'

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'error' | 'expired'
  message?: string
}

// One status for the whole app: the hook syncs, the settings card shows it.
let status: SyncStatus = { state: 'idle' }
const listeners = new Set<() => void>()
function setStatus(next: SyncStatus) {
  status = next
  for (const listener of listeners) listener()
}
function useSyncStatus() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    () => status,
  )
}

export function useGoogleSession(): GoogleSession | null {
  const [session, setSession] = useState(readSession)
  useEffect(() => {
    const update = () => setSession(readSession())
    window.addEventListener(GOOGLE_SESSION_CHANGED, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(GOOGLE_SESSION_CHANGED, update)
      window.removeEventListener('storage', update)
    }
  }, [])
  return session
}

let running: Promise<void> | null = null
let again = false
/** Runs one sync; a request during a running sync queues exactly one more. */
export async function runSync(session: GoogleSession): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      if (!sessionUsable(session)) {
        setStatus({ state: 'expired' })
        return
      }
      setStatus({ state: 'syncing' })
      try {
        const { syncWithDrive } = await import('./sync')
        await syncWithDrive(session.accessToken, session.sub)
        setStatus({ state: 'idle' })
      } catch (error) {
        setStatus(
          error instanceof DriveAuthError
            ? { state: 'expired' }
            : {
                state: 'error',
                message:
                  error instanceof Error
                    ? error.message
                    : 'Der Abgleich ist fehlgeschlagen.',
              },
        )
        return
      }
    } while (again)
  })().finally(() => {
    running = null
  })
  return running
}

const RENEW_KEY = 'mystyle-google-renew'
/**
 * Keeps the wardrobe in sync while signed in: after sign-in, on start, when
 * the app comes back to the foreground, every few minutes and shortly after
 * local changes. An expired sign-in is renewed by one quick redirect per hour.
 */
export function useDriveSync(
  notify: (message: string, error?: boolean) => void,
) {
  const session = useGoogleSession()
  const fingerprint = useLiveQuery(
    () =>
      db.transaction(
        'r',
        [
          db.garments,
          db.outfits,
          db.feedback,
          db.calendar,
          db.preferences,
          db.weather,
          db.chat,
        ],
        async () =>
          JSON.stringify([
            await db.garments.count(),
            (await db.garments.orderBy('updatedAt').last())?.updatedAt,
            await db.outfits.count(),
            (await db.outfits.orderBy('updatedAt').last())?.updatedAt,
            await db.feedback.count(),
            (await db.feedback.orderBy('updatedAt').last())?.updatedAt,
            await db.calendar.count(),
            (await db.calendar.orderBy('updatedAt').last())?.updatedAt,
            (await db.preferences.get('personal'))?.updatedAt,
            (await db.weather.get('local'))?.updatedAt,
            (await db.chat.get('stylist'))?.updatedAt,
          ]),
      ),
    [],
  )
  const synced = useRef<string | undefined>(undefined)
  const sync = useCallback((renew = false) => {
    const current = readSession()
    if (!current || !navigator.onLine) return
    if (!sessionUsable(current)) {
      setStatus({ state: 'expired' })
      // Only at app start: never leave the app in the middle of something.
      if (!renew) return
      // Renew silently-ish at most once per hour; Google returns right away
      // when the account is still signed in there.
      let last = 0
      try {
        last = Number(localStorage.getItem(RENEW_KEY) ?? 0)
      } catch {
        /* storage blocked: no automatic renewal */
        return
      }
      if (
        Date.now() - last > 60 * 60_000 &&
        !document.querySelector('dialog[open]')
      ) {
        localStorage.setItem(RENEW_KEY, String(Date.now()))
        startGoogleSignIn(current.email)
      }
      return
    }
    void runSync(current)
  }, [])
  useEffect(() => {
    void completeGoogleSignIn().then((result) => {
      if (result?.error) notify(result.error, true)
      if (result?.session) {
        notify(
          `Angemeldet als ${result.session.email}. Dein Kleiderschrank wird abgeglichen.`,
        )
        void runSync(result.session)
      }
    })
  }, [notify])
  useEffect(() => {
    if (!session) return
    sync(true)
    const visible = () => document.visibilityState === 'visible' && sync()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') sync()
    }, 5 * 60_000)
    document.addEventListener('visibilitychange', visible)
    const online = () => sync()
    window.addEventListener('online', online)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('online', online)
    }
  }, [session?.sub, sync]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!session || fingerprint === undefined) return
    if (synced.current === undefined) {
      synced.current = fingerprint
      return
    }
    if (synced.current === fingerprint) return
    synced.current = fingerprint
    const timer = window.setTimeout(() => {
      const current = readSession()
      if (current && sessionUsable(current)) void runSync(current)
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [fingerprint, session])
}

export function DriveSyncCard() {
  const session = useGoogleSession()
  const current = useSyncStatus()
  const [error, setError] = useState('')
  const last = useLiveQuery(
    async () =>
      session ? (await db.syncState.get(session.sub))?.lastSyncedAt : undefined,
    [session?.sub],
  )
  if (!googleClientId()) return null
  const start = (hint?: string) => {
    setError('')
    try {
      startGoogleSignIn(hint)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung nicht möglich.')
    }
  }
  return (
    <section
      className="settings-section drive-sync"
      aria-label="Auf allen Geräten"
    >
      <div className="section-heading">
        <h2>Auf allen Geräten</h2>
        <Cloud size={20} strokeWidth={1.5} />
      </div>
      {!session ? (
        <>
          <p className="muted section-intro">
            Mit Google angemeldet liegt dein Kleiderschrank zusätzlich in deinem
            eigenen Google Drive und ist auf jedem Gerät gleich, auf dem du dich
            anmeldest.
          </p>
          <button
            type="button"
            className="button primary full"
            disabled={!navigator.onLine}
            onClick={() => start()}
          >
            Mit Google anmelden
          </button>
          <p className="micro-copy">
            Gespeichert in einem versteckten App-Ordner deines Drive, den nur
            MyStyle sieht. Jede Person nutzt ihr eigenes Konto.
          </p>
        </>
      ) : (
        <div className="settings-card drive-sync-card">
          <p>
            Angemeldet als <strong>{session.email}</strong>
          </p>
          <p className="muted" role="status">
            {current.state === 'syncing' ? (
              <>
                <LoaderCircle size={14} className="spin" /> Wird abgeglichen …
              </>
            ) : current.state === 'expired' ? (
              'Anmeldung abgelaufen, Abgleich pausiert.'
            ) : last ? (
              `Zuletzt abgeglichen: ${new Date(last).toLocaleString('de-CH', {
                day: 'numeric',
                month: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}`
            ) : (
              'Noch nicht abgeglichen.'
            )}
          </p>
          {current.state === 'error' && current.message && (
            <ErrorMessage>{current.message}</ErrorMessage>
          )}
          <button
            type="button"
            className="button secondary full"
            disabled={current.state === 'syncing' || !navigator.onLine}
            onClick={() =>
              sessionUsable(session)
                ? void runSync(session)
                : start(session.email)
            }
          >
            <RefreshCw size={16} />
            {sessionUsable(session)
              ? 'Jetzt abgleichen'
              : 'Erneut anmelden und abgleichen'}
          </button>
          <button
            type="button"
            className="text-button"
            disabled={current.state === 'syncing'}
            onClick={() => {
              signOut()
              setStatus({ state: 'idle' })
            }}
          >
            Abmelden
          </button>
          <p className="micro-copy">
            Abmelden behält alles auf diesem Gerät und in deinem Drive.
          </p>
        </div>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </section>
  )
}
