import { test, expect, type Page } from './fixtures'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
const url = 'https://mystyle-test.hf.space'
const code = 'test-connection-code-with-32-characters'
const attributes = {
  name: 'Blaues Oxfordhemd',
  category: 'Oberteile',
  color: 'Blau',
  brand: '',
  seasons: ['Frühling', 'Herbst'],
  styles: ['Casual', 'Minimalistisch'],
  notes: 'Sichtbare Knopfleiste und lange Ärmel.',
}
async function configure(page: Page) {
  await page.addInitScript(
    ({ url, code }) =>
      localStorage.setItem(
        'mystyle-photo-ai',
        JSON.stringify({ url, code, enabled: true }),
      ),
    { url, code },
  )
}
async function upload(page: Page) {
  await page
    .getByLabel('Foto aus Mediathek')
    .setInputFiles(path.resolve('public/icon-192.png'))
}
async function open(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Erstes Stück hinzufügen' }).click()
}

// Network mocks use page.route, which a controlling service worker bypasses.
test.use({ serviceWorkers: 'block' })
test('Neues Foto startet die KI automatisch, übernimmt die Freistellung und behält das Original (API kontrolliert)', async ({
  page,
}) => {
  await configure(page)
  const png = (await readFile('public/icon-192.png')).toString('base64')
  let requests = 0
  await page.route(`${url}/v1/garment`, async (route) => {
    requests++
    expect(route.request().headers().authorization).toBe(`Bearer ${code}`)
    expect(route.request().postDataJSON().photo).toMatch(
      /^data:image\/jpeg;base64,/,
    )
    await route.fulfill({
      json: { attributes, cutout: `data:image/png;base64,${png}` },
    })
  })
  await open(page)
  expect(requests).toBe(0)
  await upload(page)
  await expect(page.getByLabel('Name', { exact: false })).toHaveValue(
    attributes.name,
  )
  await expect(page.getByLabel('Marke', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Notizen')).toHaveValue(attributes.notes)
  await expect(
    page.getByRole('button', { name: 'Blau', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: 'Herbst', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: 'Minimalistisch', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  const photoType = () =>
    page
      .getByAltText('Vorschau des Kleidungsstücks')
      .evaluate(
        async (image) =>
          (await (await fetch((image as HTMLImageElement).src)).blob()).type,
      )
  // The cutout is applied automatically; the original stays one tap away.
  await expect.poll(photoType).toBe('image/png')
  await page
    .getByRole('button', { name: 'Original verwenden', exact: true })
    .click()
  await expect.poll(photoType).toBe('image/jpeg')
  await page
    .getByRole('button', { name: 'Foto erneut analysieren', exact: true })
    .click()
  await expect.poll(photoType).toBe('image/png')
  await page
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen' })
    .click()
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const saved = JSON.parse(
    await readFile((await (await download).path())!, 'utf8'),
  )
  expect(saved.garments[0].photo).toMatch(/^data:image\/jpeg;base64,/)
  expect(saved.garments[0].cutout).toMatch(/^data:image\/png;base64,/)
  expect(JSON.stringify(saved)).not.toContain(code)
  expect(requests).toBe(2)
})

test('Späte KI überschreibt eigene Eingaben nicht; beschädigte Freistellung erhält Foto', async ({
  page,
}) => {
  await configure(page)
  let respond!: () => void
  const gate = new Promise<void>((resolve) => {
    respond = resolve
  })
  await page.route(`${url}/v1/garment`, async (route) => {
    await gate
    await route.fulfill({
      json: { attributes, cutout: 'data:image/png;base64,YmFk' },
    })
  })
  await open(page)
  await upload(page)
  await expect(
    page.getByRole('button', { name: 'Analyse abbrechen' }),
  ).toBeVisible()
  await page.getByLabel('Name', { exact: false }).fill('Mein eigener Name')
  respond()
  await expect(page.getByLabel('Notizen')).toHaveValue(attributes.notes)
  await expect(page.getByLabel('Name', { exact: false })).toHaveValue(
    'Mein eigener Name',
  )
  await expect(
    page.getByText('Der Hintergrund konnte nicht entfernt werden.', {
      exact: false,
    }),
  ).toBeVisible()
  await expect(page.getByAltText('Vorschau des Kleidungsstücks')).toBeVisible()
  await page
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen' })
    .click()
  await expect(
    page.getByRole('button', { name: 'Mein eigener Name öffnen' }),
  ).toBeVisible()
})

test('Abbruch und Fotoentfernung verwerfen laufende Antworten', async ({
  page,
}) => {
  await configure(page)
  let count = 0
  const replies: (() => void)[] = []
  await page.route(`${url}/v1/garment`, async (route) => {
    count++
    // Keep both requests pending until the user action under test has run.
    // A 400ms response can finish while a mobile browser scrolls to Cancel.
    await new Promise<void>((resolve) => replies.push(resolve))
    await route.fulfill({ json: { attributes, cutout: null } }).catch(() => {})
  })
  await open(page)
  await upload(page)
  await expect(
    page.getByRole('button', { name: 'Analyse abbrechen' }),
  ).toBeVisible()
  await expect.poll(() => count).toBe(1)
  await page.getByRole('button', { name: 'Analyse abbrechen' }).click()
  replies.shift()?.()
  await expect(
    page.getByRole('button', { name: 'Foto erneut analysieren' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Foto erneut analysieren' }).click()
  await expect(
    page.getByRole('button', { name: 'Analyse abbrechen' }),
  ).toBeVisible()
  await expect.poll(() => count).toBe(2)
  await page.getByRole('button', { name: 'Foto entfernen' }).click()
  replies.shift()?.()
  await expect(page.getByLabel('Name', { exact: false })).toHaveValue('')
  await expect(
    page.getByAltText('Vorschau des Kleidungsstücks'),
  ).not.toBeVisible()
  await page.getByLabel('Name', { exact: false }).fill('Ohne Foto')
  await page
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen' })
    .click()
  await expect(
    page.getByRole('button', { name: 'Ohne Foto öffnen' }),
  ).toBeVisible()
  expect(count).toBeGreaterThan(0)
})

test('Verbindung benötigt Foto-Freigabe; Ausschalten verhindert weitere Uploads', async ({
  page,
}) => {
  let photos = 0
  await page.route(`${url}/health`, (route) =>
    route.fulfill({ json: { service: 'mystyle-photo-ai', version: 1 } }),
  )
  await page.route(`${url}/v1/garment`, (route) => {
    photos++
    return route.fulfill({ json: { attributes, cutout: null } })
  })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByText('Eigenen Server verbinden', { exact: true }).click()
  await page.getByLabel('KI-Server', { exact: true }).fill(url)
  await page.getByLabel('Verbindungscode', { exact: true }).fill(code)
  await expect(
    page.getByRole('button', { name: 'Verbinden und aktivieren' }),
  ).toBeDisabled()
  await page
    .getByRole('checkbox', { name: /Neue Fotos nach meinem Start/ })
    .check()
  await page.getByRole('button', { name: 'Verbinden und aktivieren' }).click()
  await expect(
    page.getByText('Verbunden. Neue Fotos werden automatisch analysiert.'),
  ).toBeVisible()
  expect(photos).toBe(0)
  await page
    .getByRole('checkbox', { name: /Neue Fotos nach meinem Start/ })
    .uncheck()
  expect(
    await page.evaluate(() => localStorage.getItem('mystyle-photo-ai')),
  ).toBeNull()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await page.getByRole('button', { name: 'Erstes Stück hinzufügen' }).click()
  await upload(page)
  await expect(
    page.getByText('Noch nicht eingerichtet.', { exact: true }),
  ).toBeVisible()
  expect(photos).toBe(0)
})

test('Original verwenden speichert ohne Freistellung und erhält das Foto', async ({
  page,
}) => {
  await configure(page)
  const png = (await readFile('public/icon-192.png')).toString('base64')
  await page.route(`${url}/v1/garment`, (route) =>
    route.fulfill({
      json: { attributes, cutout: `data:image/png;base64,${png}` },
    }),
  )
  await open(page)
  await upload(page)
  await page
    .getByRole('button', { name: 'Original verwenden', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen' })
    .click()
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const saved = JSON.parse(
    await readFile((await (await download).path())!, 'utf8'),
  )
  expect(saved.garments[0].photo).toMatch(/^data:image\/jpeg;base64,/)
  expect(saved.garments[0].cutout).toBeUndefined()
})
