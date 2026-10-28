import { expect, test } from '@playwright/test'
import { stepDay } from './day-helpers'

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
    page.getByRole('button', { name: 'Looks öffnen', exact: true }),
  ).toHaveCount(0)

  await stepDay(page, -1)
  await expect(
    page.getByRole('button', { name: 'Looks öffnen', exact: true }),
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
    .getByRole('button', { name: 'In die Garderobe legen', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await page.getByRole('button', { name: 'Looks öffnen', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Looks', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Aus der Garderobe vorschlagen', exact: true })
    .click()
  await expect(
    page.getByText('Für diese Auswahl fehlen passende', { exact: false }),
  ).toBeVisible()
})
