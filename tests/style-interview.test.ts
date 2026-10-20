import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { WardrobeDatabase } from '../src/db'
import {
  createDatabaseBackup,
  importFullBackup,
  parseFullBackup,
} from '../src/backup'
import {
  DEFAULT_PREFERENCES,
  DEFAULT_OUTFIT_OPTIONS,
  type Preferences,
} from '../src/outfit-model'
import {
  DEFAULT_STYLE_PROFILE,
  createPersonalizationScorer,
} from '../src/personalization'
import {
  STYLE_QUESTIONS,
  interviewContext,
  interviewNotice,
  nextStyleQuestion,
  parseStyleInterview,
  type StyleInterview,
} from '../src/style-interview'
import { updateStyleInterview } from '../src/style-interview-db'
import {
  buildChatContext,
  chatRevision,
  type ChatData,
} from '../src/chat-model'
import { stylistPrompt } from '../src/stylist-model'
import { parseReadMarkers, unreadStylist } from '../src/stylist-inbox'
import { generateOutfits } from '../src/generator'
import type { Garment } from '../src/model'

const stamp = '2026-01-01T00:00:00.000Z'
const interview = (extra: Partial<StyleInterview> = {}): StyleInterview => ({
  version: 1,
  status: 'in-progress',
  answers: {},
  skipped: [],
  updatedAt: stamp,
  ...extra,
})
const preferences = (): Preferences => ({
  ...DEFAULT_PREFERENCES,
  styleProfile: { ...DEFAULT_STYLE_PROFILE },
  updatedAt: stamp,
})
const garments: Garment[] = (
  ['Oberteile', 'Hosen', 'Schuhe', 'Oberteile'] as const
).map((category, i) => ({
  id: `interview-${i}`,
  name: `Stück ${i}`,
  category,
  color: 'Weiss',
  styles: i === 0 ? ['Elegant'] : i === 3 ? ['Casual'] : [],
  seasons: [],
  brand: '',
  notes: '',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
}))
const databases: WardrobeDatabase[] = []
async function database() {
  const db = new WardrobeDatabase(`interview-test-${crypto.randomUUID()}`)
  databases.push(db)
  await db.preferences.put(preferences())
  await db.garments.bulkPut(garments)
  return db
}
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete()
})

