import { test, expect, type Page } from './base'
import { readFile } from 'node:fs/promises'

// Network mocks use page.route, which a controlling service worker bypasses.
test.use({ serviceWorkers: 'block' })

/** Drops files or a dragged image address like another browser window. */
async function drop(
  page: Page,
  content: { files?: string[]; html?: string; uri?: string },
  target = 'main',
) {
  const png = (await readFile('public/icon-192.png')).toString('base64')
  await page.evaluate(
    ({ content, png, target }) => {
      const transfer = new DataTransfer()
      const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0))
      for (const name of content.files ?? [])
        transfer.items.add(new File([bytes], name, { type: 'image/png' }))
      if (content.html) transfer.setData('text/html', content.html)
      if (content.uri) transfer.setData('text/uri-list', content.uri)
      const node = document.querySelector(target)!
      for (const type of ['dragenter', 'dragover', 'drop'])
        node.dispatchEvent(
          new DragEvent(type, {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer,
          }),
        )
    },
    { content, png, target },
  )
}

test('Ein Bild aus einem anderen Fenster wird zum neuen Stück, ohne die App zu verlassen', async ({
  page,
}) => {
  await page.goto('/')
  await drop(page, { files: ['hemd.png'] })
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('heading', { name: 'Neues Stück', exact: true }),
  ).toBeVisible()
  await expect(
    dialog.getByAltText('Vorschau des Kleidungsstücks'),
  ).toBeVisible()
  await dialog.getByLabel('Name', { exact: false }).fill('Gezogenes Hemd')
  await dialog
    .getByRole('button', { name: 'In die Garderobe legen', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Gezogenes Hemd öffnen', exact: true }),
  ).toBeVisible()
  expect(page.url()).toContain('127.0.0.1')
})

test('Mehrere gezogene Bilder öffnen den Stapel, ein Bild im offenen Editor ersetzt nur das Foto', async ({
  page,
}) => {
  await page.goto('/')
  await drop(page, { files: ['a.png', 'b.png'] })
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: '2 Fotos' }),
  ).toBeVisible()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Schliessen', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Verwerfen', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name', { exact: false }).fill('Mein Entwurf')
  await drop(page, { files: ['neu.png'] }, 'dialog[open]')
  await expect(
    dialog.getByAltText('Vorschau des Kleidungsstücks'),
  ).toBeVisible()
  await expect(dialog.getByLabel('Name', { exact: false })).toHaveValue(
    'Mein Entwurf',
  )
})

test('Ein gezogenes Webbild wird übernommen; gesperrte Bilder erklären den Ausweg', async ({
  page,
}) => {
  const png = await readFile('public/icon-192.png')
  await page.route('https://bilder.example/**', (route) =>
    // A page without CORS release fails the same way as an aborted request.
    route.request().url().endsWith('frei.png')
      ? route.fulfill({
          contentType: 'image/png',
          headers: { 'access-control-allow-origin': '*' },
          body: png,
        })
      : route.abort(),
  )
  await page.goto('/')
  await drop(page, {
    html: '<img src="https://bilder.example/gesperrt.png">',
    uri: 'https://shop.example/seite',
  })
  await expect(page.locator('.toast-error')).toContainText('Bild kopieren')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await drop(page, {
    html: '<a href="https://shop.example/p"><img src="https://bilder.example/frei.png"></a>',
  })
  await expect(
    page.getByRole('dialog').getByAltText('Vorschau des Kleidungsstücks'),
  ).toBeVisible()
})

test('Ein kopiertes Bild lässt sich mit Einsetzen hinzufügen', async ({
  page,
}) => {
  const png = (await readFile('public/icon-192.png')).toString('base64')
  await page.goto('/')
  await page.evaluate((png) => {
    const transfer = new DataTransfer()
    const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0))
    transfer.items.add(new File([bytes], 'kopie.png', { type: 'image/png' }))
    document.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: transfer,
      }),
    )
  }, png)
  await expect(
    page.getByRole('dialog').getByAltText('Vorschau des Kleidungsstücks'),
  ).toBeVisible()
})
