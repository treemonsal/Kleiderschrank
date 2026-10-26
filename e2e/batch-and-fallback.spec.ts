import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const V = 'https://prithivmlmods-qwen3-vl-outpost.hf.space'
const BACKUP = 'https://prithivmlmods-qwen3-vl-hf-demo.hf.space'
const B = 'https://zhengpeng7-birefnet-demo.hf.space'
const attributes = (name: string, category: string) => ({
  name,
  category,
  color: 'Blau',
  brand: '',
  seasons: [],
  styles: ['Casual'],
  notes: '',
})

async function providers(
  page: Page,
  primary: 'ok' | 'limit',
  answers: ReturnType<typeof attributes>[],
) {
  const png = await readFile('public/icon-192.png')
  const calls = { primary: 0, backup: 0 }
  let next = 0
  await page.addInitScript((url) => {
    localStorage.setItem(
      'mystyle-photo-ai',
      JSON.stringify({ mode: 'community', url, code: '', enabled: true }),
    )
  }, V)
  await page.route('https://*.hf.space/**', async (route) => {
    const url = route.request().url()
    if (url === V + '/gradio_api/call/run_router') {
      calls.primary++
      return primary === 'limit'
        ? route.fulfill({ status: 429, body: 'GPU quota exceeded' })
        : route.fulfill({ json: { event_id: 'a'.repeat(32) } })
    }
    if (url === V + '/gradio_api/call/run_router/' + 'a'.repeat(32))
      return route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([JSON.stringify(answers[next++ % answers.length])])}\n\n`,
      })
    if (url === BACKUP + '/gradio_api/call/run_understanding') {
      calls.backup++
      return route.fulfill({ json: { event_id: 'c'.repeat(32) } })
    }
    if (url === BACKUP + '/gradio_api/call/run_understanding/' + 'c'.repeat(32))
      return route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([JSON.stringify({ status: 'done', text: JSON.stringify(answers[next++ % answers.length]) })])}\n\n`,
      })
    if (url === B + '/gradio_api/upload')
      return route.fulfill({ json: ['/tmp/gradio/test/garment.jpg'] })
    if (url === B + '/gradio_api/call/image')
      return route.fulfill({ json: { event_id: 'b'.repeat(32) } })
    if (url === B + '/gradio_api/call/image/' + 'b'.repeat(32))
      return route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([[null, { url: `${B}/gradio_api/file=/tmp/gradio/cutout.png` }]])}\n\n`,
      })
    if (url === `${B}/gradio_api/file=/tmp/gradio/cutout.png`)
      return route.fulfill({ contentType: 'image/png', body: png })
    return route.fulfill({ status: 404, body: 'unexpected' })
  })
  return calls
}

// Network mocks use page.route, which a controlling service worker bypasses.
test.use({ serviceWorkers: 'block' })
test('Mehrere Fotos auf einmal: jedes wird analysiert, freigestellt und gemeinsam gespeichert', async ({
  page,
}) => {
  await providers(page, 'ok', [
    attributes('Blaues Hemd', 'Oberteile'),
    attributes('Dunkle Jeans', 'Hosen'),
    attributes('Weisse Sneaker', 'Schuhe'),
  ])
  const png = await readFile('public/icon-192.png')
  await page.goto('/')
  await page.getByRole('button', { name: 'Erstes Stück hinzufügen' }).click()
  await page.getByLabel('Foto aus Mediathek').setInputFiles(
    ['a', 'b', 'c'].map((name) => ({
      name: `${name}.png`,
      mimeType: 'image/png',
      buffer: png,
    })),
  )
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByRole('heading', { name: '3 Fotos' })).toBeVisible()
  const save = sheet.getByRole('button', { name: 'Alle speichern (3)' })
  await expect(save).toBeEnabled({ timeout: 20000 })
  const names = await sheet
    .getByRole('textbox', { name: 'Name' })
    .evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value),
    )
  expect(names.sort()).toEqual([
    'Blaues Hemd',
    'Dunkle Jeans',
    'Weisse Sneaker',
  ])
  await sheet
    .getByRole('textbox', { name: 'Name' })
    .first()
    .fill('Mein Lieblingshemd')
  await save.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await expect(page.locator('.garment-card')).toHaveCount(3)
  await expect(
    page.getByRole('button', { name: 'Mein Lieblingshemd öffnen' }),
  ).toBeVisible()
})

test('Haupt-KI im Tageslimit: die Ersatz-KI übernimmt automatisch die Fotoanalyse', async ({
  page,
}) => {
  const calls = await providers(page, 'limit', [
    attributes('Ersatz-Hemd', 'Oberteile'),
  ])
  await page.goto('/')
  await page.getByRole('button', { name: 'Erstes Stück hinzufügen' }).click()
  await page
    .getByLabel('Foto aus Mediathek')
    .setInputFiles('public/icon-192.png')
  await expect(page.getByLabel('Name', { exact: false })).toHaveValue(
    'Ersatz-Hemd',
  )
  expect(calls.primary).toBe(1)
  expect(calls.backup).toBe(1)
  await expect(
    page.getByRole('button', { name: 'Original verwenden', exact: true }),
  ).toBeVisible()
})
