import { describe, expect, it } from 'vitest'
import { runPhotoSteps } from '../src/photo-steps'
import { AIProviderError, describeAIProblem } from '../src/ai-errors'

const never = () => new Promise<never>(() => {})
const after = <T>(ms: number, value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms))

describe('Foto-Schritte einzeln', () => {
  it('gibt eine fertige Freistellung sofort weiter, auch wenn die Erkennung hängt', async () => {
    const parts: unknown[] = []
    const started = Date.now()
    const result = await runPhotoSteps(
      { attributes: never, cutout: () => after(5, 'freigestellt') },
      new AbortController().signal,
      (part) => parts.push({ ...part, at: Date.now() - started }),
      60,
    )
    // Handed over long before the slow step gave up.
    expect(parts).toHaveLength(1)
    expect(parts[0]).toMatchObject({ cutout: 'freigestellt' })
    expect((parts[0] as { at: number }).at).toBeLessThan(50)
    expect(result.cutout).toEqual({
      status: 'fulfilled',
      value: 'freigestellt',
    })
    expect(result.attributes.status).toBe('rejected')
    const reason = (result.attributes as PromiseRejectedResult).reason
    expect(reason).toBeInstanceOf(AIProviderError)
    expect(describeAIProblem('Bilderkennung', reason)).toBe(
      'Bilderkennung: Der Dienst hat zu lange gebraucht.',
    )
  })

  it('jeder Schritt hat sein eigenes Zeitlimit und bekommt ein eigenes Signal', async () => {
    const signals: AbortSignal[] = []
    const result = await runPhotoSteps(
      {
        attributes: (signal) => {
          signals.push(signal)
          return after(5, 'angaben')
        },
        cutout: (signal) => {
          signals.push(signal)
          return never()
        },
      },
      new AbortController().signal,
      undefined,
      40,
    )
    expect(result.attributes).toEqual({ status: 'fulfilled', value: 'angaben' })
    expect(result.cutout.status).toBe('rejected')
    expect(signals[0].aborted).toBe(false)
    expect(signals[1].aborted).toBe(true)
  })

  it('ein Abbruch stoppt beide Schritte und liefert danach nichts mehr', async () => {
    const parts: unknown[] = []
    const controller = new AbortController()
    const running = runPhotoSteps(
      { attributes: never, cutout: () => after(30, 'spät') },
      controller.signal,
      (part) => parts.push(part),
      1000,
    )
    controller.abort('user')
    const result = await running
    expect(result.attributes).toEqual({ status: 'rejected', reason: 'user' })
    expect(result.cutout).toEqual({ status: 'rejected', reason: 'user' })
    await after(40, null)
    expect(parts).toEqual([])
  })

  it('übersprungene Schritte bleiben leer', async () => {
    const result = await runPhotoSteps(
      { cutout: () => Promise.resolve('nur freistellen') },
      new AbortController().signal,
    )
    expect(result.attributes).toEqual({ status: 'fulfilled', value: undefined })
    expect(result.cutout).toEqual({
      status: 'fulfilled',
      value: 'nur freistellen',
    })
  })
})
