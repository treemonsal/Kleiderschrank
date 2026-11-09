import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import { MODEL_SIZE, normalizeModelPixels } from './background-model'

export function removePhotoBackground(
  photo: Blob,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let worker: Worker | undefined
    let settled = false
    const url = URL.createObjectURL(photo)
    const image = new Image()
    const finish = (error?: Error, result?: Blob) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      worker?.terminate()
      URL.revokeObjectURL(url)
      if (error) reject(error)
      else resolve(result!)
    }
    const abort = () =>
      finish(new DOMException('Freistellung abgebrochen.', 'AbortError'))
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            'Die Freistellung dauert auf diesem Gerät zu lange. Dein Original bleibt erhalten.',
          ),
        ),
      90000,
    )
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) {
      abort()
      return
    }
    image.onerror = () =>
      finish(new Error('Dieses Foto konnte nicht geöffnet werden.'))
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = MODEL_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Die Bildverarbeitung ist nicht verfügbar.')
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, MODEL_SIZE, MODEL_SIZE)
        ctx.drawImage(image, 0, 0, MODEL_SIZE, MODEL_SIZE)
        const input = normalizeModelPixels(
          ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data,
        )
        worker = new Worker(
          new URL('./background-worker.ts', import.meta.url),
          { type: 'module' },
        )
        worker.onerror = () =>
          finish(
            new Error(
              'Die lokale KI wird von diesem Browser nicht unterstützt oder hat zu wenig Speicher. Dein Original bleibt erhalten.',
            ),
          )
        worker.onmessage = async (
          event: MessageEvent<{
            status: string
            message?: string
            mask?: Uint8ClampedArray
          }>,
        ) => {
          if (settled) return
          const { status, message, mask } = event.data
          if (status === 'loading')
            progress('KI-Dateien werden geladen und überprüft …')
          else if (status === 'running')
            progress('Die KI stellt dein Foto auf diesem Gerät frei …')
          else if (status === 'cache-warning')
            progress(
              'KI-Dateien konnten nicht offline gespeichert werden. Die Verarbeitung läuft weiter …',
            )
          else if (status === 'error')
            finish(new Error(message || 'Die Freistellung ist fehlgeschlagen.'))
          else if (status === 'done' && mask) {
            try {
              const maskCanvas = document.createElement('canvas')
              maskCanvas.width = maskCanvas.height = MODEL_SIZE
              const maskCtx = maskCanvas.getContext('2d')!
              const rgba = maskCtx.createImageData(MODEL_SIZE, MODEL_SIZE)
              for (let i = 0; i < mask.length; i++) {
                rgba.data.set([255, 255, 255, mask[i]], i * 4)
              }
              maskCtx.putImageData(rgba, 0, 0)
              const scale = Math.min(
                1,
                1200 / Math.max(image.naturalWidth, image.naturalHeight),
              )
              canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
              canvas.height = Math.max(
                1,
                Math.round(image.naturalHeight * scale),
              )
              ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
              ctx.globalCompositeOperation = 'destination-in'
              ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height)
              canvas.toBlob(
                (blob) =>
                  blob
                    ? finish(undefined, blob)
                    : finish(
                        new Error('Die Vorschau konnte nicht erstellt werden.'),
                      ),
                'image/png',
              )
            } catch {
              finish(
                new Error(
                  'Die Vorschau konnte nicht erstellt werden. Dein Original bleibt erhalten.',
                ),
              )
            }
          }
        }
        worker.postMessage(
          {
            input,
            modelUrl: new URL(
              `${import.meta.env.BASE_URL}ai/u2netp.onnx`,
              location.href,
            ).href,
            wasmUrl: new URL(wasmUrl, location.href).href,
          },
          [input.buffer],
        )
      } catch (error) {
        finish(
          error instanceof Error
            ? error
            : new Error('Die Freistellung konnte nicht gestartet werden.'),
        )
      }
    }
    image.src = url
  })
}
