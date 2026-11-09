import { test, expect } from '@playwright/test'
import path from 'node:path'

// Uses Playwright's plain, ephemeral context on purpose: for WebKit that is
// the same storage as Safari's private browsing.
test('Im privaten Safari-Tab erklärt die App, warum kein Foto gespeichert wird', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'webkit', 'Nur WebKit verweigert Fotos privat')
  await page.goto('/')
  await page
    .getByRole('button', { name: /Erstes Stück hinzufügen|^Stück hinzufügen$/ })
    .first()
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Foto aus Mediathek')
    .setInputFiles(path.resolve('public/icon-192.png'))
  await expect(
    dialog.getByAltText('Vorschau des Kleidungsstücks'),
  ).toBeVisible()
  await dialog.getByLabel('Name', { exact: false }).fill('Weisses Hemd')
  await dialog.getByRole('button', { name: 'In die Garderobe legen' }).click()
  await expect(dialog.getByRole('alert')).toContainText(
    'Im privaten Surfen kann Safari keine Fotos speichern',
  )
  // Nothing is lost: the form stays open with the photo.
  await expect(dialog.getByLabel('Name', { exact: false })).toHaveValue(
    'Weisses Hemd',
  )
})
