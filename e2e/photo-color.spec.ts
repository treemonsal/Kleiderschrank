import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function image(page: Page, left = '#0000ff', right = left) {
  const data = await page.evaluate(
    ({ left, right }) => {
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 120
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = left
      ctx.fillRect(0, 0, 100, 120)
      ctx.fillStyle = right
      ctx.fillRect(100, 0, 100, 120)
      return canvas.toDataURL('image/png').split(',')[1]
    },
    { left, right },
  )
  return {
    name: 'local-colors.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data, 'base64'),
  }
}
async function start(page: Page, left?: string, right?: string) {
  await page.getByRole('button', { name: 'Erstes Stück hinzufügen' }).click()
  await page.getByLabel('Name', { exact: false }).fill('Farbstück')
  await page
    .getByLabel('Foto aus Mediathek')
    .setInputFiles(await image(page, left, right))
  await expect(page.getByAltText('Vorschau des Kleidungsstücks')).toBeVisible()
}
async function openPicker(page: Page) {
  await page
    .getByRole('button', { name: 'Farbe aus Foto wählen', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Farbstelle im Foto wählen' }),
  ).toBeVisible()
}
async function exportData(page: Page) {
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const download = await downloading
  return JSON.parse(await readFile((await download.path())!, 'utf8'))
}
async function edit(page: Page) {
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page.getByRole('button', { name: 'Farbstück öffnen' }).click()
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
}

test('Farbprobe braucht bewusste Übernahme, bleibt korrigierbar und verändert das gespeicherte Foto nicht', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await start(page)
  await page.getByRole('button', { name: 'Grau', exact: true }).click()
  await page.getByRole('button', { name: 'In die Garderobe legen' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const before = await exportData(page)
  await edit(page)
  await openPicker(page)
  await expect(
    page.getByText('Nächste Kleiderschrankfarbe:', { exact: false }),
  ).toContainText('Blau')
  await expect(
    page.getByRole('button', { name: 'Grau', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Farbprobe schliessen' }).click()
  // Merely inspecting and closing a sample must not dirty an existing editor.
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(
    page.getByText('Ungespeicherte Änderungen verwerfen?'),
  ).toHaveCount(0)
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await edit(page)
  await openPicker(page)
  await page.getByRole('button', { name: 'Blau übernehmen' }).click()
  await expect(
    page.getByRole('button', { name: 'Farbprobe schliessen' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Farbe aus Foto wählen', exact: true }),
  ).toBeFocused()
  await expect(
    page.getByRole('button', { name: 'Blau', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await page.getByRole('button', { name: 'Verwerfen', exact: true }).click()
  await edit(page)
  await expect(
    page.getByRole('button', { name: 'Grau', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await openPicker(page)
  await page.getByRole('button', { name: 'Blau übernehmen' }).click()
  await page.getByRole('button', { name: 'Änderungen speichern' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.reload()
  const after = await exportData(page)
  expect(after.garments[0].color).toBe('Blau')
  expect(after.garments[0].photo).toBe(before.garments[0].photo)
  expect(errors).toEqual([])
})

test('Gewählte Stelle und Tastaturregler bestimmen die Farbprobe', async ({
  page,
}) => {
  await page.goto('/')
  await start(page, '#0000ff', '#ff0000')
  await openPicker(page)
  const photo = page.getByRole('button', { name: 'Farbstelle im Foto wählen' })
  await photo.click({ position: { x: 30, y: 40 } })
  await expect(
    page.getByRole('button', { name: 'Blau übernehmen' }),
  ).toBeVisible()
  const horizontal = page.getByRole('slider', { name: 'Position waagrecht' })
  await horizontal.focus()
  await horizontal.press('End')
  await expect(
    page.getByRole('button', { name: 'Rot übernehmen' }),
  ).toBeVisible()
  await horizontal.press('Home')
  await expect(
    page.getByRole('button', { name: 'Blau übernehmen' }),
  ).toBeVisible()
  const vertical = page.getByRole('slider', { name: 'Position senkrecht' })
  await vertical.focus()
  await vertical.press('End')
  await expect(vertical).toHaveValue('100')
  await expect(
    page.getByRole('button', { name: 'Blau übernehmen' }),
  ).toBeVisible()
  await photo.focus()
  await photo.press('ArrowRight')
  await expect(horizontal).toHaveValue('2')
})

test('Offline-Farbprobe sendet keine Fotos und verwirft alte Vorschläge bei Fotowechsel oder Entfernen', async ({
  page,
  context,
}) => {
  const external: string[] = []
  page.on('request', (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).hostname !== '127.0.0.1'
    )
      external.push(request.url())
  })
  await page.goto('/')
  await start(page)
  const replacement = await image(page, '#ff0000')
  await context.setOffline(true)
  await openPicker(page)
  await expect(
    page.getByRole('button', { name: 'Blau übernehmen' }),
  ).toBeVisible()
  await page.getByLabel('Foto aus Mediathek').setInputFiles(replacement)
  await expect(
    page.getByRole('button', { name: 'Farbstelle im Foto wählen' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Farbe aus Foto wählen' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await openPicker(page)
  await expect(
    page.getByRole('button', { name: 'Rot übernehmen' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Foto entfernen' }).click()
  await expect(
    page.getByRole('button', { name: 'Farbe aus Foto wählen' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Rot übernehmen' }),
  ).toHaveCount(0)
  expect(external).toEqual([])
})

test('Ein beschädigtes Ersatzfoto erhält bisheriges Foto und Farbeingabe', async ({
  page,
}) => {
  await page.goto('/')
  await start(page)
  await openPicker(page)
  await page.getByRole('button', { name: 'Blau übernehmen' }).click()
  const previousUrl = await page
    .getByAltText('Vorschau des Kleidungsstücks')
    .getAttribute('src')
  await page.getByLabel('Foto aus Mediathek').setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('broken'),
  })
  await expect(page.getByRole('alert')).toContainText(
    'Dieses Bildformat kann der Browser nicht öffnen',
  )
  await expect(
    page.getByAltText('Vorschau des Kleidungsstücks'),
  ).toHaveAttribute('src', previousUrl!)
  await expect(
    page.getByRole('button', { name: 'Blau', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await openPicker(page)
  await expect(
    page.getByRole('button', { name: 'Blau übernehmen' }),
  ).toBeVisible()
})

for (const width of [375, 390, 430]) {
  test(`Farbprobe ${width}px im Editorial-Design ohne Überlauf`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await page
      .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
      .click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'luxe')
    await page.getByRole('button', { name: 'Heute', exact: true }).click()
    await start(page, '#0000ff', '#ff0000')
    await openPicker(page)
    await page
      .getByRole('button', { name: 'Farbstelle im Foto wählen' })
      .scrollIntoViewIfNeeded()
    expect(
      await page
        .getByRole('dialog')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    const range = await page
      .getByRole('slider', { name: 'Position waagrecht' })
      .boundingBox()
    expect(range!.height).toBeGreaterThanOrEqual(44)
    await page.screenshot({
      path: testInfo.outputPath(`photo-color-editorial-${width}.png`),
    })
  })
}
