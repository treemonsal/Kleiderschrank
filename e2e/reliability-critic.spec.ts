import { test, expect, type Page } from '@playwright/test'

test.use({ timezoneId: 'Europe/Zurich' })

async function seed(page: Page) {
  await page.goto('/')
  const day = await page.evaluate(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })
  const stamp = '2026-01-01T00:00:00.000Z'
  const garments = (['Oberteile', 'Hosen', 'Schuhe'] as const).map(
    (category, index) => ({
      id: `reliability-${index}`,
      name: ['Review-Hemd', 'Review-Hose', 'Review-Schuhe'][index],
      category,
      color: 'Blau',
      brand: '',
      notes: '',
      styles: [],
      seasons: [],
      favorite: false,
      createdAt: stamp,
      updatedAt: stamp,
    }),
  )
  const outfit = {
    id: 'reliability-look',
    name: 'Mein geplanter Look',
    garmentIds: garments.map((item) => item.id),
    occasion: 'Alltag',
    season: 'Alle',
    style: 'Alle',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
  }
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'reliability.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 4,
        garments,
        outfits: [outfit],
        feedback: [],
        preferences: null,
        calendar: [
          {
            id: day,
            day,
            outfitId: outfit.id,
            status: 'planned',
            note: 'Vorhandene Notiz',
            createdAt: stamp,
            updatedAt: stamp,
          },
        ],
        weather: null,
      }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
}

test('Ein offener Tagesplan behält seinen Entwurf bei Änderungen in einem zweiten Fenster', async ({
  page,
  context,
}) => {
  await seed(page)
  await page.getByRole('button', { name: 'Journal', exact: true }).click()
  await page
    .getByRole('button', { name: 'Plan bearbeiten', exact: true })
    .click()
  const editor = page.getByRole('dialog')
  const note = editor.getByLabel('Notiz zum Tag')
  await note.fill('Mein noch nicht gespeicherter Entwurf')

  const other = await context.newPage()
  await other.goto('/')
  await other.getByRole('button', { name: 'Journal', exact: true }).click()
  await other
    .getByRole('button', { name: 'Plan bearbeiten', exact: true })
    .click()
  await other.getByLabel('Notiz zum Tag').fill('Neue Notiz aus Fenster zwei')
  await other
    .getByRole('button', { name: 'Tag speichern', exact: true })
    .click()
  await expect(other.getByRole('dialog')).not.toBeVisible()
  // Wait for the live data to arrive before inspecting the protected form.
  await expect(page.locator('main .calendar-note')).toHaveText(
    'Neue Notiz aus Fenster zwei',
  )
  await expect(note).toHaveValue('Mein noch nicht gespeicherter Entwurf')
  await editor
    .getByRole('button', { name: 'Tag speichern', exact: true })
    .click()
  await expect(editor.getByRole('alert')).toContainText(
    'Der Tag wurde inzwischen geändert',
  )
  await expect(note).toHaveValue('Mein noch nicht gespeicherter Entwurf')
  await expect(page.locator('main .calendar-note')).toHaveText(
    'Neue Notiz aus Fenster zwei',
  )
  await editor.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(editor).toContainText('Ungespeicherte Änderungen verwerfen?')
  await editor
    .getByRole('button', { name: 'Weiter bearbeiten', exact: true })
    .click()
  await expect(note).toHaveValue('Mein noch nicht gespeicherter Entwurf')
})

test('Entfernen eines geöffneten Stücks in einem zweiten Fenster gibt die Navigation wieder frei', async ({
  page,
  context,
}) => {
  await seed(page)
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page
    .getByRole('button', { name: 'Review-Hemd öffnen', exact: true })
    .click()

  const other = await context.newPage()
  await other.goto('/')
  await other.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await other
    .getByRole('button', { name: 'Review-Hemd öffnen', exact: true })
    .click()
  await other
    .getByRole('button', { name: 'Stück löschen', exact: true })
    .click()
  await other
    .getByRole('button', { name: 'Endgültig löschen', exact: true })
    .click()

  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Review-Hemd öffnen', exact: true }),
  ).toHaveCount(0)
  const stylist = page.getByRole('button', {
    name: 'Mit deinem Stylisten sprechen',
    exact: true,
  })
  await expect(stylist).toBeEnabled()
  await expect(page.locator('.toast-region')).toContainText(
    'Dieses Stück wurde inzwischen entfernt.',
  )
  await stylist.click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('Ein laufender Stilcheck bleibt bei einer Profiländerung im anderen Fenster erhalten', async ({
  page,
  context,
}) => {
  await seed(page)
  await page
    .getByRole('button', { name: 'Stilcheck starten', exact: true })
    .click()
  const editor = page.getByRole('dialog')
  await editor.getByRole('button', { name: 'Elegant', exact: true }).click()

  const other = await context.newPage()
  await other.goto('/')
  await other.getByRole('button', { name: 'Später', exact: true }).click()
  await expect(
    other.getByRole('button', { name: 'Stilcheck starten', exact: true }),
  ).not.toBeVisible()
  // The current profile reaches the first window, while its draft remains.
  await expect(
    editor.getByRole('button', { name: 'Stilcheck überspringen', exact: true }),
  ).not.toBeVisible()
  await expect(editor).toBeVisible()
  await expect(
    editor.getByRole('button', { name: 'Elegant', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await editor.getByRole('button', { name: 'Weiter', exact: true }).click()
  await editor.getByRole('button', { name: 'Weiter', exact: true }).click()
  await editor
    .getByRole('button', { name: 'Stilprofil speichern', exact: true })
    .click()
  await expect(editor.getByRole('alert')).toContainText(
    'Dein Stilprofil wurde inzwischen geändert',
  )
  await editor.getByRole('button', { name: 'Zurück', exact: true }).click()
  await editor.getByRole('button', { name: 'Zurück', exact: true }).click()
  await expect(
    editor.getByRole('button', { name: 'Elegant', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
})
