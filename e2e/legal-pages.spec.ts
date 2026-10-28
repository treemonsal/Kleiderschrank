import { test, expect } from '@playwright/test'

test('Datenschutz und Nutzungsbedingungen sind aus den Einstellungen erreichbar', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByRole('link', { name: 'Datenschutz', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Datenschutzerklärung', level: 1 }),
  ).toBeVisible()
  await expect(page.getByText('drive.appdata')).toBeVisible()
  await page.getByRole('link', { name: 'Nutzungsbedingungen' }).click()
  await expect(
    page.getByRole('heading', { name: 'Nutzungsbedingungen', level: 1 }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Zurück zu MyStyle' }).click()
  await expect(
    page.getByRole('button', { name: 'Einstellungen öffnen', exact: true }),
  ).toBeVisible()
  // Pages must not scroll sideways on a phone.
  await page.goto('datenschutz.html')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
