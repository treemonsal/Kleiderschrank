import { describe, expect, it } from 'vitest'
import { storageError } from '../src/db'

describe('Speicherfehler', () => {
  it('erklärt Safaris privates Surfen statt „versuche es erneut“', () => {
    const safari = new Error(
      'Error preparing Blob/File data to be stored in object store',
    )
    expect(storageError(safari)).toContain('privaten Surfen')
    // Dexie wraps the browser error.
    const wrapped = Object.assign(new Error('UnknownError'), { inner: safari })
    expect(storageError(wrapped)).toContain('privaten Surfen')
  })

  it('bleibt bei anderen Fehlern allgemein', () => {
    expect(storageError(new Error('kaputt'))).toContain(
      'konnten nicht lokal gespeichert',
    )
    expect(
      storageError(new DOMException('voll', 'QuotaExceededError')),
    ).toContain('Gerätespeicher ist voll')
    expect(storageError(null)).toContain('konnten nicht lokal gespeichert')
  })
})
