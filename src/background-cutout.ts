import { analyzePhoto, readAIConnection } from './cloud-ai'
import { attachCutout, db } from './db'

let queue: Promise<void> = Promise.resolve()

/**
 * Cuts out pieces that were just added with a photo, one after another
 * (free services have limits), only with the free AI switched on. Each
 * cut-out lands only if the piece is still unchanged; failures keep the
 * photo as it is. Started by the user's own tap (adding the pieces).
 */
export function cutOutLater(ids: string[]): Promise<void> {
  const connection = readAIConnection()
  if (!connection?.enabled || !ids.length) return queue
  queue = queue.then(async () => {
    for (const id of ids) {
      try {
        const piece = await db.garments.get(id)
        if (!piece?.photo || piece.cutout) continue
        const { cutout } = await analyzePhoto(
          piece.photo,
          connection,
          new AbortController().signal,
          'cutout',
        )
        if (cutout) await attachCutout(id, piece.updatedAt, cutout)
      } catch {
        // The product photo stays; "Neu freistellen" can try again.
      }
    }
  })
  return queue
}
