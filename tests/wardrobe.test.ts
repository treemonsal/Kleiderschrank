import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBackup, importFullBackup, parseFullBackup } from '../src/backup'
import { WardrobeDatabase } from '../src/db'
import { filterGarments, type Garment } from '../src/model'

function garment(overrides: Partial<Garment> = {}): Garment {
  return {
    id: 'shirt-1',
    name: 'Leinenhemd',
    category: 'Oberteile',
    color: 'Weiss',
    brand: 'Arket',
    seasons: ['Sommer'],
    styles: ['Minimalistisch'],
    notes: 'Mein Lieblingshemd',
    favorite: false,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
    ...overrides,
  }
}
function backup(items: unknown[]) {
  return JSON.stringify({ app: 'MyStyle', version: 1, garments: items })
}

describe('Suche und Filter', () => {
  const items = [
    garment(),
    garment({
      id: 'shoe',
      name: 'Sneaker',
      category: 'Schuhe',
      brand: 'Veja',
      styles: ['Sportlich'],
      color: 'Blau',
      favorite: true,
    }),
  ]
  it('kombiniert Marke, Stil, Kategorie und Favoriten ohne Fremdbestand', () => {
    expect(
      filterGarments(items, ' ARKET ', 'Alle', false).map((i) => i.id),
    ).toEqual(['shirt-1'])
    expect(
      filterGarments(items, 'minimalistisch', 'Oberteile', false),
    ).toHaveLength(1)
    expect(
      filterGarments(items, 'blau', 'Schuhe', true).map((i) => i.id),
    ).toEqual(['shoe'])
    expect(filterGarments(items, 'blau', 'Oberteile', false)).toHaveLength(0)
    expect(filterGarments([], '', 'Alle', false)).toHaveLength(0)
  })
})

describe('Versioniertes Sicherungsformat', () => {
  it('exportiert alle Merkmale ohne Veränderung und liest sie wieder', async () => {
    const original = garment()
    const json = await createBackup([original])
    expect(parseFullBackup(json).garments).toEqual([original])
    expect(JSON.parse(json).app).toBe('MyStyle')
  })
  it('akzeptiert eingebettete PNG-Fotos ohne externe URL', async () => {
    const data =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XcAAAAASUVORK5CYII='
    const parsed = parseFullBackup(
      backup([{ ...garment(), photo: `data:image/png;base64,${data}` }]),
    )
    expect(parsed.garments[0].photo?.type).toBe('image/png')
    expect(parsed.garments[0].photo?.size).toBeGreaterThan(20)
  })
  it.each([
    'invalid json',
    '{"app":"Other","version":1,"garments":[]}',
    JSON.stringify({ app: 'MyStyle', version: 2, garments: [] }),
    backup([garment({ category: 'Invalid' as Garment['category'] })]),
    backup([garment({ createdAt: 'not a date' })]),
    backup([garment({ name: ' ' })]),
    backup([garment(), garment()]),
    backup([{ ...garment(), photo: 'https://example.com/photo.jpg' }]),
    backup([{ ...garment(), photo: 'data:image/svg+xml;base64,PHN2Zz4=' }]),
    backup([{ ...garment(), photo: 'data:image/jpeg;base64,PHNjcmlwdD4=' }]),
    backup([{ ...garment(), favorite: 'yes' }]),
  ])('weist beschädigte oder unzulässige Daten zurück (%#)', (input) => {
    expect(() => parseFullBackup(input)).toThrow()
  })
  it('akzeptiert einen leeren Bestand als bewusste Sicherung', () => {
    expect(parseFullBackup(backup([])).garments).toEqual([])
  })
})

describe('Atomarer IndexedDB-Import', () => {
  let db: WardrobeDatabase
  beforeEach(() => {
    db = new WardrobeDatabase(`test-${crypto.randomUUID()}`)
  })
  afterEach(async () => {
    await db.delete()
  })
  it('ergänzt neue Stücke, verhindert Duplikate und erhält neuere lokale Daten', async () => {
    const existing = garment({
      name: 'Neuer Name',
      updatedAt: '2026-02-01T12:00:00.000Z',
    })
    await db.garments.put(existing)
    const incoming = [garment(), garment({ id: 'new' })]
    expect(
      await importFullBackup(parseFullBackup(backup(incoming)), 'merge', db),
    ).toBe(1)
    expect(await db.garments.get(existing.id)).toEqual(existing)
    expect(
      await importFullBackup(parseFullBackup(backup(incoming)), 'merge', db),
    ).toBe(0)
    expect(await db.garments.count()).toBe(2)
  })
  it('übernimmt eine neuere Sicherung derselben ID', async () => {
    await db.garments.put(garment())
    const newer = garment({
      name: 'Aus der Sicherung',
      updatedAt: '2026-03-01T12:00:00.000Z',
    })
    expect(
      await importFullBackup(parseFullBackup(backup([newer])), 'merge', db),
    ).toBe(1)
    expect((await db.garments.get('shirt-1'))?.name).toBe(newer.name)
  })
  it('ersetzt den Bestand vollständig und kann auch leere Sicherungen wiederherstellen', async () => {
    await db.garments.put(garment())
    await importFullBackup(
      parseFullBackup(backup([garment({ id: 'replacement' })])),
      'replace',
      db,
    )
    expect(await db.garments.toCollection().primaryKeys()).toEqual([
      'replacement',
    ])
    await importFullBackup(parseFullBackup(backup([])), 'replace', db)
    expect(await db.garments.count()).toBe(0)
  })
  it('stellt den ursprünglichen Bestand nach einem Schreibfehler wieder her', async () => {
    const original = garment()
    await db.garments.put(original)
    db.garments.hook('creating', (_key, item) => {
      if (item.id === 'fail') throw new Error('Simulierter Speicherfehler')
    })
    await expect(
      importFullBackup(
        parseFullBackup(
          backup([garment({ id: 'ok' }), garment({ id: 'fail' })]),
        ),
        'replace',
        db,
      ),
    ).rejects.toThrow('Simulierter Speicherfehler')
    expect(await db.garments.toArray()).toEqual([original])
  })
})

describe('Zweitfarben beim Speichern', () => {
  it('speichert höchstens drei gültige Zweitfarben ohne die Hauptfarbe', async () => {
    const { WardrobeDatabase: Db, saveGarment: save } =
      await import('../src/db')
    const database = new Db(`secondary-${crypto.randomUUID()}`)
    try {
      const draft = {
        name: 'Streifenhemd',
        category: 'Oberteile' as const,
        color: 'Blau',
        secondaryColors: [
          'Weiss',
          'Blau',
          'Weiss',
          'Rot',
          'Türkis',
          'Grün',
          'Gelb',
        ],
        brand: '',
        seasons: [],
        styles: [],
        notes: '',
        favorite: false,
      }
      const id = await save(draft, undefined, database)
      expect((await database.garments.get(id))?.secondaryColors).toEqual([
        'Weiss',
        'Rot',
        'Grün',
      ])
      const stored = (await database.garments.get(id))!
      await save({ ...stored, secondaryColors: [] }, stored, database)
      expect('secondaryColors' in (await database.garments.get(id))!).toBe(
        false,
      )
    } finally {
      database.close()
      await (await import('dexie')).default.delete(database.name)
    }
  })
})
