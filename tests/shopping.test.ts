import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { shoppingFixture } from './fixtures/shopping'
import {
  DEFAULT_SHOPPING,
  parseShoppingIdeas,
  parseShoppingPreferences,
  shoppingEvidence,
  shoppingLink,
  shoppingOptions,
  shoppingPieces,
  shoppingPrompt,
  shoppingRevision,
  shoppingTarget,
} from '../src/shopping-model'
import { saveShoppingPreferences } from '../src/shopping-db'
import { WardrobeDatabase, updatePreferences } from '../src/db'
import {
  createDatabaseBackup,
  importFullBackup,
  parseFullBackup,
} from '../src/backup'
const now = Date.parse('2026-10-20T12:00:00.000Z')
const databases: WardrobeDatabase[] = []
function database() {
  const db = new WardrobeDatabase(`shopping-${crypto.randomUUID()}`)
  databases.push(db)
  return db
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()))
})
function reply(data = shoppingFixture(now)) {
  const pieces = shoppingPieces(data)
  return {
    ideas: [
      {
        name: 'Beiges Overshirt',
        category: 'Jacken',
        color: 'Beige',
        style: 'Minimalistisch',
        why: 'Ergänzt dein blaues Hemd und die dunkle Jeans in deiner bevorzugten ruhigen Farbpalette.',
        with: ['shop-0', 'shop-3', 'shop-4'].map(
          (id) => `G${pieces.findIndex((item) => item.id === id) + 1}`,
        ),
      },
    ],
  }
}
describe('Ehrliche Grundlage für Shopping', () => {
  it('unlocks only with style evidence, distinct rated looks and confirmed wear across two weeks', () => {
    const data = shoppingFixture(now)
    expect(shoppingEvidence(data, now)).toMatchObject({
      ready: true,
      days: 7,
      ratings: 3,
      likes: 2,
    })
    expect(
      shoppingEvidence(
        {
          ...data,
          calendar: data.calendar.map((entry) => ({
            ...entry,
            status: 'planned',
          })),
        },
        now,
      ).ready,
    ).toBe(false)
    expect(
      shoppingEvidence(
        { ...data, calendar: [...data.calendar.slice(0, 6), data.calendar[0]] },
        now,
      ).ready,
    ).toBe(false)
    expect(
      shoppingEvidence(
        {
          ...data,
          calendar: data.calendar.map((entry, i) => ({
            ...entry,
            day: `2026-10-${String(i + 10).padStart(2, '0')}`,
          })),
        },
        now,
      ).ready,
    ).toBe(false)
    expect(
      shoppingEvidence(
        {
          ...data,
          feedback: [data.feedback[0], data.feedback[0], data.feedback[0]],
        },
        now,
      ).ready,
    ).toBe(false)
    expect(
      shoppingEvidence(
        {
          ...data,
          feedback: data.feedback.map((entry) => ({
            ...entry,
            verdict: 'rejected',
          })),
        },
        now,
      ).ready,
    ).toBe(false)
    expect(
      shoppingEvidence(
        {
          ...data,
          preferences: { ...data.preferences, styleProfile: undefined },
        },
        now,
      ).ready,
    ).toBe(false)
  })
  it('excludes future, old, broken and incomplete history; three detailed answers can replace the short check', () => {
    const data = shoppingFixture(now)
    expect(
      shoppingEvidence(
        {
          ...data,
          calendar: data.calendar.map((entry) => ({
            ...entry,
            day: '2027-01-01',
          })),
        },
        now,
      ).ready,
    ).toBe(false)
    expect(
      shoppingEvidence(
        {
          ...data,
          calendar: data.calendar.map((entry) => ({
            ...entry,
            day: '2025-01-01',
          })),
        },
        now,
      ).ready,
    ).toBe(false)
    expect(
      shoppingEvidence(
        {
          ...data,
          garments: data.garments.filter((item) => item.category !== 'Schuhe'),
        },
        now,
      ).ready,
    ).toBe(false)
    expect(
      shoppingEvidence(
        {
          ...data,
          feedback: data.feedback.map((entry) => ({
            ...entry,
            updatedAt: '2027-01-01T00:00:00.000Z',
          })),
        },
        now,
      ).ready,
    ).toBe(false)
    data.preferences.styleProfile = undefined
    data.preferences.styleInterview = {
      version: 1,
      status: 'in-progress',
      answers: {
        focus: 'Lässig & reduziert',
        fit: 'Gerade & entspannt',
        patterns: 'Lieber unifarben',
      },
      skipped: [],
      updatedAt: data.preferences.updatedAt,
    }
    expect(shoppingEvidence(data, now).ready).toBe(true)
  })
  it('sends bounded balanced metadata and confirmed preferences, without private pixels, notes or URLs', () => {
    const data = shoppingFixture(Date.now())
    data.garments.push(
      ...Array.from({ length: 60 }, (_, i) => ({
        ...data.garments[0],
        id: `extra-${i}`,
      })),
    )
    const prompt = shoppingPrompt(data),
      reference = JSON.parse(prompt.split('REFERENCE DATA:\n')[1])
    expect(reference.garments).toHaveLength(40)
    expect(
      reference.garments.some(
        (item: { wearCount90Days: number }) => item.wearCount90Days > 0,
      ),
    ).toBe(true)
    expect(reference.budget).toEqual({
      currency: 'CHF',
      hardMaximumPerItem: 50,
      preferBelow: 50,
      accessoriesPreferBelow: 25,
    })
    expect(
      reference.garments.some(
        (item: { category: string }) => item.category === 'Schuhe',
      ),
    ).toBe(true)
    expect(prompt).not.toContain('PRIVATE-')
    expect(prompt).not.toContain('photo:')
    expect(
      shoppingPieces({
        ...data,
        garments: data.garments.map((item) => ({ ...item, inLaundry: true })),
      }),
    ).toEqual([])
  })
})
describe('Kaufideen und harte Preisgrenzen', () => {
  it('validates wardrobe references and a complete outfit, allows no-purchase advice', () => {
    const data = shoppingFixture(now)
    const ideas = parseShoppingIdeas(reply(data), data)
    expect(ideas[0].withIds).toEqual(['shop-0', 'shop-3', 'shop-4'])
    expect(parseShoppingIdeas({ ideas: [] }, data)).toEqual([])
    for (const labels of [
      ['G999'],
      ['G1', 'G1'],
      ['G1'],
      ['https://shop.invalid'],
    ]) {
      const bad = reply(data)
      bad.ideas[0].with = labels
      expect(() => parseShoppingIdeas(bad, data)).toThrow()
    }
    expect(() =>
      parseShoppingIdeas(reply(data), {
        ...data,
        garments: data.garments.filter((item) => item.id !== 'shop-4'),
      }),
    ).toThrow()
  })
  it('rejects invented prices, shop URLs, extra fields, avoided colours and accessory conflicts', () => {
    const data = shoppingFixture(now)
    for (const patch of [
      { price: 120 },
      { url: 'https://unsafe.invalid' },
      { why: 'Kostet 150 CHF' },
      { color: 'Violett' },
      { name: ' ' },
      { category: 'Fantasie' },
    ]) {
      const result = reply(data)
      Object.assign(result.ideas[0], patch)
      expect(() => parseShoppingIdeas(result, data)).toThrow()
    }
    data.preferences.styleInterview = {
      version: 1,
      status: 'completed',
      answers: { accessories: 'Lieber ohne Extras' },
      skipped: [],
      updatedAt: data.preferences.updatedAt,
    }
    const result = reply(data)
    result.ideas[0].category = 'Accessoires'
    result.ideas[0].name = 'Beiger Gürtel'
    expect(() => parseShoppingIdeas(result, data)).toThrow()
  })
  it('filters exact duplicates even when an owned item is in laundry', () => {
    const data = shoppingFixture(now)
    data.garments.find((item) => item.id === 'shop-5')!.inLaundry = true
    const result = reply(data)
    result.ideas[0].name = 'Blaue Jacke'
    expect(parseShoppingIdeas(result, data)).toEqual([])
  })
  it('always builds Swiss retailer links with a bounded server price filter, preferring 50/25', () => {
    const data = shoppingFixture(now),
      idea = parseShoppingIdeas(reply(data), data)[0]
    for (const assortment of ['all', 'women', 'men'] as const)
      for (const maxPriceCHF of [25, 50, 75, 100]) {
        const url = new URL(shoppingLink(idea, { maxPriceCHF, assortment }))
        expect(url.origin).toBe('https://www.zalando.ch')
        expect(url.searchParams.get('price_to')).toBe(String(maxPriceCHF))
        expect(url.searchParams.get('order')).toBe('price')
        expect(url.searchParams.get('q')).toBe(idea.name)
        expect(url.searchParams.get('dir')).toBe('asc')
        expect(shoppingTarget(idea, maxPriceCHF)).toBe(
          Math.min(maxPriceCHF, 50),
        )
      }
    expect(shoppingTarget({ ...idea, category: 'Accessoires' }, 100)).toBe(25)
    for (const limit of [0, -5, 101, 150, NaN, Infinity, 50.5])
      expect(() =>
        parseShoppingPreferences({ maxPriceCHF: limit, assortment: 'all' }),
      ).toThrow()
    expect(() => shoppingLink(idea, DEFAULT_SHOPPING, 100)).toThrow()
    expect(() =>
      shoppingLink(idea, {
        ...DEFAULT_SHOPPING,
        assortment: 'malicious' as 'all',
      }),
    ).toThrow()
  })
  it('invalidates on budget, profile, laundry and wardrobe changes without reacting to backup reminders', () => {
    const data = shoppingFixture(now),
      before = shoppingRevision(data, now)
    expect(
      shoppingRevision(
        {
          ...data,
          preferences: {
            ...data.preferences,
            shopping: { maxPriceCHF: 25, assortment: 'all' },
          },
        },
        now,
      ),
    ).not.toBe(before)
    expect(
      shoppingRevision(
        {
          ...data,
          preferences: {
            ...data.preferences,
            backupReminder: {
              firstSeenAt: data.preferences.updatedAt,
              disabled: true,
            },
          },
        },
        now,
      ),
    ).toBe(before)
    expect(
      shoppingRevision(
        {
          ...data,
          garments: data.garments.map((item) => ({ ...item, inLaundry: true })),
        },
        now,
      ),
    ).not.toBe(before)
  })
})
describe('Persistenz und Sicherungsformat 7', () => {
  it('merges separate setting changes atomically and does not discard a daily look', async () => {
    const db = database(),
      data = shoppingFixture(now)
    await db.preferences.put({
      ...data.preferences,
      dailySelection: {
        day: '2026-10-20',
        garmentIds: ['shop-0', 'shop-3', 'shop-4'],
        options: {
          occasion: 'Alltag',
          season: 'Alle',
          style: 'Alle',
          includeAccessory: false,
        },
        updatedAt: data.preferences.updatedAt,
      },
    })
    await Promise.all([
      saveShoppingPreferences({ maxPriceCHF: 25 }, db),
      saveShoppingPreferences({ assortment: 'women' }, db),
    ])
    const p = (await db.preferences.get('personal'))!
    expect(p.shopping).toMatchObject({ maxPriceCHF: 25, assortment: 'women' })
    expect(p.dailySelection?.garmentIds).toHaveLength(3)
    await expect(
      saveShoppingPreferences({ maxPriceCHF: 101 }, db),
    ).rejects.toThrow()
    expect((await db.preferences.get('personal'))?.shopping?.maxPriceCHF).toBe(
      25,
    )
  })
  it('round-trips budget and assortment, reads old backups and rejects unsafe budgets before writes', async () => {
    const db = database(),
      other = database()
    await saveShoppingPreferences({ maxPriceCHF: 75, assortment: 'men' }, db)
    const json = await createDatabaseBackup(db),
      raw = JSON.parse(json)
    expect(raw.version).toBe(8)
    expect(json).not.toContain('mystyle-shopping-consent')
    await importFullBackup(parseFullBackup(json), 'replace', other)
    expect(
      shoppingOptions((await other.preferences.get('personal'))!),
    ).toMatchObject({ maxPriceCHF: 75, assortment: 'men' })
    for (const version of [2, 3, 4, 5, 6, 7]) {
      const old = JSON.parse(json)
      old.version = version
      delete old.preferences.shopping
      expect(parseFullBackup(JSON.stringify(old))).toBeDefined()
    }
    raw.preferences.shopping.maxPriceCHF = 101
    expect(() => parseFullBackup(JSON.stringify(raw))).toThrow()
    expect(
      (await other.preferences.get('personal'))?.shopping?.maxPriceCHF,
    ).toBe(75)
  })
  it('keeps newer shopping choices through newer general preferences and old backups without shopping', async () => {
    const db = database()
    await saveShoppingPreferences({ maxPriceCHF: 25 }, db)
    const original = parseFullBackup(await createDatabaseBackup(db))
    await saveShoppingPreferences({ maxPriceCHF: 50 }, db)
    original.preferences!.updatedAt = new Date(Date.now() + 1000).toISOString()
    await importFullBackup(original, 'merge', db)
    expect((await db.preferences.get('personal'))?.shopping?.maxPriceCHF).toBe(
      50,
    )
    const old = parseFullBackup(await createDatabaseBackup(db))
    delete old.preferences!.shopping
    old.preferences!.updatedAt = new Date(Date.now() + 2000).toISOString()
    await importFullBackup(old, 'merge', db)
    expect((await db.preferences.get('personal'))?.shopping?.maxPriceCHF).toBe(
      50,
    )
    await updatePreferences({ styles: ['Casual'] }, db)
    expect((await db.preferences.get('personal'))?.shopping?.maxPriceCHF).toBe(
      50,
    )
  })
})