describe('Vertieftes, freiwilliges Stilprofil', () => {
  it('behält eine manuelle Tagesauswahl beim blossen Starten und Abschliessen bei', async () => {
    const db = await database()
    const selection = {
      day: '2026-10-19',
      garmentIds: garments.slice(0, 3).map((g) => g.id),
      options: DEFAULT_OUTFIT_OPTIONS,
      updatedAt: stamp,
    }
    await db.preferences.update('personal', { dailySelection: selection })
    const started = await updateStyleInterview({ type: 'start' }, null, db)
    expect((await db.preferences.get('personal'))?.dailySelection).toEqual(
      selection,
    )
    const completed = await updateStyleInterview(
      { type: 'complete' },
      started.updatedAt,
      db,
    )
    expect((await db.preferences.get('personal'))?.dailySelection).toEqual(
      selection,
    )
    await updateStyleInterview(
      { type: 'answer', question: 'focus', answer: 'Klar & elegant' },
      completed.updatedAt,
      db,
    )
    expect(
      (await db.preferences.get('personal'))?.dailySelection,
    ).toBeUndefined()
  })
  it('zeigt nach dem kurzen Stilcheck genau eine freiwillige Einladung und berücksichtigt eine Ablehnung', () => {
    expect(interviewNotice(DEFAULT_PREFERENCES)).toBeUndefined()
    expect(interviewNotice(preferences())).toBe('invitation:style-interview-v1')
    expect(
      interviewNotice({
        ...preferences(),
        styleProfile: { ...DEFAULT_STYLE_PROFILE, status: 'skipped' },
      }),
    ).toBeUndefined()
    expect(
      interviewNotice({
        ...preferences(),
        styleInterview: interview({ status: 'dismissed' }),
      }),
    ).toBeUndefined()
    expect(
      interviewNotice({
        ...preferences(),
        styleInterview: interview({ status: 'completed' }),
      }),
    ).toBeUndefined()
  })
  it('findet nach bestätigten und übersprungenen Antworten die nächste tatsächlich offene Frage', () => {
    const p = interview({
      answers: { focus: 'Klar & elegant' },
      skipped: ['fit'],
    })
    expect(nextStyleQuestion(p)?.id).toBe('day')
    expect(interviewContext({ ...preferences(), styleInterview: p })).toEqual([
      { question: STYLE_QUESTIONS[0].title, answer: 'Klar & elegant' },
    ])
    expect(interviewNotice({ ...preferences(), styleInterview: p })).toContain(
      'question:day:',
    )
  })
  for (const [name, invalid] of [
    ['falsche Version', { version: 2 }],
    ['zu lange Freitextantwort', { answers: { avoid: 'x'.repeat(241) } }],
    ['nicht vorgesehene Auswahl', { answers: { focus: 'Erfundener Stil' } }],
    ['unbekannte Frage', { answers: { privateQuestion: 'secret' } }],
    [
      'Antwort und Überspringen zugleich',
      { answers: { fit: 'Weit & locker' }, skipped: ['fit'] },
    ],
    ['doppeltes Überspringen', { skipped: ['fit', 'fit'] }],
    ['unbekanntes Überspringen', { skipped: ['unknown'] }],
    ['ungültige Zeit', { updatedAt: 'yesterday' }],
    [
      'verborgene Daten nach Löschen',
      { status: 'dismissed', answers: { avoid: 'wool' } },
    ],
  ] as const)
    it(`weist ${name} zurück`, () =>
      expect(() =>
        parseStyleInterview({ ...interview(), ...invalid }),
      ).toThrow())
  it('speichert schrittweise, hält Überspringen getrennt und verändert keine Grundprofilantwort', async () => {
    const db = await database()
    let current = await updateStyleInterview({ type: 'start' }, null, db)
    current = await updateStyleInterview(
      { type: 'answer', question: 'focus', answer: 'Klar & elegant' },
      current.updatedAt,
      db,
    )
    current = await updateStyleInterview(
      { type: 'answer', question: 'fit', answer: null },
      current.updatedAt,
      db,
    )
    current = await updateStyleInterview(
      {
        type: 'answer',
        question: 'accessories',
        answer: 'Gern ein Accessoire',
      },
      current.updatedAt,
      db,
    )
    const saved = (await db.preferences.get('personal'))!
    expect(saved.styleProfile).toEqual(DEFAULT_STYLE_PROFILE)
    expect(saved.outfitOptions?.includeAccessory).toBe(true)
    expect(current.answers).toEqual({
      focus: 'Klar & elegant',
      accessories: 'Gern ein Accessoire',
    })
    expect(current.skipped).toEqual(['fit'])
    const complete = await updateStyleInterview(
      { type: 'complete' },
      current.updatedAt,
      db,
    )
    expect(complete.status).toBe('completed')
    expect(
      (
        await updateStyleInterview(
          { type: 'answer', question: 'fit', answer: 'Weit & locker' },
          complete.updatedAt,
          db,
        )
      ).skipped,
    ).toEqual([])
  })
  it('überschreibt bei zwei Fenstern keine neuere Antwort und bleibt auch nach zurückgestellter Uhr monoton', async () => {
    const db = await database()
    const first = await updateStyleInterview({ type: 'start' }, null, db)
    const next = await updateStyleInterview(
      { type: 'answer', question: 'fit', answer: 'Weit & locker' },
      first.updatedAt,
      db,
    )
    await expect(
      updateStyleInterview(
        { type: 'answer', question: 'fit', answer: 'Eher körpernah' },
        first.updatedAt,
        db,
      ),
    ).rejects.toThrow('inzwischen')
    expect(
      (await db.preferences.get('personal'))?.styleInterview?.answers.fit,
    ).toBe('Weit & locker')
    const future = '2090-01-01T00:00:00.000Z'
    await db.preferences.update('personal', {
      updatedAt: future,
      styleInterview: { ...next, updatedAt: future },
    })
    const saved = await updateStyleInterview({ type: 'complete' }, future, db)
    expect(saved.updatedAt > future).toBe(true)
  })
  it('nimmt bestätigte Angaben in beide Online-Kontexte auf und verwirft Antworten bei Reset', async () => {
    const db = await database()
    const start = await updateStyleInterview({ type: 'start' }, null, db)
    await updateStyleInterview(
      { type: 'answer', question: 'avoid', answer: 'Keine kratzigen Stoffe' },
      start.updatedAt,
      db,
    )
    const p = (await db.preferences.get('personal'))!
    const d: ChatData = {
      garments,
      preferences: p,
      feedback: [],
      outfits: [],
      calendar: [],
    }
    expect(buildChatContext(d, 'Ein Look bitte').prompt).toContain(
      'Keine kratzigen Stoffe',
    )
    expect(
      stylistPrompt(
        {
          items: garments,
          candidates: generateOutfits(garments, DEFAULT_OUTFIT_OPTIONS, p, []),
          options: DEFAULT_OUTFIT_OPTIONS,
          preferences: p,
        },
        '',
      ),
    ).toContain('Keine kratzigen Stoffe')
    const revision = chatRevision(d)
    await updateStyleInterview(
      { type: 'reset' },
      p.styleInterview!.updatedAt,
      db,
    )
    d.preferences = (await db.preferences.get('personal'))!
    expect(buildChatContext(d, 'Ein Look bitte').prompt).not.toContain(
      'Keine kratzigen Stoffe',
    )
    expect(chatRevision(d)).not.toBe(revision)
    expect(d.preferences.styleProfile).toEqual(DEFAULT_STYLE_PROFILE)
  })
  it('gewichtet die ausdrücklich gewählte Stilrichtung auch ohne Online-KI anhand vorhandener Stilmerkmale', () => {
    const p = {
      ...preferences(),
      styleInterview: interview({ answers: { focus: 'Klar & elegant' } }),
    }
    const scorer = createPersonalizationScorer(garments, p, [])
    expect(scorer.itemScore(garments[0])).toBeGreaterThan(
      scorer.itemScore(garments[3]),
    )
    expect(
      generateOutfits(garments, DEFAULT_OUTFIT_OPTIONS, p, [])[0].garmentIds,
    ).toContain(garments[0].id)
  })
  it('sichert bestätigte Antworten in Format 7, liest Formate 1–6 und weist ungültige neue Antworten vor jedem Import ab', async () => {
    const db = await database()
    const current = await updateStyleInterview(
      { type: 'answer', question: 'avoid', answer: 'Keine Logos' },
      null,
      db,
    )
    const json = await createDatabaseBackup(db)
    expect(JSON.parse(json).version).toBe(7)
    const parsed = await parseFullBackup(json)
    expect(parsed.preferences?.styleInterview).toEqual(current)
    for (const version of [1, 2, 3, 4, 5, 6]) {
      const old = JSON.parse(json)
      old.version = version
      delete old.preferences.styleInterview
      expect(parseFullBackup(JSON.stringify(old))).toBeDefined()
    }
    const bad = JSON.parse(json)
    bad.preferences.styleInterview.answers.avoid = 'x'.repeat(241)
    expect(() => parseFullBackup(JSON.stringify(bad))).toThrow()
    expect((await db.preferences.get('personal'))?.styleInterview).toEqual(
      current,
    )
    await updateStyleInterview({ type: 'reset' }, current.updatedAt, db)
    await importFullBackup(parsed, 'merge', db)
    expect((await db.preferences.get('personal'))?.styleInterview?.status).toBe(
      'dismissed',
    )
    await importFullBackup(parsed, 'replace', db)
    expect(
      (await db.preferences.get('personal'))?.styleInterview?.answers.avoid,
    ).toBe('Keine Logos')
  })
  it('lässt beim Zusammenführen neuere allgemeine Einstellungen keine alten gelöschten Antworten wiederherstellen', async () => {
    const db = await database()
    const first = await updateStyleInterview(
      { type: 'answer', question: 'avoid', answer: 'Keine Logos' },
      null,
      db,
    )
    const older = parseFullBackup(await createDatabaseBackup(db))
    const deleted = await updateStyleInterview(
      { type: 'reset' },
      first.updatedAt,
      db,
    )
    older.preferences!.updatedAt = new Date(
      Date.parse(deleted.updatedAt) + 100,
    ).toISOString()
    older.preferences!.colors = ['Blau']
    await importFullBackup(older, 'merge', db)
    const saved = (await db.preferences.get('personal'))!
    expect(saved.colors).toEqual(['Blau'])
    expect(saved.styleInterview!.status).toBe('dismissed')
    expect(saved.styleInterview!.answers).toEqual({})
    expect(saved.updatedAt > older.preferences!.updatedAt).toBe(true)
  })
})

describe('Ehrliche Lesemarkierungen', () => {
  it('benachrichtigt nur über ungesehene vorhandene Antworten oder echte freiwillige Fragen', () => {
    expect(unreadStylist(undefined, undefined, {})).toEqual({
      reply: false,
      interview: false,
    })
    expect(unreadStylist('reply-1', 'invitation', {})).toEqual({
      reply: true,
      interview: true,
    })
    expect(
      unreadStylist('reply-1', 'invitation', {
        reply: 'reply-1',
        interview: 'invitation',
      }),
    ).toEqual({ reply: false, interview: false })
    expect(
      unreadStylist('reply-2', undefined, { reply: 'reply-1' }).reply,
    ).toBe(true)
  })
  it('verträgt beschädigte oder überlange gerätelokale Lesemarkierungen', () => {
    expect(parseReadMarkers('{')).toEqual({})
    expect(parseReadMarkers('[]')).toEqual({})
    expect(
      parseReadMarkers(
        JSON.stringify({ reply: 'x'.repeat(201), interview: 'seen' }),
      ),
    ).toEqual({ reply: undefined, interview: 'seen' })
  })
})
