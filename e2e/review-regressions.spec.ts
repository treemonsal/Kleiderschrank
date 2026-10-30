import { test, expect, type Page } from './base'
import { readFile } from 'node:fs/promises'

const timestamp = '2026-01-01T00:00:00.000Z'
const garments = ['Oberteile', 'Hosen', 'Schuhe'].map((category, index) => ({
  id: `review-item-${index}`,
  name: `Stück ${index}`,
  category,
  color: '',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  createdAt: timestamp,
  updatedAt: timestamp,
}))
const legacy = {
  app: 'MyStyle',
  version: 2,
  garments,
  outfits: [
    {
      id: 'review-look',
      name: 'Ursprünglicher Look',
      garmentIds: garments.map((item) => item.id),
      occasion: 'Alltag',
      season: 'Alle',
      style: 'Alle',
      favorite: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  feedback: [],
  preferences: null,
}
async function previewImport(page: Page, data: unknown) {
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'review.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  })
  await expect(page.getByRole('dialog')).toBeVisible()
}
async function savedEditor(page: Page) {
  await page.getByRole('button', { name: 'Looks', exact: true }).click()
  await page
    .locator('.saved-look')
    .getByRole('button', { name: /bearbeiten$/ })
    .click()
}

test('Zwei offene Outfit-Editoren überschreiben keine neueren Namen und erhalten den ungespeicherten Entwurf', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await previewImport(page, legacy)
  await page
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await savedEditor(page)
  await page.getByLabel('Outfit-Name').fill('Mein offener Entwurf')
  const second = await context.newPage()
  await second.goto('/')
  await savedEditor(second)
  await second.getByLabel('Outfit-Name').fill('Neuer Name aus zweitem Tab')
  await second
    .getByRole('button', { name: 'Name speichern', exact: true })
    .click()
  await expect(second.getByRole('dialog')).not.toBeVisible()
  await page
    .getByRole('button', { name: 'Name speichern', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('inzwischen geändert')
  await expect(page.getByLabel('Outfit-Name')).toHaveValue(
    'Mein offener Entwurf',
  )
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(
    page.getByRole('heading', {
      name: 'Neuer Name aus zweitem Tab',
      exact: true,
    }),
  ).toBeVisible()
})

test('Ersetzen mit älterer Sicherung warnt vor Kalender-, Rückmeldungs- und Wetterverlust', async ({
  page,
}) => {
  await page.goto('/')
  await previewImport(page, {
    ...legacy,
    version: 3,
    calendar: [
      {
        id: '2026-01-01',
        day: '2026-01-01',
        outfitId: 'review-look',
        status: 'worn',
        note: 'Mein Tag',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    weather: null,
  })
  await page
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await previewImport(page, legacy)
  const replacing = page.getByRole('radio', {
    name: /Vorhandenen Bestand ersetzen/,
  })
  const label = replacing.locator('..')
  for (const data of [
    'Rückmeldungen',
    'Stilvorlieben',
    'Kalendereinträge',
    'Wetterdaten',
    'älteren Sicherungen',
  ])
    await expect(label).toContainText(data)
  await replacing.check()
  await page
    .getByRole('button', {
      name: 'Bestand ersetzen und importieren',
      exact: true,
    })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const download = await downloading
  const data = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(data.calendar).toEqual([])
  expect(data.outfits).toHaveLength(1)
})
