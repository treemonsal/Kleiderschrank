import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.setTimeout(120000)
async function shirt(page: Page) {
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 360
    c.height = 420
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#eee9e0'
    ctx.fillRect(0, 0, 360, 420)
    ctx.fillStyle = '#235291'
    ctx.beginPath()
    ctx.moveTo(120, 80)
    ctx.lineTo(70, 110)
    ctx.lineTo(35, 175)
    ctx.lineTo(88, 205)
    ctx.lineTo(108, 170)
    ctx.lineTo(105, 345)
    ctx.lineTo(255, 345)
    ctx.lineTo(252, 170)
    ctx.lineTo(272, 205)
    ctx.lineTo(325, 175)
    ctx.lineTo(290, 110)
    ctx.lineTo(240, 80)
    ctx.quadraticCurveTo(180, 125, 120, 80)
    ctx.fill()
    return c.toDataURL('image/png').split(',')[1]
  })
  return {
    name: 'synthetic-shirt.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data, 'base64'),
  }
}
async function editor(page: Page) {
  await page.getByRole('button', { name: 'Erstes Stück hinzufügen' }).click()
  await page.getByLabel('Name', { exact: false }).fill('KI-Testhemd')
  await page.getByLabel('Foto aus Mediathek').setInputFiles(await shirt(page))
  await expect(page.getByAltText('Vorschau des Kleidungsstücks')).toBeVisible()
  await page.getByText('Hintergrund mit KI entfernen', { exact: false }).click()
}
async function exportData(page: Page) {
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  const waiting = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  return JSON.parse(await readFile((await (await waiting).path())!, 'utf8'))
}

test('Echtes KI-Modell erzeugt lokal eine Maske, erhält das Original und funktioniert mit Cache offline', async ({
  page,
  context,
}, testInfo) => {
  const external: string[] = [],
    assets: string[] = [],
    errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (r) => {
    if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== '127.0.0.1')
      external.push(r.url())
    if (/\.onnx|\.wasm/.test(r.url())) assets.push(r.url())
  })
  await page.goto('/')
  await editor(page)
  expect(assets).toEqual([])
  const start = Date.now()
  await page
    .getByRole('button', { name: 'Lokale KI starten', exact: true })
    .click()
  const preview = page.getByAltText('Vorschau mit entferntem Hintergrund')
  await expect(preview).toBeVisible({ timeout: 90000 })
  const pixels = await preview.evaluate(async (element: HTMLImageElement) => {
    await element.decode()
    const canvas = document.createElement('canvas')
    canvas.width = element.naturalWidth
    canvas.height = element.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(element, 0, 0)
    return {
      corner: ctx.getImageData(5, 5, 1, 1).data[3],
      center: ctx.getImageData(180, 220, 1, 1).data[3],
    }
  })
  expect(pixels.corner).toBeLessThan(80)
  expect(pixels.center).toBeGreaterThan(200)
  expect(
    await page
      .getByRole('dialog')
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true)
  await page
    .locator('.background-assist')
    .screenshot({ path: testInfo.outputPath('local-ai-preview.png') })
  await testInfo.attach('real-inference.json', {
    body: JSON.stringify({
      milliseconds: Date.now() - start,
      ...pixels,
      assetRequests: assets,
    }),
    contentType: 'application/json',
  })
  await page.getByRole('button', { name: 'Freistellung übernehmen' }).click()
  await page
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen' })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const backup = await exportData(page)
  expect(backup.version).toBe(6)
  expect(backup.garments[0].photo).toMatch(/^data:image\/jpeg;base64,/)
  expect(backup.garments[0].cutout).toMatch(/^data:image\/png;base64,/)
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'restore-ai.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
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
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await page.getByRole('button', { name: 'KI-Testhemd öffnen' }).click()
  const restoredAlpha = await page
    .getByRole('dialog')
    .getByAltText('KI-Testhemd')
    .evaluate(async (img: HTMLImageElement) => {
      await img.decode()
      const c = document.createElement('canvas')
      c.width = c.height = 10
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      return ctx.getImageData(5, 5, 1, 1).data[3]
    })
  expect(restoredAlpha).toBeLessThan(80)
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  await page.getByText('Hintergrund mit KI entfernen', { exact: false }).click()
  await context.setOffline(true)
  const countBefore = assets.length
  await page
    .getByRole('button', { name: 'Lokale KI starten', exact: true })
    .click()
  await expect(preview).toBeVisible({ timeout: 90000 })
  expect(assets.length).toBe(countBefore)
  await page
    .getByRole('button', { name: 'Vorschau verwerfen', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Originalfoto verwenden', exact: true })
    .click()
  await page.getByRole('button', { name: 'Änderungen speichern' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const restored = await exportData(page)
  expect(restored.garments[0].photo).toBe(backup.garments[0].photo)
  expect(restored.garments[0].cutout).toBeUndefined()
  await page
    .getByRole('button', { name: 'KI-Dateien vom Gerät entfernen' })
    .click()
  await expect(
    page.getByText('Die zwischengespeicherten KI-Dateien wurden entfernt.', {
      exact: false,
    }),
  ).toBeVisible()
  expect(await page.evaluate(() => caches.has('mystyle-ai-v1'))).toBe(false)
  expect(external).toEqual([])
  expect(errors).toEqual([])
})

test('Beschädigte KI-Dateien werden abgewiesen und das Original bleibt speicherbar', async ({
  page,
}) => {
  await page.route('**/ai/u2netp.onnx', (route) =>
    route.fulfill({ body: 'corrupt', contentType: 'application/octet-stream' }),
  )
  await page.goto('/')
  await editor(page)
  await page
    .getByRole('button', { name: 'Lokale KI starten', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('unvollständig')
  await expect(
    page.getByAltText('Vorschau mit entferntem Hintergrund'),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen' })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const data = await exportData(page)
  expect(data.garments[0].photo).toBeTruthy()
  expect(data.garments[0].cutout).toBeUndefined()
  const broken = structuredClone(data)
  broken.garments[0].name = 'Kaputte Freistellung'
  broken.garments[0].cutout = 'data:image/png;base64,iVBORw0KGgoBAgM='
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'broken-cutout.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(broken)),
  })
  await expect(page.getByRole('alert')).toContainText(
    'Foto in der Sicherung ist beschädigt',
  )
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'KI-Testhemd öffnen' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Kaputte Freistellung öffnen' }),
  ).toHaveCount(0)
})

test('Abbrechen beendet die lokale KI, ohne Foto oder Formular zu verlieren', async ({
  page,
}) => {
  await page.route('**/ai/u2netp.onnx', async (route) => {
    await new Promise<void>((resolve) => page.once('close', () => resolve()))
    await route.abort().catch(() => {})
  })
  await page.goto('/')
  await editor(page)
  await page
    .getByRole('button', { name: 'Lokale KI starten', exact: true })
    .click()
  await page.getByRole('button', { name: 'Freistellung abbrechen' }).click()
  await expect(
    page.getByRole('button', { name: 'Lokale KI starten', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Name', { exact: false })).toHaveValue(
    'KI-Testhemd',
  )
  await expect(page.getByAltText('Vorschau des Kleidungsstücks')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('Noch nicht geladene KI-Dateien ergeben offline eine verständliche Meldung', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await editor(page)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          { once: true },
        ),
      )
  })
  await context.setOffline(true)
  await page
    .getByRole('button', { name: 'Lokale KI starten', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(/online/)
  await expect(
    page.getByAltText('Vorschau mit entferntem Hintergrund'),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Zum Kleiderschrank hinzufügen' }),
  ).toBeEnabled()
})
