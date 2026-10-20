import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const vision = 'https://prithivmlmods-qwen3-vl-outpost.hf.space'
const cutout = 'https://zhengpeng7-birefnet-demo.hf.space'
const attributes = {
  name: 'Erkanntes Leinenhemd',
  category: 'Oberteile',
  color: 'Weiss',
  brand: '',
  seasons: ['Sommer'],
  styles: ['Minimalistisch'],
  notes: '',
}

test('Erstes Foto direkt im Entwurf freigeben und analysieren, ohne unfreiwillig zu speichern', async ({
  page,
}) => {
  const requests: string[] = []
  const png = await readFile('public/icon-192.png')
  await page.route('https://*.hf.space/**', async (route) => {
    const url = route.request().url()
    requests.push(url)
    if (url.endsWith('/gradio_api/info'))
      return route.fulfill({
        json: { named_endpoints: { '/run_router': {}, '/image': {} } },
      })
    if (url === `${vision}/gradio_api/call/run_router`)
      return route.fulfill({ json: { event_id: 'a'.repeat(32) } })
    if (url === `${vision}/gradio_api/call/run_router/${'a'.repeat(32)}`)
      return route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([JSON.stringify(attributes)])}\n\n`,
      })
    if (url === `${cutout}/gradio_api/upload`)
      return route.fulfill({ json: ['/tmp/gradio/test/photo.jpg'] })
    if (url === `${cutout}/gradio_api/call/image`)
      return route.fulfill({ json: { event_id: 'b'.repeat(32) } })
    if (url === `${cutout}/gradio_api/call/image/${'b'.repeat(32)}`)
      return route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([[{ url: `${cutout}/gradio_api/file=/tmp/gradio/original.png` }, { url: `${cutout}/gradio_api/file=/tmp/gradio/cutout.png` }]])}\n\n`,
      })
    if (url === `${cutout}/gradio_api/file=/tmp/gradio/cutout.png`)
      return route.fulfill({ contentType: 'image/png', body: png })
    throw new Error(`Unexpected provider request: ${url}`)
  })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Foto aus Mediathek')
    .setInputFiles({ name: 'hemd.png', mimeType: 'image/png', buffer: png })
  await dialog.getByLabel('Name', { exact: false }).fill('Mein Entwurf')
  await dialog
    .getByRole('button', { name: 'Kostenlose Foto-KI einrichten', exact: true })
    .click()
  await expect(
    dialog.getByRole('button', {
      name: 'Kostenlose KI aktivieren',
      exact: true,
    }),
  ).toBeDisabled()
  expect(requests).toEqual([])
  await expect(dialog.getByLabel('Name', { exact: false })).toHaveValue(
    'Mein Entwurf',
  )
  await dialog
    .getByRole('checkbox', { name: /Ich erlaube, neue Kleidungsfotos/ })
    .check()
  await dialog
    .getByRole('button', { name: 'Kostenlose KI aktivieren', exact: true })
    .click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Name', { exact: false })).toHaveValue(
    attributes.name,
  )
  await expect(
    dialog.getByAltText('Online-KI: Freistellung prüfen'),
  ).toBeVisible()
  await expect(
    dialog.getByRole('button', {
      name: 'Kostenlose Foto-KI einrichten',
      exact: true,
    }),
  ).toHaveCount(0)
  const recognized = dialog.getByText(
    'Angaben aus deinem Foto vorbereitet. Du kannst alles ändern.',
    { exact: true },
  )
  await expect(recognized).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Foto entfernen', exact: true })
    .click()
  await expect(recognized).toHaveCount(0)
  await dialog
    .getByLabel('Foto aus Mediathek')
    .setInputFiles({ name: 'hemd-neu.png', mimeType: 'image/png', buffer: png })
  await expect(recognized).toBeVisible()
  await page.route(`${vision}/gradio_api/call/run_router`, (route) =>
    route.fulfill({ status: 503, body: 'Service unavailable' }),
  )
  await dialog.getByLabel('Foto aus Mediathek').setInputFiles({
    name: 'hemd-ohne-erkennung.png',
    mimeType: 'image/png',
    buffer: png,
  })
  await expect(
    dialog.getByAltText('Online-KI: Freistellung prüfen'),
  ).toBeVisible()
  await expect(recognized).toHaveCount(0)
  await expect(
    page.getByText('Hintergrund automatisch entfernt.', { exact: false }),
  ).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen', exact: true })
    .click()
  await expect(dialog).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await expect(
    page.getByRole('button', {
      name: `${attributes.name} öffnen`,
      exact: true,
    }),
  ).toBeVisible()
})

test('Fehlender oder leerer Name führt zum Feld; Schliessen zeigt die Entwurfsrückfrage oben', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  const name = dialog.getByLabel('Name', { exact: false })
  const save = dialog.getByRole('button', {
    name: 'Zum Kleiderschrank hinzufügen',
    exact: true,
  })
  await save.click()
  await expect(name).toBeFocused()
  await expect(dialog).toBeVisible()
  await name.fill('   ')
  await save.click()
  await expect(name).toBeFocused()
  await expect(dialog.getByRole('alert')).toContainText(
    'Bitte gib deinem Stück einen Namen.',
  )
  await name.fill('Mein Entwurf')
  await dialog.evaluate((node) =>
    node.scrollTo({ top: 0, behavior: 'instant' }),
  )
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  const notice = dialog.getByText('Ungespeicherte Änderungen verwerfen?', {
    exact: true,
  })
  await expect(notice).toBeInViewport()
  await dialog
    .getByRole('button', { name: 'Weiter bearbeiten', exact: true })
    .click()
  await expect(name).toHaveValue('Mein Entwurf')
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await dialog.getByRole('button', { name: 'Verwerfen', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true }),
  ).toBeVisible()
})

