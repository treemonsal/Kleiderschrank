import { test, expect, type Page } from './base'
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

test('Looks aus echtem Bestand vorschlagen, speichern, benennen, favorisieren, für heute wählen und vollständig sichern', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await wardrobe(page)
  await page.getByRole('button', { name: 'Büro', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Büro', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: 'Aus der Garderobe vorschlagen', exact: true })
    .click()
  const result = page.getByRole('article', { name: 'Vorschlag' })
  await expect(result).toContainText('Hemd · Hose · Sneaker')
  await result.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(
    result.getByRole('button', { name: 'Gespeichert', exact: true }),
  ).toBeDisabled()
  const saved = page.locator('.saved-look')
  await expect(saved).toHaveCount(1)
  await expect(saved).toContainText('Büro · 0× · zuletzt noch nie')
  await saved.getByRole('button', { name: /bearbeiten$/ }).click()
  await page.getByRole('dialog').getByLabel('Outfit-Name').fill('Mein Bürolook')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Name speichern', exact: true })
    .click()
  const favorite = page.getByRole('button', {
    name: 'Mein Bürolook: Outfit-Favorit',
    exact: true,
  })
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('1 gespeichert · 1 Favoriten')).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('saved-outfit-iphone.png'),
    fullPage: true,
  })
  // „Für heute“ makes the saved look today's selection and opens Heute.
  await saved.getByRole('button', { name: 'Für heute', exact: true }).click()
  const daily = page.getByRole('region', { name: 'Dein Tageslook' })
  await expect(daily.locator('.outfit-piece')).toHaveCount(3)
  for (const name of ['Hemd', 'Hose', 'Sneaker'])
    await expect(
      daily.getByRole('button', { name: `${name} öffnen`, exact: true }),
    ).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Looks', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Mein Bürolook', exact: true }),
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
  expect(data.outfits[0].name).toBe('Mein Bürolook')
  expect(data.outfits[0].favorite).toBe(true)
  expect(data.outfits[0].occasion).toBe('Büro')
  expect(data.preferences.dailySelection.options.occasion).toBe('Büro')
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
  await expect(
    page.getByRole('heading', { name: 'Mein Bürolook', exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('Fehlende Kleidung wird erklärt und Löschungen entfernen abhängige Looks', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Looks', exact: true }).click()
  await page
    .getByRole('button', { name: 'Aus der Garderobe vorschlagen', exact: true })
    .click()
  await expect(
    page.getByText('Für diese Auswahl fehlen passende Schuhe.', {
      exact: false,
    }),
  ).toBeVisible()
  await expect(page.getByRole('article', { name: 'Vorschlag' })).toHaveCount(0)
  await wardrobe(page)
  await page
    .getByRole('button', { name: 'Aus der Garderobe vorschlagen', exact: true })
    .click()
  await page
    .getByRole('article', { name: 'Vorschlag' })
    .getByRole('button', { name: 'Speichern', exact: true })
    .click()
  await expect(page.locator('.saved-look')).toHaveCount(1)
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page.getByRole('button', { name: 'Hemd öffnen', exact: true }).click()
  // Sorted out, the piece leaves the wardrobe but its saved look stays.
  await page.getByRole('button', { name: 'Aussortieren', exact: true }).click()
  await page.getByRole('button', { name: 'Looks', exact: true }).click()
  await expect(page.locator('.saved-look')).toHaveCount(1)
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page
    .getByRole('button', { name: 'Nur aussortierte Stücke', exact: true })
    .click()
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
  await expect(page.locator('.saved-look')).toHaveCount(0)
  await expect(page.getByText('0 gespeichert · 0 Favoriten')).toBeVisible()
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
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`outfits-${width}.png`),
      fullPage: true,
    })
    for (const occasion of ['Alltag', 'Büro', 'Abend', 'Freizeit']) {
      const box = await page
        .getByRole('button', { name: occasion, exact: true })
        .boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(40)
    }
  })
}

test('„Zuletzt getragen“ sortiert gespeicherte Looks nach dem letzten Tragetag', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-20T10:00:00Z') })
  await page.goto('/')
  const stamp = '2026-01-01T00:00:00.000Z'
  const garments = [
    'Oberteile',
    'Hosen',
    'Schuhe',
    'Oberteile',
    'Oberteile',
  ].map((category, index) => ({
    id: `g${index}`,
    name: ['Hemd', 'Hose', 'Schuh', 'Shirt', 'Bluse'][index],
    category,
    color: ['Weiss', 'Blau', 'Schwarz', 'Grau', 'Rosa'][index],
    brand: '',
    seasons: [],
    styles: [],
    notes: '',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
  }))
  const look = (id: string, name: string, top: string, createdAt: string) => ({
    id,
    name,
    garmentIds: [top, 'g1', 'g2'],
    occasion: 'Alltag',
    season: 'Alle',
    style: 'Alle',
    favorite: false,
    createdAt,
    updatedAt: createdAt,
  })
  const day = (value: string, outfitId: string) => ({
    id: value,
    day: value,
    outfitId,
    status: 'worn',
    note: '',
    createdAt: stamp,
    updatedAt: stamp,
  })
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'looks.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 8,
        garments,
        outfits: [
          look('neu', 'Neu angelegt', 'g0', '2026-10-10T00:00:00.000Z'),
          look(
            'alt',
            'Alt, gestern getragen',
            'g3',
            '2026-09-01T00:00:00.000Z',
          ),
          look('nie', 'Nie getragen', 'g4', '2026-10-15T00:00:00.000Z'),
        ],
        feedback: [],
        preferences: null,
        calendar: [day('2026-10-12', 'neu'), day('2026-10-19', 'alt')],
        weather: null,
        chat: null,
      }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Looks', exact: true }).click()
  await expect(page.locator('.saved-look h3')).toHaveText([
    /Alt, gestern getragen/,
    /Neu angelegt/,
    /Nie getragen/,
  ])
})
