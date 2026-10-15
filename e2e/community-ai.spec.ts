import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
const V = 'https://prithivmlmods-qwen3-vl-outpost.hf.space'
const B = 'https://zhengpeng7-birefnet-demo.hf.space'
const attributes = {
  name: 'Violettes T-Shirt',
  category: 'Oberteile',
  color: 'Violett',
  brand: 'VANS',
  seasons: ['Sommer'],
  styles: ['Streetwear'],
  notes: 'Dunkle Ärmel und sichtbares Logo.',
}
async function mock(page: Page, visionFails = false) {
  const png = await readFile('public/icon-192.png')
  const calls: string[] = []
  await page.route('https://*.hf.space/**', async (route) => {
    const request = route.request()
    const url = request.url()
    calls.push(url)
    expect(request.headers().authorization).toBeUndefined()
    if (url.endsWith('/gradio_api/info'))
      return route.fulfill({
        json: { named_endpoints: { '/run_router': {}, '/image': {} } },
      })
    if (url === V + '/gradio_api/call/run_router') {
      expect(request.postDataJSON().data[0]).toBe('Qwen3-VL-4B-Instruct')
      return visionFails
        ? route.fulfill({ status: 429, body: 'limit' })
        : route.fulfill({ json: { event_id: 'a'.repeat(32) } })
    }
    if (url === V + '/gradio_api/call/run_router/' + 'a'.repeat(32))
      return route.fulfill({
        contentType: 'text/event-stream',
        body:
          'event: generating\ndata: ["ignore"]\n\nevent: complete\ndata: ' +
          JSON.stringify([JSON.stringify(attributes)]) +
          '\n\n',
      })
    if (url === B + '/gradio_api/upload')
      return route.fulfill({ json: ['/tmp/gradio/test/garment.jpg'] })
    if (url === B + '/gradio_api/call/image')
      return route.fulfill({ json: { event_id: 'b'.repeat(32) } })
    if (url === B + '/gradio_api/call/image/' + 'b'.repeat(32))
      return route.fulfill({
        contentType: 'text/event-stream',
        body:
          'event: complete\ndata: ' +
          JSON.stringify([
            [
              { url: B + '/gradio_api/file=/tmp/gradio/original.png' },
              { url: B + '/gradio_api/file=/tmp/gradio/cutout.png' },
            ],
          ]) +
          '\n\n',
      })
    if (url === B + '/gradio_api/file=/tmp/gradio/cutout.png')
      return route.fulfill({ contentType: 'image/png', body: png })
    throw Error('Unexpected community request ' + url)
  })
  return calls
}
async function activate(page: Page) {
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page
    .getByRole('checkbox', { name: /Ich erlaube, neue Kleidungsfotos/ })
    .check()
  await page
    .getByRole('button', { name: 'Kostenlose KI aktivieren', exact: true })
    .click()
  await expect(
    page.getByText('Kostenlose KI aktiviert.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
}
test('Community-KI benötigt Freigabe, füllt alle Merkmale und sendet gespeicherte Stücke nicht erneut (kontrollierte Anbieter)', async ({
  page,
}) => {
  const calls = await mock(page)
  await page.goto('/')
  expect(calls).toEqual([])
  await activate(page)
  expect(calls).toHaveLength(2) // API availability checks only; no photos yet.
  await page.getByRole('button', { name: 'Erstes Stück hinzufügen' }).click()
  await page
    .getByLabel('Foto aus Mediathek')
    .setInputFiles(path.resolve('public/icon-192.png'))
  await expect(page.getByLabel('Name', { exact: false })).toHaveValue(
    attributes.name,
  )
  await expect(page.getByLabel('Marke', { exact: true })).toHaveValue('VANS')
  await expect(
    page.getByAltText('Online-KI: Freistellung prüfen'),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Freistellung übernehmen', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen' })
    .click()
  const before = calls.length
  await page.getByRole('button', { name: attributes.name + ' öffnen' }).click()
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  await expect(page.getByLabel('Name', { exact: false })).toHaveValue(
    attributes.name,
  )
  expect(calls).toHaveLength(before)
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page
    .getByRole('checkbox', { name: /Ich erlaube, neue Kleidungsfotos/ })
    .uncheck()
  expect(
    await page.evaluate(() => localStorage.getItem('mystyle-photo-ai')),
  ).toBeNull()
})
test('Ausgeschöpftes Erkennungslimit verwirft weder Freistellung noch Original und löst keine Dauerversuche aus', async ({
  page,
}) => {
  const calls = await mock(page, true)
  await page.goto('/')
  await activate(page)
  await page.getByRole('button', { name: 'Erstes Stück hinzufügen' }).click()
  await page
    .getByLabel('Foto aus Mediathek')
    .setInputFiles(path.resolve('public/icon-192.png'))
  await expect(
    page.getByAltText('Online-KI: Freistellung prüfen'),
  ).toBeVisible()
  await expect(
    page.getByText('Die kostenlose Bilderkennung ist gerade nicht verfügbar', {
      exact: false,
    }),
  ).toBeVisible()
  await expect(page.getByLabel('Name', { exact: false })).toHaveValue('')
  await expect(page.getByAltText('Vorschau des Kleidungsstücks')).toBeVisible()
  expect(
    calls.filter((url) => url === V + '/gradio_api/call/run_router'),
  ).toHaveLength(1)
  await page.getByLabel('Name', { exact: false }).fill('Mein Stück')
  await page
    .getByRole('button', { name: 'Original behalten', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen' })
    .click()
  await expect(
    page.getByRole('button', { name: 'Mein Stück öffnen' }),
  ).toBeVisible()
})

test('Widerruf während Verbindungsprüfung kann durch späte Antworten nicht rückgängig werden', async ({
  page,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('https://*.hf.space/**', async (route) => {
    await gate
    await route
      .fulfill({
        json: { named_endpoints: { '/run_router': {}, '/image': {} } },
      })
      .catch(() => {})
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  const consent = page.getByRole('checkbox', {
    name: /Ich erlaube, neue Kleidungsfotos/,
  })
  await consent.check()
  await page
    .getByRole('button', { name: 'Kostenlose KI aktivieren', exact: true })
    .click()
  await consent.uncheck()
  release()
  await expect(
    page.getByRole('button', { name: 'Kostenlose KI aktivieren', exact: true }),
  ).toBeDisabled()
  expect(
    await page.evaluate(() => localStorage.getItem('mystyle-photo-ai')),
  ).toBeNull()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await page.getByRole('button', { name: 'Erstes Stück hinzufügen' }).click()
  await page
    .getByLabel('Foto aus Mediathek')
    .setInputFiles(path.resolve('public/icon-192.png'))
  await expect(
    page.getByText('Online-KI noch nicht verbunden.', { exact: false }),
  ).toBeVisible()
})
