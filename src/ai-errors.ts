export type AIProblemKind =
  | 'limit'
  | 'busy'
  | 'unavailable'
  | 'access'
  | 'network'
  | 'invalid'
  | 'unknown'
export class AIProviderError extends Error {
  constructor(
    readonly kind: AIProblemKind,
    readonly retryAt?: number,
    readonly status?: number,
  ) {
    super(kind)
    this.name = 'AIProviderError'
  }
}
function errorText(value: unknown, depth = 0): string {
  if (depth > 3) return ''
  if (typeof value === 'string') return value.slice(0, 4000)
  if (Array.isArray(value))
    return value
      .slice(0, 3)
      .map((v) => errorText(v, depth + 1))
      .join(' ')
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    return ['error', 'message', 'detail']
      .map((k) => errorText(v[k], depth + 1))
      .join(' ')
  }
  return ''
}
function retryTime(
  text: string,
  header: string | null | undefined,
  now: number,
): number | undefined {
  let seconds: number | undefined
  if (header && /^\d+$/.test(header.trim())) seconds = Number(header)
  else if (header) {
    const time = Date.parse(header)
    if (Number.isFinite(time)) seconds = (time - now) / 1000
  }
  if (seconds === undefined) {
    const wait = text.match(
      /(?:try again|retry|reset(?:s)?)\s+in\s+([^\n.]+)/i,
    )?.[1]
    const clock = wait?.match(
      /^(?:(\d+)\s+days?,?\s*)?(?:(\d+):)?(\d{1,2}):(\d{2})/i,
    )
    if (clock)
      seconds =
        Number(clock[1] || 0) * 86400 +
        Number(clock[2] || 0) * 3600 +
        Number(clock[3]) * 60 +
        Number(clock[4])
    else {
      const duration = wait?.match(
        /^(\d+)\s*(seconds?|minutes?|hours?|s|m|h)\b/i,
      )
      if (duration)
        seconds =
          Number(duration[1]) *
          (/^h/i.test(duration[2]) ? 3600 : /^m/i.test(duration[2]) ? 60 : 1)
    }
  }
  return seconds !== undefined && seconds > 0 && seconds <= 7 * 86400
    ? now + seconds * 1000
    : undefined
}
export function providerError(
  value: unknown,
  status?: number,
  retryAfter?: string | null,
  now = Date.now(),
  fallback: AIProblemKind = 'unknown',
): AIProviderError {
  const text = errorText(value)
  const retryAt = retryTime(text, retryAfter, now)
  if (
    /quota|rate[ -]?limit|too many requests|usage limit|daily limit|gpu (?:budget|allowance)/i.test(
      text,
    ) ||
    status === 429
  )
    return new AIProviderError('limit', retryAt, status)
  if (
    /queue.{0,30}full|server.{0,20}busy|overloaded|capacity.{0,20}(?:exceeded|full)/i.test(
      text,
    )
  )
    return new AIProviderError('busy', retryAt, status)
  if (status === 401 || status === 402 || status === 403)
    return new AIProviderError('access', retryAt, status)
  if (
    (status && status >= 500) ||
    status === 404 ||
    /unavailable|offline|sleeping|service.{0,15}down/i.test(text)
  )
    return new AIProviderError('unavailable', retryAt, status)
  return new AIProviderError(fallback, retryAt, status)
}
export function describeAIProblem(
  service: 'Bilderkennung' | 'Freistellung' | 'Outfit-Beratung',
  error: unknown,
): string {
  const problem =
    error instanceof AIProviderError ? error : new AIProviderError('invalid')
  const messages: Record<AIProblemKind, string> = {
    limit: 'Nutzungslimit des Dienstes erreicht.',
    busy: 'Warteschlange des Dienstes ist voll.',
    unavailable: 'Dienst vorübergehend nicht verfügbar.',
    access: 'Der Dienst hat den Zugriff abgewiesen.',
    network: 'Verbindung zum Dienst fehlgeschlagen.',
    invalid: 'Die Antwort des Dienstes konnte nicht verwendet werden.',
    unknown:
      'Der Dienst meldet einen Fehler, nennt aber keine eindeutige Ursache.',
  }
  let message = `${service}: ${messages[problem.kind]}`
  if (problem.retryAt && problem.retryAt > Date.now())
    message += ` Vom Anbieter genannter neuer Versuch: ${new Date(problem.retryAt).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.`
  else if (problem.kind === 'limit')
    message += ' Der Anbieter nennt keine Wartezeit.'
  if (service === 'Freistellung') message += ' Dein Original bleibt erhalten.'
  return message
}
