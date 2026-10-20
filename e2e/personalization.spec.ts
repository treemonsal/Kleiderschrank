import { test, expect, type Page } from '@playwright/test'
const stamp = '2026-01-01T00:00:00.000Z'
const garments = [
  {
    id: 'blue',
    name: 'Blaues Hemd',
    category: 'Oberteile',
    color: 'Blau',
    styles: ['Minimalistisch'],
  },
  {
    id: 'red',
    name: 'Rotes Shirt',
    category: 'Oberteile',
    color: 'Rot',
    styles: ['Sportlich'],
  },
  {
    id: 'pants',
    name: 'Graue Hose',
    category: 'Hosen',
    color: 'Grau',
    styles: [],
  },
  {
    id: 'shoes',
    name: 'Weisse Sneaker',
    category: 'Schuhe',
    color: 'Weiss',
    styles: [],
  },
].map((item) => ({
  ...item,
  brand: '',
  seasons: [],
  notes: '',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
}))
async function importData(page: Page, data?: unknown) {
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'personal.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify(
        data ?? {
          app: 'MyStyle',
          version: 4,
          garments,
          outfits: [],
          feedback: [],
          preferences: null,
          calendar: [],
          weather: null,
        },
      ),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
}
async function exported(page: Page) {
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const stream = await (await download).createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return JSON.parse(Buffer.concat(chunks).toString())
}
async function completeStyleCheck(page: Page) {
  await page
    .getByRole('button', { name: 'Stilcheck starten', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Minimalistisch', exact: true })
    .click()
  await dialog.getByRole('button', { name: 'Weiter', exact: true }).click()
  await dialog
    .getByRole('button', { name: 'Lieblingsfarbe: Blau', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: 'Seltener: Rot', exact: true })
    .click()
  await dialog
    .getByRole('combobox', {
      name: 'Wie farbig sollen deine Looks sein?',
      exact: true,
    })
    .selectOption('neutral')
  await dialog.getByRole('button', { name: 'Weiter', exact: true }).click()
  await dialog
    .getByRole('combobox', {
      name: 'Wofür suchst du meistens Outfits?',
      exact: true,
    })
    .selectOption('Büro')
  await dialog
    .getByRole('combobox', {
      name: 'Wie viel Abwechslung möchtest du?',
      exact: true,
    })
    .selectOption('explore')
  await dialog
    .getByRole('button', { name: 'Stilprofil speichern', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
}

test('Stilcheck wirkt auf den ersten Look, bleibt gespeichert und kann später bearbeitet werden', async ({
  page,
}) => {
  await page.goto('/')
  await importData(page)
  const external: string[] = []
  page.on('request', (request) => {
    if (request.url().startsWith('https://')) external.push(request.url())
  })
  await completeStyleCheck(page)
  const look = page.getByRole('region', { name: 'Dein Tageslook' })
  await expect(
    look.getByRole('button', { name: 'Blaues Hemd öffnen', exact: true }),
  ).toBeVisible()
  await expect(
    look.getByRole('button', { name: 'Rotes Shirt öffnen', exact: true }),
  ).not.toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('region', { name: 'Persönlicher Stilcheck' }),
  ).not.toBeVisible()
  const data = await exported(page)
  expect(data.preferences.styles).toEqual(['Minimalistisch'])
  expect(data.preferences.colors).toEqual(['Blau'])
  expect(data.preferences.styleProfile).toMatchObject({
    status: 'completed',
    variety: 'explore',
    avoidColors: ['Rot'],
    colorMood: 'neutral',
    usualOccasion: 'Büro',
  })
  await page
    .getByRole('button', { name: 'Stilprofil bearbeiten', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('button', { name: 'Minimalistisch', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await dialog.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(
    dialog.getByRole('button', { name: 'Seltener: Rot', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await dialog
    .getByRole('button', { name: 'Lieblingsfarbe: Rot', exact: true })
    .click()
  await expect(
    dialog.getByRole('button', { name: 'Seltener: Rot', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false')
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText(
    'Ungespeicherte Änderungen',
  )
  await dialog.getByRole('button', { name: 'Verwerfen', exact: true }).click()
  const unchanged = await exported(page)
  expect(unchanged.preferences.styleProfile).toEqual(
    data.preferences.styleProfile,
  )
  expect(external).toEqual([])
})

test('Später verschwindet dauerhaft und lässt den Stilcheck unter Mehr erreichbar', async ({
  page,
}) => {
  await page.goto('/')
  const invite = page.getByRole('region', { name: 'Persönlicher Stilcheck' })
  await expect(invite).toBeVisible()
  await invite.getByRole('button', { name: 'Später', exact: true }).click()
  await expect(invite).not.toBeVisible()
  await page.reload()
  await expect(invite).not.toBeVisible()
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Dein Stilprofil', exact: true })
      .getByRole('button', { name: 'Stilcheck starten' }),
  ).toBeVisible()
})

test('Tageslook lässt sich mit Grund ablehnen und die Bewertung gezielt zurücknehmen', async ({
  page,
}) => {
  await page.goto('/')
  await importData(page)
  const look = page.getByRole('region', { name: 'Dein Tageslook' })
  const before = await look.locator('.outfit-piece').allTextContents()
  await look
    .getByRole('button', { name: 'Tageslook: Passt nicht', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Schliessen', exact: true })
    .click()
  expect((await exported(page)).feedback).toHaveLength(0)
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await look
    .getByRole('button', { name: 'Tageslook: Passt nicht', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', {
      name: 'Die Farben passen für mich nicht zusammen',
      exact: true,
    })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect
    .poll(() => look.locator('.outfit-piece').allTextContents())
    .not.toEqual(before)
  const data = await exported(page)
  expect(data.feedback).toHaveLength(1)
  expect(data.feedback[0]).toMatchObject({
    verdict: 'rejected',
    reason: 'colors',
    occasion: 'Alltag',
  })
  await page
    .getByRole('button', { name: 'Bewertungen ansehen (1)', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Bewertung zurücknehmen', exact: true })
    .click()
  await expect(
    page
      .getByRole('dialog')
      .getByText('Noch keine Bewertungen. Nutze die Daumen an deinen Looks.', {
        exact: true,
      }),
  ).toBeVisible()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Schliessen', exact: true })
    .click()
  const undone = await exported(page)
  expect(undone.feedback).toHaveLength(0)
  expect(undone.garments).toEqual(data.garments)
  expect(undone.outfits).toEqual(data.outfits)
})

test('Likes bleiben nach Neustart erhalten und Zurücksetzen schützt das Stilprofil', async ({
  page,
}) => {
  await page.goto('/')
  await importData(page)
  await completeStyleCheck(page)
  const like = page.getByRole('button', {
    name: 'Tageslook: Gefällt mir',
    exact: true,
  })
  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(like).toHaveAttribute('aria-pressed', 'true')
  const before = await exported(page)
  await page
    .getByRole('button', { name: 'Bewertungen ansehen (1)', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Gelerntes zurücksetzen', exact: true })
    .click()
  await dialog.getByRole('button', { name: 'Behalten', exact: true }).click()
  await expect(
    dialog.getByRole('button', { name: 'Bewertung zurücknehmen', exact: true }),
  ).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Gelerntes zurücksetzen', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: 'Alle Bewertungen zurücksetzen', exact: true })
    .click()
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  const after = await exported(page)
  expect(after.feedback).toHaveLength(0)
  expect(after.preferences.styleProfile).toEqual(
    before.preferences.styleProfile,
  )
  expect(after.garments).toEqual(before.garments)
})

test('Profil und Feedback sind per Sicherung auf einem zweiten Gerät nutzbar', async ({
  page,
  browser,
}) => {
  await page.goto('/')
  await importData(page)
  await completeStyleCheck(page)
  await page
    .getByRole('button', { name: 'Tageslook: Gefällt mir', exact: true })
    .click()
  const data = await exported(page)
  const context = await browser.newContext()
  const other = await context.newPage()
  await other.goto('/')
  await expect(
    other.getByRole('region', { name: 'Persönlicher Stilcheck' }),
  ).toBeVisible()
  await importData(other, data)
  await expect(
    other.getByRole('region', { name: 'Persönlicher Stilcheck' }),
  ).not.toBeVisible()
  await expect(
    other.getByRole('button', { name: 'Tageslook: Gefällt mir', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  const restored = await exported(other)
  expect(restored.preferences.styleProfile).toEqual(
    data.preferences.styleProfile,
  )
  expect(restored.feedback).toEqual(data.feedback)
  await context.close()
})

test('Stilcheck ist auf kleinem Bildschirm bedienbar und respektiert reduzierte Bewegung', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Stilcheck starten', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(
    dialog.getByRole('button', {
      name: 'Lieblingsfarbe: Schwarz',
      exact: true,
    }),
  ).toBeVisible()
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true)
  const bounds = await dialog
    .getByRole('button', { name: 'Lieblingsfarbe: Blau', exact: true })
    .boundingBox()
  expect(bounds?.height).toBeGreaterThanOrEqual(44)
  await page.screenshot({
    path: info.outputPath('style-check-320.png'),
    fullPage: true,
  })
  await dialog.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(dialog.locator('fieldset')).toBeFocused()
  await dialog
    .getByRole('button', { name: 'Stilprofil speichern', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
})
