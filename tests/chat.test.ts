import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { CATEGORIES, type Garment } from '../src/model'
import {
  DEFAULT_PREFERENCES,
  DEFAULT_OUTFIT_OPTIONS,
  outfitKey,
} from '../src/outfit-model'
import {
  buildChatContext,
  chatRevision,
  MAX_CHAT_MESSAGES,
  parseChatReply,
  type ChatData,
} from '../src/chat-model'
import {
  appendChatTurn,
  clearChat,
  readChatData,
  saveChatLook,
} from '../src/chat-db'
import { deleteGarment, setLaundry, WardrobeDatabase } from '../src/db'
import {
  createDatabaseBackup,
  importFullBackup,
  parseFullBackup,
} from '../src/backup'
import { backupRevision } from '../src/backup-reminder'

const stamp = '2026-01-01T00:00:00.000Z'
const garment = (
  id: string,
  category: Garment['category'],
  extra: Partial<Garment> = {},
): Garment => ({
  id,
  category,
  name: id,
  color: 'Blau',
  brand: 'Bekannt',
  seasons: [],
  styles: ['Casual'],
  notes: 'PRIVATE-NOTE',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
  ...extra,
})
const pieces = [
  garment('shirt', 'Oberteile'),
  garment('pants', 'Hosen'),
  garment('shoes', 'Schuhe'),
  garment('red', 'Oberteile', { color: 'Rot' }),
  garment('dirty', 'Hosen', { inLaundry: true }),
]
const data = (): ChatData => ({
  garments: pieces,
  preferences: DEFAULT_PREFERENCES,
  feedback: [],
  outfits: [],
  calendar: [],
})
const reply = (d: ChatData, ids = ['shirt', 'pants', 'shoes']) => {
  const context = buildChatContext(d, 'Ein Look bitte')
  return {
    reply: 'Das blaue Oberteil passt zur Hose und den Schuhen.',
    garments: ids.map(
      (id) => `G${context.items.findIndex((item) => item.id === id) + 1}`,
    ),
    occasion: 'Alltag',
  }
}
const databases: WardrobeDatabase[] = []
async function database() {
  const db = new WardrobeDatabase(`chat-test-${crypto.randomUUID()}`)
  databases.push(db)
  await db.garments.bulkPut(pieces)
  return db
}
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete()
})

describe('Persönlicher, begrenzter Chat-Kontext', () => {
  it('bricht das Gespräch nicht durch reine Sicherungserinnerungen oder Exportbuchhaltung ab', () => {
    const d = data(),
      changed = {
        ...d,
        preferences: {
          ...d.preferences,
          backupReminder: { firstSeenAt: stamp, lastExportedAt: stamp },
        },
      }
    expect(chatRevision(changed)).toBe(chatRevision(d))
  })
  it('enthält echte Merkmale und Vorlieben, aber keine Fotos, Notizen, Koordinaten oder Provider-Codes', () => {
    const d = data()
    d.garments = pieces.map((item) => ({
      ...item,
      photo: new Blob(['private-pixels']),
    }))
    const context = buildChatContext(d, 'Was passt dazu?')
    expect(context.prompt).toContain('Bekannt')
    expect(context.prompt).not.toContain('private-pixels')
    expect(context.prompt).not.toContain('PRIVATE-NOTE')
    expect(context.prompt).not.toContain('latitude')
    expect(context.prompt).toContain('NO garment photos')
    expect(context.prompt).toContain('cannot edit, delete, plan')
  })
  it('begrenzt grosse Sammlungen auf 40 Stücke, erhält Kategorien und priorisiert genannte Teile', () => {
    const d = data()
    d.garments = Array.from({ length: 1000 }, (_, i) =>
      garment(`g-${String(i).padStart(4, '0')}`, CATEGORIES[i % 6], {
        name: i === 998 ? 'Besonderes Lieblingshemd' : `Stück ${i}`,
      }),
    )
    const context = buildChatContext(d, 'Besonderes Lieblingshemd')
    expect(context.items).toHaveLength(40)
    expect(new Set(context.items.map((item) => item.category)).size).toBe(6)
    expect(context.items.some((item) => item.id === 'g-0998')).toBe(true)
    expect(context.prompt.length).toBeLessThan(32000)
  })
  it('überträgt höchstens sechs vorherige Nachrichten und keine zurückliegenden Rohbewertungen', () => {
    const d = data()
    d.chat = {
      id: 'stylist',
      revision: 'r1',
      updatedAt: stamp,
      messages: Array.from({ length: 20 }, (_, i) => ({
        id: `m${i}`,
        role: i % 2 ? 'assistant' : 'user',
        text: `MESSAGE-${i}-END`,
        createdAt: stamp,
      })),
    }
    d.feedback = [
      {
        id: outfitKey(['shirt', 'pants', 'shoes']),
        garmentIds: ['shirt', 'pants', 'shoes'],
        verdict: 'liked',
        updatedAt: stamp,
      },
    ]
    const context = buildChatContext(d, 'Und morgen?')
    expect(context.prompt).not.toContain('MESSAGE-13-END')
    expect(context.prompt).toContain('MESSAGE-14-END')
    expect(context.prompt).toContain('MESSAGE-19-END')
    expect(context.prompt).not.toContain('"verdict"')
    expect(context.prompt).toContain('"observations":1')
  })
  it('erkennt einen geänderten Tag, Bestand, Feedback und Gesprächsreset als anderen Kontext', () => {
    const d = data(),
      revision = chatRevision(d)
    expect(
      chatRevision({
        ...d,
        garments: pieces.map((item) => ({ ...item, color: 'Rot' })),
      }),
    ).not.toBe(revision)
    expect(
      chatRevision({
        ...d,
        chat: {
          id: 'stylist',
          revision: 'changed',
          updatedAt: stamp,
          messages: [],
        },
      }),
    ).not.toBe(revision)
    expect(chatRevision(d, Date.parse('2026-10-19T12:00:00Z'))).not.toBe(
      chatRevision(d, Date.parse('2026-10-20T12:00:00Z')),
    )
  })
})

