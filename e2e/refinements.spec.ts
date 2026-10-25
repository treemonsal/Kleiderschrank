import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { refinementFixture } from '../tests/fixtures/refinement'

test.use({ timezoneId: 'Etc/UTC' })
async function seed(page: Page) {
  await page.goto('/')
  const data = refinementFixture(await page.evaluate(() => Date.now()))
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'refinement.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ app: 'MyStyle', version: 8, ...data }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
}
async function exported(page: Page) {
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  return JSON.parse(await readFile((await (await download).path())!, 'utf8'))
}
for (const width of [320, 390]) {
  test(`Tageslook ${width}px hält Schuhe fest, zeigt eine wärmere Vorschau und übernimmt erst bewusst`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 })
    const external: string[] = []
    page.on('request', (request) => {
      if (request.url().startsWith('https://')) external.push(request.url())
    })
    await seed(page)
    const daily = page.getByRole('region', {
      name: 'Dein Tageslook',
      exact: true,
    })
    await expect(daily.locator('.outfit-piece')).toHaveCount(3)
    await page
      .getByRole('button', { name: 'Tageslook verfeinern', exact: true })
      .click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('checkbox', { name: /Schuhe behalten/ }).check()
    await dialog
      .getByRole('button', { name: 'Ähnlich, aber wärmer', exact: true })
      .click()
    const preview = dialog.getByRole('region', {
      name: 'Vorschau der Anpassung',
    })
    await expect(preview).toContainText('Beige Jacke')
    await expect(preview).toContainText('Weisse Sneaker')
    await expect(daily.locator('.outfit-piece')).toHaveCount(3)
    expect(
      await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true)
    await preview.screenshot({
      path: info.outputPath(`refinement-${width}.png`),
    })
    await dialog
      .getByRole('button', { name: 'Für heute übernehmen', exact: true })
      .click()
    await expect(dialog).toHaveCount(0)
    await expect(daily.locator('.outfit-piece')).toHaveCount(4)
    await page.reload()
    await expect(daily.locator('.outfit-piece')).toHaveCount(4)
    const saved = await exported(page)
    expect(saved.preferences.dailySelection.garmentIds).toEqual(
      expect.arrayContaining(['top-red', 'pants', 'shoes', 'jacket']),
    )
    expect(saved.feedback).toEqual([])
    expect(external).toEqual([])
  })
}

test('Feedback „Zu auffällig“ und Ablehnung ohne Grund werden dauerhaft gesichert', async ({
  page,
}) => {
  await seed(page)
  await page
    .getByRole('button', { name: 'Tageslook: Passt nicht', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Zu auffällig', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Tageslook: Passt nicht', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Ohne Grund ablehnen', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const saved = await exported(page)
  expect(saved.version).toBe(8)
  expect(saved.feedback).toHaveLength(2)
  expect(
    saved.feedback.filter(
      (entry: { reason?: string }) => entry.reason === 'bold',
    ),
  ).toHaveLength(1)
  expect(
    saved.feedback.filter((entry: { reason?: string }) => !entry.reason),
  ).toHaveLength(1)
})

test('Eine inzwischen in die Wäsche gelegte Alternative überschreibt die Vorschau nicht und wird nicht übernommen', async ({
  page,
  context,
}) => {
  await seed(page)
  await page
    .getByRole('button', { name: 'Tageslook verfeinern', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Ähnlich, aber wärmer', exact: true })
    .click()
  const other = await context.newPage()
  await other.goto('/')
  await other.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await other
    .getByRole('button', { name: 'Beige Jacke öffnen', exact: true })
    .click()
  await other
    .getByRole('button', { name: 'In die Wäsche legen', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: 'Für heute übernehmen', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toContainText('inzwischen geändert')
  await expect(
    dialog.getByRole('region', { name: 'Vorschau der Anpassung' }),
  ).toContainText('Beige Jacke')
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Dein Tageslook', exact: true })
      .locator('.outfit-piece'),
  ).toHaveCount(3)
  await other.close()
})

test('Ein inzwischen bestätigter Tragetag lässt sich aus einer alten Vorschau nicht überschreiben', async ({
  page,
  context,
}) => {
  await seed(page)
  await page
    .getByRole('button', { name: 'Tageslook verfeinern', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Ähnlich, aber wärmer', exact: true })
    .click()
  const other = await context.newPage()
  await other.goto('/')
  await other
    .getByRole('button', { name: 'Heute getragen', exact: true })
    .click()
  await expect(
    other.getByRole('button', { name: 'Getragen', exact: true }),
  ).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Für heute übernehmen', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toContainText('inzwischen geändert')
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  const saved = await exported(page)
  expect(saved.calendar[0].status).toBe('worn')
  const recorded = saved.outfits.find(
    (item: { id: string }) => item.id === saved.calendar[0].outfitId,
  )
  expect(recorded.garmentIds).toHaveLength(3)
  expect(recorded.garmentIds).not.toContain('jacket')
  await other.close()
})
