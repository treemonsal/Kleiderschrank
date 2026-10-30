import { test, expect, type Page } from './base'
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
  test(`Tageslook ${width}px zeigt „Wärmer“ als Vorschau auf der Tafel und übernimmt erst bewusst`, async ({
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
    const before = (await exported(page)).preferences.dailySelection
    await page.getByRole('button', { name: 'Heute', exact: true }).click()
    await daily.getByRole('button', { name: 'Wärmer', exact: true }).click()
    const preview = daily.getByRole('region', {
      name: 'Vorschau der Anpassung',
    })
    await expect(preview).toContainText('Beige Jacke')
    // The plate previews the variant and marks the new piece.
    await expect(daily.locator('.outfit-piece')).toHaveCount(4)
    await expect(daily.locator('.figure-tile.is-new')).toHaveCount(1)
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true)
    await preview.screenshot({
      path: info.outputPath(`refinement-${width}.png`),
    })
    // Verwerfen restores today's look without writing anything.
    await preview
      .getByRole('button', { name: 'Verwerfen', exact: true })
      .click()
    await expect(daily.locator('.outfit-piece')).toHaveCount(3)
    expect((await exported(page)).preferences.dailySelection).toEqual(before)
    await page.getByRole('button', { name: 'Heute', exact: true }).click()
    await daily.getByRole('button', { name: 'Wärmer', exact: true }).click()
    await preview
      .getByRole('button', { name: 'Übernehmen', exact: true })
      .click()
    await expect(preview).toHaveCount(0)
    await expect(daily.locator('.outfit-piece')).toHaveCount(4)
    await expect(daily.locator('.figure-tile.is-new')).toHaveCount(0)
    await page.reload()
    await expect(daily.locator('.outfit-piece')).toHaveCount(4)
    const saved = await exported(page)
    expect(saved.preferences.dailySelection.garmentIds).toEqual(
      expect.arrayContaining(['jacket']),
    )
    expect(saved.feedback).toEqual([])
    expect(external).toEqual([])
  })
}

test('„Weitere Variante“ blättert durch Alternativen und übernimmt die gezeigte', async ({
  page,
}) => {
  await seed(page)
  const daily = page.getByRole('region', {
    name: 'Dein Tageslook',
    exact: true,
  })
  await daily.getByRole('button', { name: 'Ähnlich', exact: true }).click()
  const preview = daily.getByRole('region', {
    name: 'Vorschau der Anpassung',
  })
  await expect(preview).toContainText(/1 von [2-5]/)
  const first = await preview.locator('p').nth(1).textContent()
  await preview
    .getByRole('button', { name: 'Weitere Variante', exact: true })
    .click()
  await expect(preview).toContainText(/2 von [2-5]/)
  const second = await preview.locator('p').nth(1).textContent()
  expect(second).not.toBe(first)
  const shown = await daily
    .locator('.figure-tile .outfit-piece')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('aria-label')),
    )
  await preview.getByRole('button', { name: 'Übernehmen', exact: true }).click()
  await expect(preview).toHaveCount(0)
  const saved = await exported(page)
  const names: Record<string, string> = {
    'top-red': 'Rotes Shirt',
    'top-beige': 'Beiges Shirt',
    pants: 'Schwarze Hose',
    shoes: 'Weisse Sneaker',
    boots: 'Braune Schuhe',
    jacket: 'Beige Jacke',
  }
  const applied = (saved.preferences.dailySelection.garmentIds as string[])
    .map((id) => `${names[id] ?? id} öffnen`)
    .sort()
  expect(applied).toEqual([...shown].sort())
})

test('Feedback „Zu auffällig“ und Ablehnung ohne Grund werden dauerhaft gesichert', async ({
  page,
}) => {
  await seed(page)
  await page
    .getByRole('button', { name: 'Tageslook: Passt nicht', exact: true })
    .click()
  await page.getByRole('button', { name: 'Zu auffällig', exact: true }).click()
  await expect(page.getByText('Grund angeben, freiwillig')).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Tageslook: Passt nicht', exact: true })
    .click()
  await page.getByRole('button', { name: 'Ohne Grund', exact: true }).click()
  await expect(page.getByText('Grund angeben, freiwillig')).toHaveCount(0)
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
  const dialog = page.getByRole('region', {
    name: 'Dein Tageslook',
    exact: true,
  })
  await dialog.getByRole('button', { name: 'Wärmer', exact: true }).click()
  const other = await context.newPage()
  await other.goto('/')
  await other.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await other
    .getByRole('button', { name: 'Beige Jacke öffnen', exact: true })
    .click()
  await other
    .getByRole('button', { name: 'In die Wäsche legen', exact: true })
    .click()
  await dialog.getByRole('button', { name: 'Übernehmen', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('inzwischen geändert')
  await expect(
    dialog.getByRole('region', { name: 'Vorschau der Anpassung' }),
  ).toContainText('Beige Jacke')
  await dialog.getByRole('button', { name: 'Verwerfen', exact: true }).click()
  await expect(dialog.locator('.outfit-piece')).toHaveCount(3)
  await other.close()
})

test('Ein inzwischen bestätigter Tragetag lässt sich aus einer alten Vorschau nicht überschreiben', async ({
  page,
  context,
}) => {
  await seed(page)
  const dialog = page.getByRole('region', {
    name: 'Dein Tageslook',
    exact: true,
  })
  await dialog.getByRole('button', { name: 'Wärmer', exact: true }).click()
  const other = await context.newPage()
  await other.goto('/')
  await other
    .getByRole('button', { name: 'Heute getragen', exact: true })
    .click()
  await expect(
    other.getByText('Im Journal vermerkt', { exact: true }),
  ).toBeVisible()
  // The confirmed day closes the preview here; nothing can be applied.
  await expect(
    dialog.getByRole('region', { name: 'Vorschau der Anpassung' }),
  ).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Übernehmen' })).toHaveCount(
    0,
  )
  const saved = await exported(page)
  expect(saved.calendar[0].status).toBe('worn')
  const recorded = saved.outfits.find(
    (item: { id: string }) => item.id === saved.calendar[0].outfitId,
  )
  expect(recorded.garmentIds).toHaveLength(3)
  expect(recorded.garmentIds).not.toContain('jacket')
  await other.close()
})

test('„Heute getragen“ lässt sich direkt zurücknehmen, ohne Spuren zu hinterlassen', async ({
  page,
}) => {
  await seed(page)
  const before = await exported(page)
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  const look = page.getByRole('region', { name: 'Dein Tageslook' })
  await look
    .getByRole('button', { name: 'Heute getragen', exact: true })
    .click()
  await expect(look.getByText('Im Journal vermerkt')).toBeVisible()
  await look.getByRole('button', { name: 'Rückgängig', exact: true }).click()
  await expect(
    look.getByRole('button', { name: 'Heute getragen', exact: true }),
  ).toBeVisible()
  const after = await exported(page)
  expect(after.calendar).toEqual(before.calendar)
  expect(after.outfits).toEqual(before.outfits)
  expect(
    after.garments.map((item: { inLaundry?: boolean }) => !!item.inLaundry),
  ).toEqual(
    before.garments.map((item: { inLaundry?: boolean }) => !!item.inLaundry),
  )
})