describe('Prüfbare Chat-Antworten und echte Look-Referenzen', () => {
  it('erlaubt allgemeine Beratung auch ohne Kleidung und verknüpft vollständige Looks mit echten IDs', () => {
    const empty = buildChatContext(
      { ...data(), garments: [] },
      'Was bedeutet Casual?',
    )
    expect(
      parseChatReply(
        {
          reply: 'Casual ist entspannte Alltagskleidung.',
          garments: [],
          occasion: 'Alltag',
        },
        empty,
      ).look,
    ).toBeUndefined()
    const d = data()
    expect(
      parseChatReply(reply(d), buildChatContext(d, 'Ein Look bitte')).look
        ?.garmentIds,
    ).toEqual(['shirt', 'pants', 'shoes'])
  })
  it('verwirft erfundene, doppelte, unvollständige und gewaschene Stücke', () => {
    const d = data(),
      context = buildChatContext(d, 'Ein Look bitte'),
      valid = reply(d)
    for (const garments of [
      ['G99'],
      ['G1', 'G1', 'G2'],
      ['G1'],
      reply(d, ['shirt', 'dirty', 'shoes']).garments,
    ])
      expect(() => parseChatReply({ ...valid, garments }, context)).toThrow()
  })
  it('verhindert ausdrücklich abgelehnte Kombinationen und ignoriert Ablehnung für einen anderen Anlass', () => {
    const d = data()
    d.feedback = [
      {
        id: outfitKey(['shirt', 'pants', 'shoes']),
        garmentIds: ['shirt', 'pants', 'shoes'],
        verdict: 'rejected',
        occasion: 'Alltag',
        updatedAt: stamp,
      },
    ]
    expect(() =>
      parseChatReply(reply(d), buildChatContext(d, 'Ein Look bitte')),
    ).toThrow()
    d.feedback[0].occasion = 'Büro'
    expect(
      parseChatReply(reply(d), buildChatContext(d, 'Ein Look bitte')).look,
    ).toBeDefined()
  })
  it('verwirft ungültige Antwortschemata und überlange Antworten', () => {
    const context = buildChatContext(data(), 'Hallo')
    for (const value of [
      null,
      {},
      { reply: '', garments: [], occasion: 'Alltag' },
      { reply: 'x'.repeat(1601), garments: [], occasion: 'Alltag' },
      { reply: 'Hallo', garments: [], occasion: 'Unbekannt' },
    ])
      expect(() => parseChatReply(value, context)).toThrow()
  })
})

