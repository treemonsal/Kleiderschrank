export const MAX_PHOTO_BYTES = 20 * 1024 * 1024
export async function validateBackupPhotos(
  items: { photo?: Blob }[],
): Promise<void> {
  for (const { photo } of items) {
    if (!photo) continue
    const url = URL.createObjectURL(photo)
    try {
      await new Promise<void>((resolve, reject) => {
        const image = new Image()
        image.onload = () =>
          image.naturalWidth > 0 && image.naturalHeight > 0
            ? resolve()
            : reject(
                new Error(
                  'Ein Foto in der Sicherung ist beschädigt. Es wurde nichts verändert.',
                ),
              )
        image.onerror = () =>
          reject(
            new Error(
              'Ein Foto in der Sicherung ist beschädigt. Es wurde nichts verändert.',
            ),
          )
        image.src = url
      })
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}
export async function preparePhoto(file: File): Promise<Blob> {
  if (file.size > MAX_PHOTO_BYTES)
    throw new Error(
      'Das Foto ist grösser als 20 MB. Bitte wähle ein kleineres Bild.',
    )
  if (!file.type.startsWith('image/'))
    throw new Error('Bitte wähle eine Bilddatei aus.')
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () =>
        reject(
          new Error(
            'Dieses Bildformat kann der Browser nicht öffnen. Bitte verwende ein JPEG-, PNG- oder WebP-Foto.',
          ),
        )
      img.src = url
    })
    const scale = Math.min(
      1,
      1600 / Math.max(image.naturalWidth, image.naturalHeight),
    )
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx)
      throw new Error(
        'Die Bildverarbeitung ist in diesem Browser nicht verfügbar.',
      )
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('Das Foto konnte nicht verarbeitet werden.')),
        'image/jpeg',
        0.86,
      ),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () =>
      reject(new Error('Ein Foto konnte nicht gelesen werden.'))
    reader.readAsDataURL(blob)
  })
}
