import { expect, test } from '@playwright/test'

test('Leere Garderobe führt direkt zum ersten Stück statt in eine leere Outfit-Auswahl', async ({
  page,
}) => {
  await page.goto('/')
  const add = page.getByRole('button', {
    name: 'Erstes Stück hinzufügen',
    exact: true,
  })
  await expect(add).toBeVisible()
  await expect(add).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Auswahl anpassen', exact: true }),
  ).toHaveCount(0)

  await page
    .getByRole('button', { name: 'Vorheriger Tag', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Auswahl anpassen', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Zu heute', exact: true }).click()
  await add.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('Name', { exact: false })).toBeVisible()
})

test('Mit ersten Stücken bleibt die Anpassung einer unvollständigen Auswahl erreichbar', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
    .click()
  await page.getByLabel('Name', { exact: false }).fill('Mein Leinenhemd')
  await page
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await page
    .getByRole('button', { name: 'Auswahl anpassen', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Looks', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText(
      'Für einen Look brauchst du Schuhe und entweder ein Kleid oder ein Oberteil mit Hose.',
      { exact: false },
    ),
  ).toBeVisible()
})