describe('Gespräch, Migration und sichere Speicheraktionen', () => {
  it('migriert eine bestehende Datenbank 4 additiv und erhält Kleidung und Vorlieben', async () => {
    const name = `chat-migrate-${crypto.randomUUID()}`,
      old = new Dexie(name)
    old.version(4).stores({
      garments: 'id, category, updatedAt',
      outfits: 'id, updatedAt, *garmentIds',
      feedback: 'id, updatedAt, *garmentIds',
      preferences: 'id',
      calendar: 'id, day, outfitId, status, updatedAt',
      weather: 'id',
    })
    await old.table('garments').put(pieces[0])
    await old
      .table('preferences')
      .put({ ...DEFAULT_PREFERENCES, colors: ['Blau'] })
    old.close()
    const next = new WardrobeDatabase(name)
    databases.push(next)
    expect((await next.garments.get('shirt'))?.name).toBe('shirt')
    expect((await next.preferences.get('personal'))?.colors).toEqual(['Blau'])
    expect(await next.chat.count()).toBe(0)
    expect(next.verno).toBe(5)
  })
  it('speichert Frage und geprüfte Antwort gemeinsam und führt noch keine Outfitaktion aus', async () => {
    const db = await database(),
      before = await readChatData(db)
    await appendChatTurn(
      'Ein Look bitte',
      reply(before),
      chatRevision(before),
      new AbortController().signal,
      db,
    )
    const chat = await db.chat.get('stylist')
    expect(chat?.messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
    ])
    expect(chat?.messages[1].look?.garmentIds).toEqual([
      'shirt',
      'pants',
      'shoes',
    ])
    expect(await db.outfits.count()).toBe(0)
    expect(await db.calendar.count()).toBe(0)
    expect(await db.preferences.count()).toBe(0)
  })
  it('verhindert späte Antworten nach Reset, Datenänderung, Abbruch und konkurrierender Antwort', async () => {
    const db = await database(),
      before = await readChatData(db),
      result = reply(before)
    await clearChat(db)
    await expect(
      appendChatTurn(
        'Hallo',
        result,
        chatRevision(before),
        new AbortController().signal,
        db,
      ),
    ).rejects.toThrow('inzwischen')
    let current = await readChatData(db)
    const abort = new AbortController()
    abort.abort()
    await expect(
      appendChatTurn('Hallo', result, chatRevision(current), abort.signal, db),
    ).rejects.toThrow()
    await appendChatTurn(
      'Hallo',
      result,
      chatRevision(current),
      new AbortController().signal,
      db,
    )
    await expect(
      appendChatTurn(
        'Hallo',
        result,
        chatRevision(current),
        new AbortController().signal,
        db,
      ),
    ).rejects.toThrow('inzwischen')
    current = await readChatData(db)
    await setLaundry('shirt', true, db)
    await expect(
      appendChatTurn(
        'Hallo',
        result,
        chatRevision(current),
        new AbortController().signal,
        db,
      ),
    ).rejects.toThrow('inzwischen')
    expect((await db.chat.get('stylist'))?.messages).toHaveLength(2)
  })
  it('schreibt bei ungültiger Antwort weder verwaiste Frage noch leere Antwort', async () => {
    const db = await database(),
      before = await readChatData(db)
    await expect(
      appendChatTurn(
        'Hallo',
        {},
        chatRevision(before),
        new AbortController().signal,
        db,
      ),
    ).rejects.toThrow()
    expect(await db.chat.count()).toBe(0)
  })
  it('behält höchstens 30 vollständige Gesprächsrunden', async () => {
    const db = await database()
    for (let i = 0; i < 32; i++) {
      const d = await readChatData(db)
      await appendChatTurn(
        `Frage ${i}`,
        { reply: `Antwort ${i}`, garments: [], occasion: 'Alltag' },
        chatRevision(d),
        new AbortController().signal,
        db,
      )
    }
    const messages = (await db.chat.get('stylist'))!.messages
    expect(messages).toHaveLength(MAX_CHAT_MESSAGES)
    expect(messages[0].text).toBe('Frage 2')
    expect(messages[0].role).toBe('user')
    expect(messages.at(-1)?.text).toBe('Antwort 31')
  })
  it('speichert Vorschläge nur nach bewusster Aktion und prüft aktuelle Verfügbarkeit erneut', async () => {
    const db = await database(),
      d = await readChatData(db)
    await appendChatTurn(
      'Ein Look bitte',
      reply(d),
      chatRevision(d),
      new AbortController().signal,
      db,
    )
    const id = (await db.chat.get('stylist'))!.messages[1].id
    await setLaundry('shirt', true, db)
    await expect(saveChatLook(id, db)).rejects.toThrow('nicht mehr verfügbar')
    await setLaundry('shirt', false, db)
    const saved = await saveChatLook(id, db)
    expect(await saveChatLook(id, db)).toBe(saved)
    expect(await db.outfits.count()).toBe(1)
    expect(await db.calendar.count()).toBe(0)
  })
  it('erhält Gesprächstext beim Löschen eines Stücks, entfernt aber kaputte Vorschlagsreferenzen', async () => {
    const db = await database(),
      d = await readChatData(db)
    await appendChatTurn(
      'Ein Look bitte',
      reply(d),
      chatRevision(d),
      new AbortController().signal,
      db,
    )
    await deleteGarment('shirt', db)
    const messages = (await db.chat.get('stylist'))!.messages
    expect(messages[1].look).toBeUndefined()
    expect(messages[1].text).toContain('Oberteil')
    expect(() => parseFullBackup('')).toThrow()
    expect(
      parseFullBackup(await createDatabaseBackup(db)).chat?.messages,
    ).toHaveLength(2)
  })
})

