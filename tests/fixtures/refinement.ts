import type { Garment } from '../../src/model'
import { localDay } from '../../src/calendar'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
} from '../../src/outfit-model'
export function refinementFixture(now = Date.now()) {
  const stamp = new Date(now - 1000).toISOString()
  const garments: Garment[] = [
    { id: 'top-red', name: 'Rotes Shirt', category: 'Oberteile', color: 'Rot' },
    {
      id: 'top-beige',
      name: 'Beiges Shirt',
      category: 'Oberteile',
      color: 'Beige',
    },
    { id: 'pants', name: 'Schwarze Hose', category: 'Hosen', color: 'Schwarz' },
    { id: 'shoes', name: 'Weisse Sneaker', category: 'Schuhe', color: 'Weiss' },
    { id: 'boots', name: 'Braune Schuhe', category: 'Schuhe', color: 'Braun' },
    { id: 'jacket', name: 'Beige Jacke', category: 'Jacken', color: 'Beige' },
  ].map((item) => ({
    ...item,
    category: item.category as Garment['category'],
    brand: '',
    seasons: [],
    styles: [],
    notes: '',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
  }))
  const day = localDay(new Date(now))
  const ids = ['top-red', 'pants', 'shoes']
  const options = { ...DEFAULT_OUTFIT_OPTIONS }
  return {
    garments,
    outfits: [],
    feedback: [],
    calendar: [],
    weather: null,
    chat: null,
    preferences: {
      ...DEFAULT_PREFERENCES,
      updatedAt: stamp,
      dailySelection: {
        day,
        garmentIds: ids,
        options,
        updatedAt: stamp,
      },
    },
  }
}
