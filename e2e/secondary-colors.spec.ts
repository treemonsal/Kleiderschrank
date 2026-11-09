import { test, expect } from './base'
import { readFile } from 'node:fs/promises'

test('Ein Stück bekommt eine Hauptfarbe und bis zu drei Zweitfarben, die gesichert werden', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name', { exact: false }).fill('Streifenhemd')
  await expect(dialog.getByRole('group', { name: 'Zweitfarben' })).toHaveCount(
    0,
  )
  await dialog.getByRole('button', { name: 'Blau', exact: true }).click()
  const second = dialog.getByRole('group', { name: 'Zweitfarben' })
  await expect(
    second.getByRole('button', { name: 'Zweitfarbe Blau' }),
  ).toHaveCount(0)
  for (const color of ['Weiss', 'Rot', 'Grau'])
    await second
      .getByRole('button', { name: `Zweitfarbe ${color}`, exact: true })
      .click()
  await expect(
    second.getByRole('button', { name: 'Zweitfarbe Gelb', exact: true }),
  ).toBeDisabled()
  await second
    .getByRole('button', { name: 'Zweitfarbe Grau', exact: true })
    .click()
  // Choosing a second colour as main removes it from the second colours.
  await dialog.getByRole('button', { name: 'Rot', exact: true }).click()
  await expect(second).toContainText('Weiss')
  await expect(
    second.getByRole('button', { name: 'Zweitfarbe Blau', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false')
  await dialog.getByRole('button', { name: 'Blau', exact: true }).click()
  await second
    .getByRole('button', { name: 'Zweitfarbe Rot', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: 'In die Garderobe legen', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  await page
    .getByRole('button', { name: 'Streifenhemd öffnen', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toContainText('Blau, dazu Weiss, Rot')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Schliessen', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const data = JSON.parse(
    await readFile((await (await download).path())!, 'utf8'),
  )
  expect(data.garments[0]).toMatchObject({
    color: 'Blau',
    secondaryColors: ['Weiss', 'Rot'],
  })
})

test('Die eingerichtete Google-Anmeldung leitet mit der App-Kennung zu Google', async ({
  page,
}) => {
  let auth: URL | undefined
  await page.route('https://accounts.google.com/**', (route) => {
    auth = new URL(route.request().url())
    return route.fulfill({ body: 'Google' })
  })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Mit Google anmelden', exact: true })
    .click()
  await expect
    .poll(() => auth?.searchParams.get('client_id'))
    .toBe(
      '187167128-430n11miigpor7m6je6ks7t683odvsup.apps.googleusercontent.com',
    )
  expect(auth?.searchParams.get('response_type')).toBe('token')
  expect(auth?.searchParams.get('scope')).toContain('drive.appdata')
})
