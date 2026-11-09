import { test, expect, type Page } from './base'
import type { Category } from '../src/model'

async function create(page: Page, name: string, category: Category) {
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page
    .getByRole('button', { name: 'Ohne Foto eintragen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name', { exact: false }).fill(name)
  await dialog
    .getByRole('combobox', { name: 'Kategorie', exact: true })
    .selectOption(category)
  await dialog.getByRole('button', { name: 'In die Garderobe legen' }).click()
  await expect(dialog).not.toBeVisible()
}

test('Selber zusammenstellen: Reihen wechseln, speichern und für heute wählen', async ({
  page,
}) => {
  await page.goto('/')
  await create(page, 'Weisses Hemd', 'Oberteile')
  await create(page, 'Blaues Shirt', 'Oberteile')
  await create(page, 'Sommerkleid', 'Kleider')
  await create(page, 'Jeans', 'Hosen')
  await create(page, 'Sneaker', 'Schuhe')
  await create(page, 'Parka', 'Jacken')
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  const board = page.getByRole('region', { name: 'Selber zusammenstellen' })
  await board.scrollIntoViewIfNeeded()
  const top = board.getByRole('region', { name: 'Oberteil' })
  await expect(top.locator('.look-row-name')).toHaveText('Blaues Shirt')
  await expect(
    board.getByRole('region', { name: 'Jacke' }).locator('.look-row-name'),
  ).toHaveText('Ohne Jacke')

  // A dress replaces the trousers row.
  // Sorted by name: Blaues Shirt, Sommerkleid, Weisses Hemd.
  await top.getByRole('button', { name: 'Nächstes Oberteil' }).click()
  await expect(top.locator('.look-row-name')).toHaveText('Sommerkleid')
  await expect(board.getByRole('region', { name: 'Hose' })).toHaveCount(0)
  await top.getByRole('button', { name: 'Nächstes Oberteil' }).click()
  await expect(top.locator('.look-row-name')).toHaveText('Weisses Hemd')
  await expect(
    top.getByRole('button', { name: 'Nächstes Oberteil' }),
  ).toBeDisabled()
  await expect(board.getByRole('region', { name: 'Hose' })).toBeVisible()

  await board.getByRole('button', { name: 'Nächstes Jacke' }).click()
  await board.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(
    board.getByRole('button', { name: 'Gespeichert', exact: true }),
  ).toBeDisabled()
  await expect(page.locator('.profile-stats')).toHaveCount(0)

  await board.getByRole('button', { name: 'Für heute', exact: true }).click()
  const daily = page.getByRole('region', { name: 'Dein Tageslook' })
  for (const name of ['Parka', 'Weisses Hemd', 'Jeans', 'Sneaker'])
    await expect(
      daily.getByRole('button', { name: `${name} öffnen`, exact: true }),
    ).toBeVisible()

  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  await expect(page.locator('.profile-stats')).toContainText(/Looks\s*1/)
})

test('Selber zusammenstellen nennt fehlende Reihen', async ({ page }) => {
  await page.goto('/')
  await create(page, 'Hemd', 'Oberteile')
  await create(page, 'Hose', 'Hosen')
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  const board = page.getByRole('region', { name: 'Selber zusammenstellen' })
  await expect(board.getByRole('status')).toContainText(
    'Dafür fehlen noch: Schuhe.',
  )
  await expect(
    board.getByRole('button', { name: 'Für heute', exact: true }),
  ).toHaveCount(0)
})

test('Wischen in einer Reihe wählt das sichtbare Stück', async ({ page }) => {
  await page.goto('/')
  await create(page, 'Anorak', 'Oberteile')
  await create(page, 'Bluse', 'Oberteile')
  await create(page, 'Chino', 'Hosen')
  await create(page, 'Loafer', 'Schuhe')
  await page.getByRole('button', { name: 'Home', exact: true }).click()
  const top = page
    .getByRole('region', { name: 'Selber zusammenstellen' })
    .getByRole('region', { name: 'Oberteil' })
  await top.scrollIntoViewIfNeeded()
  await expect(top.locator('.look-row-name')).toHaveText('Anorak')
  await top
    .locator('.look-row-track')
    .evaluate((list) => list.scrollTo({ left: list.clientWidth }))
  await expect(top.locator('.look-row-name')).toHaveText('Bluse')
  // The swipe stays in its row and never changes the day.
  await expect(page.getByText('heute', { exact: false }).first()).toBeVisible()
})
