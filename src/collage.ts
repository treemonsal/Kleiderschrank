import type { Garment } from './model'

/**
 * Draws labelled garment photos into one JPEG (base64, no data: prefix) so a
 * vision model can refer to pieces by their label.
 */
export async function garmentCollage(
  pieces: { item: Garment; label: string }[],
  signal: AbortSignal,
): Promise<string> {
  const columns = Math.min(4, pieces.length),
    cell = 256,
    height = 272
  const canvas = document.createElement('canvas')
  canvas.width = columns * cell
  canvas.height = Math.ceil(pieces.length / columns) * height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Die Fotos konnten nicht vorbereitet werden.')
  context.fillStyle = '#f1f1f3'
  context.fillRect(0, 0, canvas.width, canvas.height)
  for (const [index, { item, label }] of pieces.entries()) {
    signal.throwIfAborted()
    const x = (index % columns) * cell,
      y = Math.floor(index / columns) * height
    const photo = item.cutout || item.photo
    if (photo) {
      const url = URL.createObjectURL(photo)
      try {
        const image = new Image()
        image.src = url
        await image.decode()
        signal.throwIfAborted()
        const scale = Math.min(
          (cell - 24) / image.naturalWidth,
          (height - 68) / image.naturalHeight,
        )
        context.drawImage(
          image,
          x + (cell - image.naturalWidth * scale) / 2,
          y + 8 + (height - 68 - image.naturalHeight * scale) / 2,
          image.naturalWidth * scale,
          image.naturalHeight * scale,
        )
      } finally {
        URL.revokeObjectURL(url)
      }
    } else {
      context.fillStyle = '#55555a'
      context.font = '18px sans-serif'
      context.fillText('Kein Foto', x + 16, y + 110)
    }
    context.fillStyle = '#111113'
    context.font = 'bold 20px sans-serif'
    context.fillText(
      `${label} · ${item.category}`,
      x + 12,
      y + height - 36,
      cell - 24,
    )
    context.font = '16px sans-serif'
    context.fillText(item.name.slice(0, 30), x + 12, y + height - 12, cell - 24)
  }
  signal.throwIfAborted()
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
}
