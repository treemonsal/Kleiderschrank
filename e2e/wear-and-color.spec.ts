import { test, expect } from '@playwright/test'
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

test('Tragestatistik sortiert selten getragene Stücke nach vorne und Skizzen zeigen die Farbe', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(now) })
  await page.goto('/')
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
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
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await page.getByRole('button', { name: 'Sortierung ändern' }).click()
  await page
    .getByRole('combobox', { name: 'Sortierung' })
    .selectOption('least-worn')
  await expect(
    page.locator('.garment-grid .garment-card h3').first(),
  ).toHaveText('Grüner Pulli')
  await expect(
    page.locator('.garment-card .garment-sketch[data-color="Grün"]'),
  ).toHaveCount(1)
  await page.getByRole('button', { name: 'Jeans öffnen' }).click()
  await expect(page.getByRole('dialog')).toContainText(
    '2× getragen · zuletzt vor 2 Tagen',
  )
  await page
    .getByRole('button', { name: /schliessen/i })
    .first()
    .click()
  await page.getByRole('button', { name: 'Grüner Pulli öffnen' }).click()
  await expect(page.getByRole('dialog')).toContainText(
    'Noch nie als getragen bestätigt',
  )
})
