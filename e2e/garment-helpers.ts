import { expect, type Page } from '@playwright/test'

/**
 * Since 0.37 a piece is sorted out first; only a sorted-out piece can be
 * deleted for good. Starts on the piece's open detail sheet.
 */
export async function sortOutAndDelete(page: Page, name: string) {
  await page.getByRole('button', { name: 'Aussortieren', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page
    .getByRole('button', { name: 'Nur aussortierte Stücke', exact: true })
    .click()
  await page
    .getByRole('button', { name: `${name} öffnen`, exact: true })
    .click()
  await page.getByRole('button', { name: 'Stück löschen', exact: true }).click()
  await page
    .getByRole('button', { name: 'Endgültig löschen', exact: true })
    .click()
}
