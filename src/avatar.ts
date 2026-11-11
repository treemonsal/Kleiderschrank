/** Own profile pictures: a small square JPEG stored as a data URL. */
export const AVATAR_PREFIX = 'data:image/jpeg;base64,'
/** Generous for 256 × 256 pixels; keeps backups and the sync small. */
export const AVATAR_MAX_LENGTH = 200_000

export function isAvatar(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith(AVATAR_PREFIX) &&
    value.length <= AVATAR_MAX_LENGTH &&
    /^[A-Za-z0-9+/]+=*$/.test(value.slice(AVATAR_PREFIX.length))
  )
}

/** Crops the middle square of a photo and scales it to 256 pixels. */
export async function makeAvatar(file: Blob, size = 256): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () =>
        reject(new Error('Dieses Bild lässt sich nicht öffnen.'))
      img.src = url
    })
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Dieses Bild lässt sich nicht verarbeiten.')
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    )
    for (const quality of [0.85, 0.7, 0.5]) {
      const data = canvas.toDataURL('image/jpeg', quality)
      if (isAvatar(data)) return data
    }
    throw new Error('Dieses Bild ist zu gross.')
  } finally {
    URL.revokeObjectURL(url)
  }
}
