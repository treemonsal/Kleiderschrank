import type { Garment } from './model'

/**
 * Tops come in two layers: what you wear next to the skin (T-shirt, shirt,
 * blouse, top) and what goes over it (pullover, hoodie, sweatshirt, knit,
 * cardigan). An outfit may combine one of each; the base layer must then
 * still go with the rest when the pullover comes off.
 */
export type TopLayer = 'base' | 'mid'
export const TOP_LAYERS = ['base', 'mid'] as const
export const TOP_LAYER_LABELS: Record<TopLayer, string> = {
  base: 'Shirt, Hemd, Top',
  mid: 'Pullover, Hoodie',
}

const MID =
  /pull|hoodie|kapuzen|sweat|strick|cardigan|jumper|troyer|fleece|rollkragen|sweater|knit|crewneck|zipper/i

export function isTopLayer(value: unknown): value is TopLayer {
  return value === 'base' || value === 'mid'
}

/** The layer of a top: the recorded one, else read from its name. */
export function topLayer(
  item: Pick<Garment, 'category' | 'name'> & { layer?: TopLayer },
): TopLayer | undefined {
  if (item.category !== 'Oberteile') return undefined
  if (isTopLayer(item.layer)) return item.layer
  return MID.test(item.name) ? 'mid' : 'base'
}

/** Name words only (search titles, AI names): a guess, never stored blindly. */
export function layerFromText(text: string): TopLayer {
  return MID.test(text) ? 'mid' : 'base'
}