describe('Sicherungen mit Gesprächsverlauf', () => {
  it('exportiert Version 5 und stellt Verlauf und Vorschläge mit neuer lokaler Revision wieder her', async () => {
    const db = await database(),
      d = await readChatData(db)
    await appendChatTurn(
      'Ein Look bitte',
      reply(d),
      chatRevision(d),
      new AbortController().signal,
      db,
    )
    const json = await createDatabaseBackup(db),
      parsed = parseFullBackup(json),
      other = await database()
    expect(JSON.parse(json).version).toBe(5)
    expect(json).not.toContain('mystyle-chat-consent')
    await importFullBackup(parsed, 'replace', other)
    expect((await other.chat.get('stylist'))?.messages).toEqual(
      parsed.chat?.messages,
    )
    expect((await other.chat.get('stylist'))?.revision).not.toBe(
      parsed.chat?.revision,
    )
  })
  it('lässt alte Sicherungen weiter lesen und verhindert Antworten nach Ersetzen durch alte Daten', async () => {
    const db = await database(),
      d = await readChatData(db),
      backup = JSON.parse(await createDatabaseBackup(db))
    backup.version = 4
    delete backup.chat
    const parsed = parseFullBackup(JSON.stringify(backup))
    expect(parsed.chat).toBeNull()
    await importFullBackup(parsed, 'replace', db)
    await expect(
      appendChatTurn(
        'Hallo',
        reply(d),
        chatRevision(d),
        new AbortController().signal,
        db,
      ),
    ).rejects.toThrow('inzwischen')
  })
  it('verwirft unvollständige, überlange und fremd referenzierte Verläufe vor einer Änderung', async () => {
    const db = await database(),
      d = await readChatData(db)
    await appendChatTurn(
      'Ein Look bitte',
      reply(d),
      chatRevision(d),
      new AbortController().signal,
      db,
    )
    const json = await createDatabaseBackup(db)
    for (const edit of ['odd', 'role', 'reference', 'text']) {
      const backup = JSON.parse(json)
      if (edit === 'odd') backup.chat.messages.pop()
      if (edit === 'role') backup.chat.messages[0].role = 'system'
      if (edit === 'reference')
        backup.chat.messages[1].look.garmentIds[0] = 'invented'
      if (edit === 'text') backup.chat.messages[0].text = 'x'.repeat(1001)
      expect(() => parseFullBackup(JSON.stringify(backup))).toThrow()
      expect((await db.chat.get('stylist'))?.messages).toHaveLength(2)
    }
  })
  it('ein älterer Verlauf überschreibt beim Zusammenführen keinen neueren Reset', async () => {
    const db = await database(),
      d = await readChatData(db)
    await appendChatTurn(
      'Hallo',
      { reply: 'Hallo!', garments: [], occasion: 'Alltag' },
      chatRevision(d),
      new AbortController().signal,
      db,
    )
    const backup = parseFullBackup(await createDatabaseBackup(db))
    await clearChat(db)
    await importFullBackup(backup, 'merge', db)
    expect((await db.chat.get('stylist'))?.messages).toEqual([])
  })
  it('ein lokaler Revisionswechsel ohne Textänderung löst keine neue Sicherungserinnerung aus', async () => {
    const empty = {
      garments: pieces,
      outfits: [],
      feedback: [],
      preferences: null,
    }
    const revision = backupRevision(empty)
    expect(
      backupRevision({
        ...empty,
        chat: { id: 'stylist', revision: 'r1', updatedAt: stamp, messages: [] },
      }),
    ).toBe(revision)
  })
})
