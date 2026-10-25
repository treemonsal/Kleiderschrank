import { test, expect, type Page } from '@playwright/test'
const stamp = '2026-01-01T00:00:00.000Z'
const now = '2026-10-15T10:00:00.000Z'
const piece = (
  id: string,
  name: string,
  category: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  name,
  category,
  color: 'Weiss',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
  ...extra,
})
const garments = [
  piece('hemd', 'Leinenhemd', 'Oberteile', { price: 60 }),
  piece('shirt', 'Grünes Shirt', 'Oberteile', { color: 'Grün' }),
  piece('hose', 'Chino', 'Hosen', { color: 'Beige', price: 80 }),
  piece('schuh', 'Sneaker', 'Schuhe'),
]
const look = {
  id: 'look',
  name: 'Alltag · 3 Stücke',
  garmentIds: ['hemd', 'hose', 'schuh'],
  occasion: 'Alltag',
  season: 'Alle',
  style: 'Alle',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
}
async function importData(page: Page, calendar: unknown[] = []) {
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'features.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 4,
        garments,
        outfits: [look],
        feedback: [],
        preferences: null,
        calendar,
        weather: null,
      }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
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

test('Auswertung zeigt Wert, Kosten pro Tragen und Partner; Detail kombiniert ein Stück', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(now) })
  await page.goto('/')
  await importData(page, [worn('2026-10-10'), worn('2026-10-12')])
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page.getByRole('button', { name: 'Auswertung öffnen' }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toContainText('CHF 140')
  await expect(sheet).toContainText('Bester Preis pro Tragen')
  await expect(sheet).toContainText('CHF 30 pro Tragen')
  await expect(sheet).toContainText('Grünes Shirt')
  await sheet
    .getByRole('button', { name: /Leinenhemd/ })
    .first()
    .click()
  const detail = page.getByRole('dialog')
  await expect(detail).toContainText('2× getragen')
  await expect(detail).toContainText('CHF 30 pro Tragen')
  await detail.getByRole('button', { name: 'Was passt dazu?' }).click()
  const pairing = detail.getByRole('region', { name: 'Was passt dazu?' })
  await expect(pairing.locator('.pairing-look').first()).toContainText(
    'Leinenhemd',
  )
  await pairing.getByRole('button', { name: 'Gespeichert' }).first().waitFor()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('Heute getragen legt ein zweimal getragenes Oberteil automatisch in die Wäsche', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(now) })
  await page.goto('/')
  await importData(page, [
    {
      ...worn('2026-10-14'),
    },
    {
      ...worn('2026-10-15'),
      status: 'planned',
    },
  ])
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await page
    .getByRole('region', { name: 'Dein Tageslook' })
    .getByRole('button', { name: 'Heute getragen', exact: true })
    .click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Wäsche' }),
  ).toContainText('Leinenhemd liegt jetzt in der Wäsche')
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page.getByRole('button', { name: 'Nur Wäsche' }).click()
  await expect(
    page.getByRole('button', { name: 'Leinenhemd öffnen' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Chino öffnen' })).toHaveCount(
    0,
  )
})

test('Packliste plant Looks pro Tag; Alltag-Einstellungen bleiben gespeichert', async ({
  page,
}) => {
  await page.goto('/')
  await importData(page)
  await page.getByRole('button', { name: 'Looks', exact: true }).click()
  await page.getByRole('button', { name: 'Packliste für eine Reise' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('combobox', { name: 'Tage' }).selectOption('2')
  await expect(sheet.locator('.packing-days li')).toHaveCount(2)
  await expect(sheet).toContainText('Stücke für 2 Looks')
  const first = sheet.locator('.packing-list input').first()
  await first.check()
  await expect(first).toBeChecked()
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page
    .getByRole('combobox', { name: 'Temperaturempfinden' })
    .selectOption('cold')
  await page
    .getByRole('checkbox', { name: 'Automatisch in die Wäsche legen' })
    .uncheck()
  await page.reload()
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await expect(
    page.getByRole('combobox', { name: 'Temperaturempfinden' }),
  ).toHaveValue('cold')
  await expect(
    page.getByRole('checkbox', { name: 'Automatisch in die Wäsche legen' }),
  ).not.toBeChecked()
})
