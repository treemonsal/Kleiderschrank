export const AI_CACHE = 'mystyle-ai-v1'
export const MODEL_SHA256 =
  '309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8'
export const WASM_SHA256 =
  '3398c10d07d229bd91b364548e130e0e51a8e5704b88c7c083ebbeb78842dee2'
export const MODEL_BYTES = 4574861
export const WASM_BYTES = 14239897
export const MODEL_SIZE = 320

export function normalizeModelPixels(pixels: Uint8ClampedArray): Float32Array {
  if (pixels.length !== MODEL_SIZE * MODEL_SIZE * 4)
    throw new Error('Ungültige Bildgröße.')
  let max = 1
  for (let i = 0; i < pixels.length; i += 4)
    max = Math.max(max, pixels[i], pixels[i + 1], pixels[i + 2])
  const result = new Float32Array(MODEL_SIZE * MODEL_SIZE * 3)
  const means = [0.485, 0.456, 0.406],
    deviations = [0.229, 0.224, 0.225]
  for (let i = 0; i < MODEL_SIZE * MODEL_SIZE; i++) {
    for (let c = 0; c < 3; c++)
      result[c * MODEL_SIZE * MODEL_SIZE + i] =
        (pixels[i * 4 + c] / max - means[c]) / deviations[c]
  }
  return result
}

export function maskFromPrediction(
  prediction: Float32Array,
): Uint8ClampedArray {
  if (prediction.length !== MODEL_SIZE * MODEL_SIZE)
    throw new Error('Ungültiges KI-Ergebnis.')
  let min = Infinity,
    max = -Infinity
  for (const value of prediction) {
    if (!Number.isFinite(value))
      throw new Error('Die KI lieferte kein verwendbares Ergebnis.')
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  if (max - min < 0.000001)
    throw new Error(
      'Die KI konnte keinen Vordergrund abgrenzen. Dein Original bleibt erhalten.',
    )
  return Uint8ClampedArray.from(
    prediction,
    (value) => ((value - min) / (max - min)) * 255,
  )
}

export async function verifyAsset(
  data: ArrayBuffer,
  size: number,
  sha256: string,
): Promise<void> {
  if (data.byteLength !== size)
    throw new Error(
      'Die KI-Datei ist unvollständig. Bitte versuche es erneut online.',
    )
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', data)),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')
  if (hash !== sha256)
    throw new Error(
      'Die KI-Datei konnte nicht sicher überprüft werden. Es wurde nichts verändert.',
    )
}
