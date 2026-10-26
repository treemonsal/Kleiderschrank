import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type { Category } from '../src/model'

async function create(page: Page, name: string, category: Category) {
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page
    .getByRole('button', { name: 'Stück hinzufügen', exact: true })
    .first()
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name', { exact: false }).fill(name)
  await dialog
    .getByRole('combobox', { name: 'Kategorie', exact: true })
    .selectOption(category)
  await dialog.getByRole('button', { name: 'In die Garderobe legen' }).click()
  await expect(dialog).not.toBeVisible()
}
async function wardrobe(page: Page) {
  await create(page, 'Hemd', 'Oberteile')
  await create(page, 'Hose', 'Hosen')
  await create(page, 'Sneaker', 'Schuhe')
  await page.getByRole('button', { name: 'Looks', exact: true }).click()
}

test('Outfits aus echtem Bestand speichern, benennen, favorisieren und mit Vorlieben vollständig sichern', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await wardrobe(page)
  await page.getByRole('button', { name: 'Stilvorlieben bearbeiten' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Blau', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Minimalistisch', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Vorlieben speichern' })
    .click()
  await page
    .getByRole('button', { name: 'Outfits zusammenstellen', exact: true })
    .click()
  const result = page.getByRole('article', { name: 'Outfit-Vorschlag 1' })
  await expect(result).toBeVisible()
  for (const name of ['Hemd', 'Hose', 'Sneaker'])
    await expect(
      result.getByRole('button', { name: `${name} öffnen` }),
    ).toBeVisible()
  await result.getByText('Warum diese Kombination?', { exact: true }).click()
  await expect(
    result.getByText('Oberteil, Hose und Schuhe bilden die Basis.'),
  ).toBeVisible()
  await result.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(
    result.getByRole('button', { name: 'Gespeichert', exact: true }),
  ).toBeDisabled()
  // The calendar stays reachable from Looks as in earlier versions.
  await page.getByRole('button', { name: 'Kalender', exact: true }).click()
  await expect(
    page.getByRole('region', { name: 'Outfit-Kalender' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Entdecken', exact: true }).click()
  await expect(result).toBeVisible()
  await result
    .getByRole('button', { name: 'Vorschlag 1: Gefällt mir', exact: true })
    .click()
  await expect(
    result.getByRole('button', {
      name: 'Vorschlag 1: Gefällt mir',
      exact: true,
    }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: 'Gespeichert (1)', exact: true })
    .click()
  await page
    .getByRole('button', {
      name: 'Name ändern oder Outfit löschen',
      exact: true,
    })
    .click()
  await page
    .getByRole('dialog')
    .getByLabel('Outfit-Name')
    .fill('Mein Alltagslook')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Name speichern', exact: true })
    .click()
  await page
    .getByRole('button', {
      name: 'Mein Alltagslook: Outfit-Favorit',
      exact: true,
    })
    .click()
  await expect(
    page.getByRole('button', {
      name: 'Mein Alltagslook: Outfit-Favorit',
      exact: true,
    }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.screenshot({
    path: testInfo.outputPath('saved-outfit-iphone.png'),
    fullPage: true,
  })
  await page.reload()
  await page.getByRole('button', { name: 'Looks', exact: true }).click()
  await page
    .getByRole('button', { name: 'Gespeichert (1)', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Mein Alltagslook', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const download = await downloadPromise
  const json = await readFile((await download.path())!, 'utf8')
  const data = JSON.parse(json)
  expect(data.version).toBe(8)
  expect(data.outfits[0].name).toBe('Mein Alltagslook')
  expect(data.outfits[0].favorite).toBe(true)
  expect(data.preferences.colors).toContain('Blau')
  expect(data.feedback[0].verdict).toBe('liked')
  // A deliberate replacement with an empty backup must clear every data type.
  const empty = {
    ...data,
    garments: [],
    outfits: [],
    feedback: [],
    preferences: null,
  }
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'empty.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(empty)),
  })
  await page
    .getByRole('radio', { name: /Vorhandenen Bestand ersetzen/ })
    .check()
  await page
    .getByRole('button', {
      name: 'Bestand ersetzen und importieren',
      exact: true,
    })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'restore.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Looks', exact: true }).click()
  await page
    .getByRole('button', { name: 'Gespeichert (1)', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Mein Alltagslook', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Stilvorlieben bearbeiten' }).click()
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Blau', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(errors).toEqual([])
})

test('Fehlende Kleidung wird erklärt; Ablehnungen können zurückgesetzt werden und Löschungen entfernen abhängige Looks', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Looks', exact: true }).click()
  await page
    .getByRole('button', { name: 'Outfits zusammenstellen', exact: true })
    .click()
  await expect(
    page.getByText('Für diese Auswahl fehlen passende Schuhe.', {
      exact: false,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('article', { name: 'Outfit-Vorschlag 1' }),
  ).toHaveCount(0)
  await wardrobe(page)
  await page
    .getByRole('button', { name: 'Neu kombinieren', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Vorschlag 1: Passt nicht', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', {
      name: 'Die Kombination gefällt mir nicht',
      exact: true,
    })
    .click()
  await expect(
    page.getByRole('article', { name: 'Outfit-Vorschlag 1' }),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Ablehnungen zurücksetzen', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Ja, zurücksetzen', exact: true })
    .click()
  await expect(
    page.getByRole('article', { name: 'Outfit-Vorschlag 1' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Speichern', exact: true }).click()
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page.getByRole('button', { name: 'Hemd öffnen', exact: true }).click()
  await page.getByRole('button', { name: 'Stück löschen', exact: true }).click()
  await expect(
    page.getByText(
      'Outfits, Kalendereinträge und Bewertungen mit diesem Stück',
      {
        exact: false,
      },
    ),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Endgültig löschen', exact: true })
    .click()
  await page.getByRole('button', { name: 'Looks', exact: true }).click()
  await page
    .getByRole('button', { name: 'Gespeichert (0)', exact: true })
    .click()
  await expect(
    page.getByRole('heading', {
      name: 'Noch keine Looks gespeichert',
      exact: true,
    }),
  ).toBeVisible()
})

test('Eine gefälschte Bildsignatur reicht nicht für einen gültigen Import', async ({
  page,
}) => {
  await page.goto('/')
  await create(page, 'Original', 'Oberteile')
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  const item = {
    id: 'forged',
    name: 'Beschädigtes Foto',
    category: 'Schuhe',
    color: '',
    brand: '',
    seasons: [],
    styles: [],
    notes: '',
    favorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    photo: 'data:image/jpeg;base64,/9j/YmFk',
  }
  const json = JSON.stringify({ app: 'MyStyle', version: 1, garments: [item] })
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'forged.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  })
  await expect(page.getByRole('alert')).toContainText(
    'Foto in der Sicherung ist beschädigt',
  )
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Original öffnen', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Beschädigtes Foto öffnen', exact: true }),
  ).toHaveCount(0)
})

for (const width of [375, 390, 430]) {
  test(`Outfit-Bereich ${width}px bleibt im Editorial-Design bedienbar`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Looks', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Looks' })).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`outfits-${width}.png`),
      fullPage: true,
    })
    await page
      .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
      .click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'luxe')
    await page.getByRole('button', { name: 'Looks', exact: true }).click()
    await page.getByRole('button', { name: 'Stilvorlieben bearbeiten' }).click()
    expect(
      await page
        .getByRole('dialog')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`preferences-editorial-${width}.png`),
    })
  })
}
