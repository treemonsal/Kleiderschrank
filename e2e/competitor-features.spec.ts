import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
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

test('Alltag-Einstellungen bleiben gespeichert', async ({ page }) => {
  await page.goto('/')
  await importData(page)
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

test('Ohne Preisfeld bleiben gespeicherte Preise beim Bearbeiten erhalten', async ({
  page,
}) => {
  await page.goto('/')
  await importData(page)
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page
    .getByRole('button', { name: 'Leinenhemd öffnen', exact: true })
    .click()
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel(/Preis/)).toHaveCount(0)
  await dialog.getByLabel('Name', { exact: false }).fill('Leinenhemd weiss')
  await dialog.getByRole('button', { name: 'Änderungen speichern' }).click()
  await expect(dialog).not.toBeVisible()
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const data = JSON.parse(
    await readFile((await (await download).path())!, 'utf8'),
  )
  const shirt = data.garments.find((item: { id: string }) => item.id === 'hemd')
  expect(shirt.name).toBe('Leinenhemd weiss')
  expect(shirt.price).toBe(60)
})
