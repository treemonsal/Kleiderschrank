/**
 * Sign-in with Google for syncing through the person's own Google Drive.
 * Uses the OAuth redirect flow (no popup, no Google script): popups are
 * unreliable in an iPhone home-screen app, redirects stay in the same app.
 * The short-lived access token stays on this device only (never in backups).
 */

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_USERINFO_URL =
  'https://openidconnect.googleapis.com/v1/userinfo'
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const STORE = 'mystyle-google-sync'
const PENDING = 'mystyle-google-sync-pending'

/** Public OAuth client ID of this app (not a secret). */
export const GOOGLE_CLIENT_ID =
  '187167128-430n11miigpor7m6je6ks7t683odvsup.apps.googleusercontent.com'

export function googleClientId(): string {
  const override = (
    window as unknown as { __MYSTYLE_GOOGLE_CLIENT_ID__?: string }
  ).__MYSTYLE_GOOGLE_CLIENT_ID__
  return override ?? (import.meta.env.VITE_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID)
}

export interface GoogleSession {
  accessToken: string
  expiresAt: number
  email: string
  /** Stable account id; the sync base is kept per account. */
  sub: string
}

export const GOOGLE_SESSION_CHANGED = 'mystyle-google-session'

function redirectUri() {
  return new URL(import.meta.env.BASE_URL, location.origin).href
}

export function readSession(): GoogleSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORE) ?? 'null')
    return value &&
      typeof value.accessToken === 'string' &&
      typeof value.email === 'string' &&
      typeof value.sub === 'string' &&
      typeof value.expiresAt === 'number'
      ? value
      : null
  } catch {
    return null
  }
}

function writeSession(session: GoogleSession | null) {
  if (session) localStorage.setItem(STORE, JSON.stringify(session))
  else localStorage.removeItem(STORE)
  window.dispatchEvent(new Event(GOOGLE_SESSION_CHANGED))
}

/** Valid for at least one more minute. */
export function sessionUsable(session: GoogleSession | null, now = Date.now()) {
  return !!session && session.expiresAt - 60_000 > now
}

/** Leaves the app for Google's sign-in page and comes back afterwards. */
export function startGoogleSignIn(hint?: string) {
  const clientId = googleClientId()
  if (!clientId)
    throw new Error('Die Anmeldung mit Google ist noch nicht eingerichtet.')
  const state = crypto.randomUUID()
  localStorage.setItem(
    PENDING,
    JSON.stringify({ state, createdAt: Date.now() }),
  )
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: `${DRIVE_SCOPE} openid email`,
    include_granted_scopes: 'true',
    state,
    ...(hint ? { login_hint: hint } : { prompt: 'select_account' }),
  })
  location.assign(`${GOOGLE_AUTH_URL}?${params}`)
}

export function signOut() {
  writeSession(null)
}

/**
 * Finishes a sign-in when Google redirected back with a token in the URL
 * fragment. Returns the new session, an error text, or nothing to do.
 */
export async function completeGoogleSignIn(
  fetcher: typeof fetch = fetch,
): Promise<{ session?: GoogleSession; error?: string } | undefined> {
  const params = new URLSearchParams(location.hash.slice(1))
  if (
    !params.has('state') ||
    !(params.has('access_token') || params.has('error'))
  )
    return undefined
  // The token must never stay visible in the address bar or history.
  history.replaceState(null, '', location.pathname + location.search)
  let pending: { state?: string; createdAt?: number } = {}
  try {
    pending = JSON.parse(localStorage.getItem(PENDING) ?? '{}')
  } catch {
    /* treated as unknown state below */
  }
  localStorage.removeItem(PENDING)
  if (
    !pending.state ||
    pending.state !== params.get('state') ||
    Date.now() - (pending.createdAt ?? 0) > 15 * 60_000
  )
    return { error: 'Die Anmeldung ist abgelaufen. Bitte versuche es erneut.' }
  if (params.get('error'))
    return {
      error:
        params.get('error') === 'access_denied'
          ? 'Anmeldung abgebrochen. Ohne Freigabe bleibt alles nur auf diesem Gerät.'
          : 'Google hat die Anmeldung nicht abgeschlossen. Bitte versuche es erneut.',
    }
  if (!(params.get('scope') ?? '').split(' ').includes(DRIVE_SCOPE))
    return {
      error:
        'Ohne Zugriff auf den App-Ordner in Google Drive ist kein Abgleich möglich. Bitte erlaube ihn bei der Anmeldung.',
    }
  const accessToken = params.get('access_token')!
  try {
    const response = await fetcher(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) throw new Error()
    const user = await response.json()
    if (typeof user.sub !== 'string' || typeof user.email !== 'string')
      throw new Error()
    const session: GoogleSession = {
      accessToken,
      expiresAt: Date.now() + Number(params.get('expires_in') ?? 3600) * 1000,
      email: user.email,
      sub: user.sub,
    }
    writeSession(session)
    return { session }
  } catch {
    return {
      error:
        'Das Google-Konto konnte nicht gelesen werden. Bitte versuche es erneut.',
    }
  }
}
