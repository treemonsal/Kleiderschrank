import { test, expect } from './base'
const stamp = '2026-01-01T00:00:00.000Z'
const now = '2026-10-15T10:00:00.000Z'
const piece = (id: string, name: string, category: string, color: string) => ({
  id,
  name,
  category,
  color,
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
})
const garments = [
  piece('top', 'Rotes Shirt', 'Oberteile', 'Rot'),
  piece('pants', 'Jeans', 'Hosen', 'Blau'),
  piece('shoes', 'Sneaker', 'Schuhe', 'Weiss'),
  piece('spare', 'Grüner Pulli', 'Oberteile', 'Grün'),
]
const outfit = {
  id: 'look',
  name: 'Alltag · 3 Stücke',
  garmentIds: ['top', 'pants', 'shoes'],
  occasion: 'Alltag',
  season: 'Alle',
  style: 'Alle',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
}
const worn = (day: string) => ({
  id: day,
  day,
  outfitId: 'look',
  status: 'worn',
  note: '',
  createdAt: stamp,
  updatedAt: stamp,
})

test('Journal zeigt selten getragene Stücke zuerst und Skizzen zeigen die Farbe', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(now) })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'wear.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 4,
        garments,
        outfits: [outfit],
        feedback: [],
        preferences: null,
        calendar: [worn('2026-10-10'), worn('2026-10-13')],
        weather: null,
      }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Journal', exact: true }).click()
  const shelf = page.getByRole('region', { name: 'Lange nicht getragen' })
  await expect(shelf.locator('.journal-row strong').first()).toHaveText(
    'Grüner Pulli',
  )
  await expect(shelf).toContainText('Noch nie getragen')
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true)
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await expect(
    page.locator('.garment-card .photo-placeholder[data-color="Grün"]'),
  ).toHaveCount(1)
  await page.getByRole('button', { name: 'Jeans öffnen' }).click()
  await expect(page.getByRole('dialog').locator('.detail-count')).toHaveText(
    '2× getragen',
  )
  await expect(page.getByRole('dialog')).toContainText('zuletzt vor 2 Tagen')
  await page
    .getByRole('button', { name: /schliessen/i })
    .first()
    .click()
  await page.getByRole('button', { name: 'Grüner Pulli öffnen' }).click()
  await expect(page.getByRole('dialog')).toContainText('noch nie getragen')
})

test('Ohne bestätigte Tragetage zeigt das Journal die neuesten statt vergessener Stücke', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'plain.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 4,
        garments,
        outfits: [],
        feedback: [],
        preferences: null,
        calendar: [],
        weather: null,
      }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Dein Tageslook' })
      .locator('.outfit-piece')
      .first(),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Lange nicht getragen' }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Journal', exact: true }).click()
  await expect(
    page.getByRole('region', { name: 'Lange nicht getragen' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: 'Zuletzt hinzugefügt' }),
  ).toBeVisible()
})
