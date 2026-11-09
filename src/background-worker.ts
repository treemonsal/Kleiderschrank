import { env, InferenceSession, Tensor } from 'onnxruntime-web/wasm'
import {
  AI_CACHE,
  MODEL_BYTES,
  MODEL_SHA256,
  MODEL_SIZE,
  WASM_BYTES,
  WASM_SHA256,
  maskFromPrediction,
  verifyAsset,
} from './background-model'

async function asset(
  url: string,
  size: number,
  hash: string,
): Promise<ArrayBuffer> {
  let cache: Cache | undefined
  try {
    cache = await caches.open(AI_CACHE)
  } catch {
    /* Cache unavailable: inference can still run online. */
  }
  const cached = await cache?.match(url)
  if (cached) {
    const bytes = await cached.arrayBuffer()
    try {
      await verifyAsset(bytes, size, hash)
      return bytes
    } catch {
      await cache?.delete(url)
    }
  }
  let response: Response
  try {
    response = await fetch(url, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
  } catch {
    throw new Error(
      'Die KI-Dateien sind noch nicht offline verfügbar. Bitte lade sie einmal online. Dein Original bleibt erhalten.',
    )
  }
  if (!response.ok)
    throw new Error(
      'Die KI-Dateien sind noch nicht offline verfügbar. Bitte lade sie einmal online.',
    )
  const bytes = await response.arrayBuffer()
  await verifyAsset(bytes, size, hash)
  try {
    await cache?.put(url, new Response(bytes.slice(0)))
  } catch {
    postMessage({ status: 'cache-warning' })
  }
  return bytes
}

self.onmessage = async (
  event: MessageEvent<{
    input: Float32Array
    modelUrl: string
    wasmUrl: string
  }>,
) => {
  let session: InferenceSession | undefined
  try {
    postMessage({ status: 'loading' })
    // One thread works without SharedArrayBuffer/COOP/COEP, including static hosting.
    env.wasm.numThreads = 1
    env.wasm.proxy = false
    const model = await asset(event.data.modelUrl, MODEL_BYTES, MODEL_SHA256)
    env.wasm.wasmBinary = await asset(
      event.data.wasmUrl,
      WASM_BYTES,
      WASM_SHA256,
    )
    session = await InferenceSession.create(model, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
    postMessage({ status: 'running' })
    const tensor = new Tensor('float32', event.data.input, [
      1,
      3,
      MODEL_SIZE,
      MODEL_SIZE,
    ])
    const output = await session.run({ [session.inputNames[0]]: tensor })
    const mask = maskFromPrediction(
      output[session.outputNames[0]].data as Float32Array,
    )
    tensor.dispose()
    for (const value of Object.values(output)) value.dispose()
    postMessage({ status: 'done', mask }, { transfer: [mask.buffer] })
  } catch (error) {
    postMessage({
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Die lokale KI konnte dieses Foto nicht verarbeiten.',
    })
  } finally {
    await session?.release()
  }
}
