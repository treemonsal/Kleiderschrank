import { AIProviderError } from './ai-errors'

/** How long one photo step (recognition or cutout) may take on its own. */
export const PHOTO_STEP_TIMEOUT_MS = 8 * 60 * 1000

function stepTimeout() {
  // End-to-end tests shorten the wait; the app never sets this.
  const override = (
    globalThis as { __MYSTYLE_PHOTO_STEP_TIMEOUT_MS__?: number }
  ).__MYSTYLE_PHOTO_STEP_TIMEOUT_MS__
  return typeof override === 'number' && override > 0
    ? override
    : PHOTO_STEP_TIMEOUT_MS
}

export interface PhotoParts<A, C> {
  attributes?: A
  cutout?: C
}

type Step<T> = (signal: AbortSignal) => Promise<T>

/** Settles as soon as the signal aborts, with the signal's reason. */
function whenAborted(signal: AbortSignal) {
  return new Promise<never>((_, reject) => {
    if (signal.aborted) reject(signal.reason)
    else
      signal.addEventListener('abort', () => reject(signal.reason), {
        once: true,
      })
  })
}

/**
 * Runs recognition and cutout side by side. Each step has its own time limit
 * and hands over its result the moment it is ready, so a finished cutout is
 * never lost to a slow recognition (or the other way round). Aborting the
 * shared signal stops both.
 */
export async function runPhotoSteps<A, C>(
  steps: { attributes?: Step<A>; cutout?: Step<C> },
  signal: AbortSignal,
  onPartial?: (part: PhotoParts<A, C>) => void,
  timeoutMs = stepTimeout(),
): Promise<{
  attributes: PromiseSettledResult<A | undefined>
  cutout: PromiseSettledResult<C | undefined>
}> {
  async function run<T>(
    step: Step<T> | undefined,
    deliver: (value: T) => void,
  ): Promise<T | undefined> {
    if (!step) return undefined
    const own = new AbortController()
    const stop = () => own.abort(signal.reason)
    if (signal.aborted) stop()
    else signal.addEventListener('abort', stop, { once: true })
    const timer = setTimeout(
      () => own.abort(new AIProviderError('timeout')),
      timeoutMs,
    )
    try {
      const value = await Promise.race([
        step(own.signal),
        whenAborted(own.signal),
      ])
      if (!signal.aborted) deliver(value)
      return value
    } finally {
      clearTimeout(timer)
      signal.removeEventListener('abort', stop)
    }
  }
  const [attributes, cutout] = await Promise.allSettled([
    run(steps.attributes, (value) => onPartial?.({ attributes: value })),
    run(steps.cutout, (value) => onPartial?.({ cutout: value })),
  ])
  return { attributes, cutout }
}
