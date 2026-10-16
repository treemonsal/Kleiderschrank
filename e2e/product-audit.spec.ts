import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const stamp = '2026-01-01T00:00:00.000Z'
const base = ['Oberteile', 'Hosen', 'Schuhe', 'Jacken'].map((category, i) => ({
  id: `audit-${i}`,
  name: ['Hemd', 'Hose', 'Sneaker', 'Jacke'][i],
  category,
  color: 'Weiss',
  brand: '',
  seasons: [],
  styles: ['Minimalistisch'],
  notes: '',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
}))
async function importItems(page: Page, alternative = true) {
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'audit.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 4,
        garments: alternative
          ? [...base, { ...base[0], id: 'alternative', name: 'Pullover' }]
          : base,
        outfits: [],
        feedback: [],
        preferences: null,
        calendar: [],
        weather: null,
      }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Dein Tageslook' })
      .locator('.outfit-piece')
      .first(),
  ).toBeVisible()
}
async function exportData(page: Page) {
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  return JSON.parse(await readFile((await (await pending).path())!, 'utf8'))
}
test.use({ timezoneId: 'Europe/Zurich' })
for (const width of [375, 390, 430])
  test(`Erster Schritt und Tagesbestätigung sind bei ${width}px ohne Scrollen erreichbar`, async ({
    page,
  }, info) => {
    await page.clock.install({ time: new Date('2026-10-16T10:00:00Z') })
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    const add = page.getByRole('button', {
      name: 'Erstes Stück hinzufügen',
      exact: true,
    })
    await expect(add).toHaveCount(1)
    const box = (await add.boundingBox())!
    expect(box.y + box.height).toBeLessThan(744)
    // Animated translations can produce 43.999969px for a 44px target.
    // Ignore sub-thousandth-pixel arithmetic noise, retaining the size check.
    expect(Number(box.height.toFixed(3))).toBeGreaterThanOrEqual(44)
    await page.screenshot({
      path: info.outputPath(`empty-after-${width}.png`),
      fullPage: true,
    })
    await add.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
    await importItems(page)
    const worn = page.getByRole('button', {
      name: 'Heute getragen',
      exact: true,
    })
    await expect(worn).toBeVisible()
    const action = (await worn.boundingBox())!
    expect(action.y + action.height).toBeLessThan(744)
    expect(Number(action.height.toFixed(3))).toBeGreaterThanOrEqual(44)
    await expect(page.locator('.daily-context')).toContainText('Ohne Wetter')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: info.outputPath(`home-after-${width}.png`),
      fullPage: true,
    })
  })

test('Anderer Tageslook bleibt nach Neustart erhalten; Gefällt mir lässt sich zurücknehmen', async ({
  page,
}) => {
  await page.goto('/')
  await importItems(page)
  const look = page.getByRole('region', { name: 'Dein Tageslook' })
  const before = await look.locator('.outfit-piece').allTextContents()
  await look.getByRole('button', { name: 'Anderer Look', exact: true }).click()
  await expect
    .poll(() => look.locator('.outfit-piece').allTextContents())
    .not.toEqual(before)
  const after = await look.locator('.outfit-piece').allTextContents()
  await page.reload()
  await expect
    .poll(() => look.locator('.outfit-piece').allTextContents())
    .toEqual(after)
  const like = look.getByRole('button', {
    name: 'Tageslook: Gefällt mir',
    exact: true,
  })
  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'true')
  const liked = await exportData(page)
  expect(liked.feedback).toHaveLength(1)
  expect(liked.feedback[0].verdict).toBe('liked')
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await like.click()
  await expect(like).toHaveAttribute('aria-pressed', 'false')
  const undone = await exportData(page)
  expect(undone.feedback).toHaveLength(0)
  expect(undone.calendar).toHaveLength(0)
  expect(undone.outfits).toHaveLength(0)
  expect(undone.preferences.dailySelection).toEqual(
    liked.preferences.dailySelection,
  )
})

test('Ohne Alternative bleibt der Tageslook erhalten und wird nicht als abgelehnt gespeichert', async ({
  page,
}) => {
  await page.goto('/')
  await importItems(page, false)
  const look = page.getByRole('region', { name: 'Dein Tageslook' })
  const before = await look.locator('.outfit-piece').allTextContents()
  await look.getByRole('button', { name: 'Anderer Look', exact: true }).click()
  await expect(
    page.getByText(
      /Für diese Auswahl gibt es gerade keinen anderen vollständigen Look/,
    ),
  ).toBeVisible()
  expect(await look.locator('.outfit-piece').allTextContents()).toEqual(before)
  const data = await exportData(page)
  expect(data.feedback).toHaveLength(0)
  expect(data.preferences.dailySelection).toBeUndefined()
})

test('Blockierter Gerätespeicher zeigt Hilfe und erneutes Laden statt endloser Ladeanzeige', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() =>
    Object.defineProperty(IDBFactory.prototype, 'open', {
      value() {
        throw new DOMException('Storage blocked', 'SecurityError')
      },
    }),
  )
  await page.goto('/')
  const state = page.getByRole('region', { name: 'Speicher nicht erreichbar' })
  await expect(state).toBeVisible()
  await expect(state.getByRole('alert')).toContainText(
    'Die App hat nichts gelöscht.',
  )
  await expect(
    page.getByText('Dein Kleiderschrank wird geöffnet …', { exact: true }),
  ).not.toBeVisible()
  await expect(
    state.getByRole('button', { name: 'Erneut laden', exact: true }),
  ).toBeEnabled()
  expect(errors).toEqual([])
})

test('Tastatur erreicht den Inhalt direkt; Dialog gibt den Fokus an die auslösende Aktion zurück', async ({
  page,
}) => {
  await page.goto('/')
  const add = page.getByRole('button', {
    name: 'Erstes Stück hinzufügen',
    exact: true,
  })
  await expect(add).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Zum Inhalt', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  await add.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(add).toBeFocused()
})
