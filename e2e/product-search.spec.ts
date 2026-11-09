import { test, expect, type Page } from './fixtures'
import { readFile } from 'node:fs/promises'

// Network mocks use page.route, which a controlling service worker bypasses.
test.use({ serviceWorkers: 'block' })

const SEARCH = 'https://suche.test'

async function withSearch(page: Page, status = 200) {
  await page.addInitScript((url) => {
    ;(
      window as unknown as { __MYSTYLE_SEARCH_URL__: string }
    ).__MYSTYLE_SEARCH_URL__ = url
  }, SEARCH)
  const png = await readFile('public/icon-192.png')
  const queries: string[] = []
  await page.route(`${SEARCH}/search**`, (route) => {
    queries.push(new URL(route.request().url()).searchParams.get('q') ?? '')
    return status !== 200
      ? route.fulfill({
          status,
          headers: { 'Access-Control-Allow-Origin': '*' },
          json: { error: 'limit' },
        })
      : route.fulfill({
          headers: { 'Access-Control-Allow-Origin': '*' },
          json: {
            results: [
              {
                title: "Nike Air Force 1 '07 | Zalando",
                source: 'Zalando',
                thumbnail: `${SEARCH}/thumb/1.png`,
                image: 'https://shop.example/af1.png',
              },
              {
                title: 'Produkt 4711',
                source: 'Shop',
                thumbnail: `${SEARCH}/thumb/2.png`,
                image: 'https://shop.example/unklar.png',
              },
            ],
          },
        })
  })
  await page.route(`${SEARCH}/thumb/**`, (route) =>
    route.fulfill({ contentType: 'image/png', body: png }),
  )
  await page.route(`${SEARCH}/image**`, (route) =>
    route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      contentType: 'image/png',
      body: png,
    }),
  )
  return queries
}

test('Online gefundene Kleidung landet mit einem Tipp im Kleiderschrank', async ({
  page,
}) => {
  const queries = await withSearch(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Online suchen', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Nike Air Force 1', exact: true })
    .click()
  await expect(
    dialog.getByRole('list', { name: 'Suchergebnisse' }),
  ).toBeVisible()
  expect(queries).toEqual(['Nike Air Force 1'])
  await dialog
    .getByRole('button', { name: "Nike Air Force 1 '07 in den Kleiderschrank" })
    .click()
  await expect(
    dialog.getByRole('button', {
      name: "Nike Air Force 1 '07 liegt im Kleiderschrank",
    }),
  ).toBeDisabled()
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  await page
    .getByRole('button', { name: "Nike Air Force 1 '07 öffnen" })
    .click()
  const detail = page.getByRole('dialog')
  await expect(
    detail.getByText('Schuhe', { exact: true }).first(),
  ).toBeVisible()
  await expect(detail).toContainText('Nike')
})

test('Ohne erkennbare Kategorie übernimmt der Editor das Bild', async ({
  page,
}) => {
  await withSearch(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Online suchen', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('searchbox', { name: 'Kleidung suchen' }).fill('Teil')
  await dialog.getByRole('button', { name: 'Suchen', exact: true }).click()
  await dialog
    .getByRole('button', { name: 'Produkt 4711 in den Kleiderschrank' })
    .click()
  const editor = page.getByRole('dialog')
  await expect(
    editor.getByRole('heading', { name: 'Neues Stück' }),
  ).toBeVisible()
  await expect(
    editor.getByAltText('Vorschau des Kleidungsstücks'),
  ).toBeVisible()
})

test('Ein aufgebrauchtes Suchkontingent wird verständlich erklärt', async ({
  page,
}) => {
  await withSearch(page, 429)
  await page.goto('/')
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Online suchen', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Adidas Samba', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toContainText(
    'Suchkontingent für diesen Monat ist aufgebraucht',
  )
})

test('Ohne eingerichteten Such-Server bleibt die Suche verborgen', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Ohne Foto eintragen', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Online suchen', exact: true }),
  ).toHaveCount(0)
})
