import { test, expect } from './base'

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
  // Pages must not scroll sideways, even on the smallest phone.
  await page.setViewportSize({ width: 320, height: 640 })
  for (const file of ['datenschutz.html', 'nutzungsbedingungen.html']) {
    await page.goto(file)
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true)
  }
})
