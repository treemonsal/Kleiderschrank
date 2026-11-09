import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
  savePreferences,
  styleProfileRevision,
  updatePreferences,
  WardrobeDatabase,
} from '../src/db'
import { updateBackupReminder } from '../src/backup-reminder'
import { DEFAULT_PREFERENCES } from '../src/outfit-model'

const databases: WardrobeDatabase[] = []
function database() {
  const instance = new WardrobeDatabase(`reliability-${crypto.randomUUID()}`)
  databases.push(instance)
  return instance
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()))
})

describe('Vorliebenrevisionen', () => {
  it('weist einen alten Vorliebenentwurf ab und erhält die neuere Auswahl', async () => {
    const db = database()
    const expected = styleProfileRevision(DEFAULT_PREFERENCES)
    await savePreferences(['Sportlich'], ['Blau'], db)
    await expect(
      savePreferences(['Elegant'], ['Weiss'], db, expected),
    ).rejects.toThrow('Deine Stilvorlieben wurden inzwischen geändert')
    expect(await db.preferences.get('personal')).toMatchObject({
      styles: ['Sportlich'],
      colors: ['Blau'],
    })
  })

  it('lässt reine Wetter- und Erinnerungsänderungen ohne Stilkonflikt bestehen', async () => {
    const db = database()
    const expected = styleProfileRevision(DEFAULT_PREFERENCES)
    await updatePreferences({ useWeather: false }, db)
    await updateBackupReminder({ disabled: true }, db)
    await savePreferences(['Elegant'], ['Weiss'], db, expected)
    expect(await db.preferences.get('personal')).toMatchObject({
      styles: ['Elegant'],
      colors: ['Weiss'],
      useWeather: false,
      backupReminder: { disabled: true },
    })
  })
})