test('KI-Einrichtung ohne Aktivierung verlassen erhält Foto und Eingaben und sendet nichts', async ({
  page,
}) => {
  const requests: string[] = []
  await page.route('https://*.hf.space/**', async (route) => {
    requests.push(route.request().url())
    await route.abort()
  })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Foto aus Mediathek')
    .setInputFiles('public/icon-192.png')
  await dialog.getByLabel('Name', { exact: false }).fill('Manuell behalten')
  await dialog
    .getByRole('button', { name: 'Kostenlose Foto-KI einrichten', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: 'Ohne KI weiter bearbeiten', exact: true })
    .click()
  expect(requests).toEqual([])
  await expect(dialog.getByLabel('Name', { exact: false })).toHaveValue(
    'Manuell behalten',
  )
  await expect(
    dialog.getByAltText('Vorschau des Kleidungsstücks'),
  ).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen', exact: true })
    .click()
  await expect(dialog).toHaveCount(0)
})

test('Optionale KI-Serverfelder speichern den Kleidungsentwurf weder per Enter noch blockieren sie ihn', async ({
  page,
}) => {
  const requests: string[] = []
  await page.route('https://*.hf.space/**', async (route) => {
    requests.push(route.request().url())
    await route.abort()
  })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Foto aus Mediathek')
    .setInputFiles('public/icon-192.png')
  await dialog.getByLabel('Name', { exact: false }).fill('Manuelles Hemd')
  await dialog
    .getByRole('button', { name: 'Kostenlose Foto-KI einrichten', exact: true })
    .click()
  await dialog.getByText('Eigenen Server verbinden', { exact: true }).click()
  await dialog.getByLabel('KI-Server', { exact: true }).fill('kein-server')
  await dialog.getByLabel('KI-Server', { exact: true }).press('Enter')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Name', { exact: false })).toHaveValue(
    'Manuelles Hemd',
  )
  await dialog
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen', exact: true })
    .click()
  await expect(dialog).toHaveCount(0)
  expect(requests).toEqual([])
})

test('Verworfener Fotoentwurf aktiviert keine verspätet antwortende KI-Verbindung', async ({
  page,
}) => {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const photos: string[] = []
  await page.route('https://*.hf.space/**', async (route) => {
    if (route.request().url().endsWith('/gradio_api/info')) {
      await held
      await route
        .fulfill({
          json: { named_endpoints: { '/run_router': {}, '/image': {} } },
        })
        .catch(() => {})
    } else {
      photos.push(route.request().url())
      await route.abort()
    }
  })
  try {
    await page.goto('/')
    await page
      .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
      .click()
    const dialog = page.getByRole('dialog')
    await dialog
      .getByLabel('Foto aus Mediathek')
      .setInputFiles('public/icon-192.png')
    await dialog
      .getByRole('button', {
        name: 'Kostenlose Foto-KI einrichten',
        exact: true,
      })
      .click()
    await dialog
      .getByRole('checkbox', { name: /Ich erlaube, neue Kleidungsfotos/ })
      .check()
    await dialog
      .getByRole('button', { name: 'Kostenlose KI aktivieren', exact: true })
      .click()
    await expect(
      dialog.getByRole('button', {
        name: 'Kostenlose KI aktivieren',
        exact: true,
      }),
    ).toBeDisabled()
    await dialog
      .getByRole('button', { name: 'Schliessen', exact: true })
      .click()
    await dialog.getByRole('button', { name: 'Verwerfen', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    release()
    await page
      .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
      .click()
    await expect(page.getByLabel('Name', { exact: false })).toHaveValue('')
    expect(
      await page.evaluate(() => localStorage.getItem('mystyle-photo-ai')),
    ).toBeNull()
    expect(photos).toEqual([])
  } finally {
    release()
  }
})

test('Eine offene Verwerfen-Rückfrage lässt sich während eines laufenden Speicherns nicht auslösen', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name', { exact: false }).fill('Sicher speichern')
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(
    dialog.getByText('Ungespeicherte Änderungen verwerfen?', { exact: true }),
  ).toBeVisible()
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('mystyle-private-wardrobe')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction('garments', 'readwrite')
          let hold = true
          ;(
            window as unknown as { releaseCriticWrite: () => void }
          ).releaseCriticWrite = () => {
            hold = false
          }
          transaction.oncomplete = () => database.close()
          const keepOpen = () => {
            transaction.objectStore('garments').get('review-lock').onsuccess =
              () => {
                if (hold) keepOpen()
              }
          }
          keepOpen()
          resolve()
        }
      }),
  )
  try {
    await dialog
      .getByRole('button', {
        name: 'Zum Kleiderschrank hinzufügen',
        exact: true,
      })
      .click()
    await expect(
      dialog.getByRole('button', { name: 'Schliessen', exact: true }),
    ).toBeDisabled()
    await expect(
      dialog.getByRole('button', { name: 'Verwerfen', exact: true }),
    ).toBeDisabled()
    await expect(
      dialog.getByRole('button', { name: 'Weiter bearbeiten', exact: true }),
    ).toBeDisabled()
  } finally {
    await page.evaluate(() =>
      (
        window as unknown as { releaseCriticWrite: () => void }
      ).releaseCriticWrite(),
    )
  }
  await expect(dialog).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Sicher speichern öffnen', exact: true }),
  ).toBeVisible()
})
