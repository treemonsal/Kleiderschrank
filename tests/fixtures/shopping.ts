import type { Garment } from '../../src/model'
import { localDay, shiftDay } from '../../src/calendar'
import { outfitKey, type SavedOutfit } from '../../src/outfit-model'
import type { ShoppingData } from '../../src/shopping-model'
export function shoppingFixture(now = Date.now()): ShoppingData {
  const today = localDay(new Date(now)),
    stamp = new Date(now - 21 * 86400000).toISOString()
  const categories: Garment['category'][] = [
    'Oberteile',
    'Oberteile',
    'Oberteile',
    'Hosen',
    'Schuhe',
    'Jacken',
    'Accessoires',
  ]
  const garments = categories.map((category, i): Garment => ({
    id: `shop-${i}`,
    name: [
      'Blaues Hemd',
      'Weisses T-Shirt',
      'Rotes Polo',
      'Dunkle Jeans',
      'Weisse Sneaker',
      'Blaue Jacke',
      'Schwarzer Gürtel',
    ][i],
    category,
    color: ['Blau', 'Weiss', 'Rot', 'Blau', 'Weiss', 'Blau', 'Schwarz'][i],
    styles: ['Minimalistisch'],
    seasons: [],
    brand: '',
    notes: 'PRIVATE-NOTE-NOT-FOR-SHOPPING',
    favorite: i === 0,
    createdAt: stamp,
    updatedAt: stamp,
  }))
  const outfits = garments.slice(0, 3).map((_, i): SavedOutfit => ({
    id: `look-${i}`,
    name: `Look ${i}`,
    garmentIds: [`shop-${i}`, 'shop-3', 'shop-4'],
    occasion: 'Alltag',
    season: 'Alle',
    style: 'Minimalistisch',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
  }))
  return {
    garments,
    preferences: {
      id: 'personal',
      styles: ['Minimalistisch'],
      colors: ['Beige', 'Blau'],
      updatedAt: stamp,
      styleProfile: {
        version: 1,
        status: 'completed',
        colorMood: 'neutral',
        variety: 'balanced',
        usualOccasion: 'Alltag',
        avoidColors: ['Violett'],
      },
    },
    outfits,
    feedback: outfits.map((look, i) => ({
      id: outfitKey(look.garmentIds),
      garmentIds: look.garmentIds,
      verdict: i < 2 ? 'liked' : 'rejected',
      ...(i === 2 ? { reason: 'colors' as const } : {}),
      updatedAt: stamp,
    })),
    calendar: [-14, -6, -5, -4, -3, -2, -1].map((offset, i) => {
      const day = shiftDay(today, offset)!
      return {
        id: day,
        day,
        outfitId: outfits[i % 3].id,
        status: 'worn' as const,
        note: 'PRIVATE-CALENDAR-NOTE',
        createdAt: stamp,
        updatedAt: stamp,
      }
    }),
  }
}
