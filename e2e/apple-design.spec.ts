import { test, expect, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // The sheet has risen on its spring.
  await expect
    .poll(() => dialog.evaluate((node) => node.style.transform))
    .toBe('')
  return dialog
}

async function pullHandle(page: Page, distance: number, steps = 6) {
  const handle = await page.locator('.sheet-handle').boundingBox()
  const x = handle!.x + handle!.width / 2
  const y = handle!.y + 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, y + (distance * i) / steps)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
}

test('Ein Sheet folgt dem Griff, federt bei kurzem Zug zurück und schliesst bei langem', async ({
  page,
}) => {
  const dialog = await openEditor(page)
  await pullHandle(page, 60, 5)
  await expect
    .poll(() => dialog.evaluate((node) => node.style.transform))
    .toBe('')
  await expect(dialog).toBeVisible()

  await pullHandle(page, 420)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // Only an inert copy leaves the screen; it is gone shortly after.
  await expect(page.locator('.sheet-ghost')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true }),
  ).toBeFocused()
})

test('Ungespeicherte Eingaben bleiben beim Herunterziehen geschützt', async ({
  page,
}) => {
  const dialog = await openEditor(page)
  await dialog.getByLabel('Name', { exact: false }).fill('Leinenhemd')
  await pullHandle(page, 420)
  await expect(
    dialog.getByText('Ungespeicherte Änderungen verwerfen?'),
  ).toBeVisible()
  await expect
    .poll(() => dialog.evaluate((node) => node.style.transform))
    .toBe('')
  await dialog
    .getByRole('button', { name: 'Weiter bearbeiten', exact: true })
    .click()
  await expect(dialog.getByLabel('Name', { exact: false })).toHaveValue(
    'Leinenhemd',
  )
})

test('Vom Inhalt aus schliesst nur ein Zug nach unten ganz oben', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Touch-Eingaben über CDP')
  const dialog = await openEditor(page)
  const cdp = await page.context().newCDPSession(page)
  const swipe = async (from: number, to: number) => {
    const touch = (type: string, y?: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: y === undefined ? [] : [{ x: 200, y }],
      })
    await touch('touchStart', from)
    for (let i = 1; i <= 8; i++) {
      await touch('touchMove', from + ((to - from) * i) / 8)
      await page.waitForTimeout(16)
    }
    await touch('touchEnd')
  }
  await swipe(600, 300)
  await expect
    .poll(() => dialog.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(50)
  // Scrolled down, a downward swipe scrolls back instead of closing.
  await swipe(400, 700)
  await expect(dialog).toBeVisible()
  await dialog.evaluate((node) => node.scrollTo(0, 0))
  await swipe(400, 760)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('Reduzierte Bewegung blendet Sheets nur ein und aus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const dialog = await openEditor(page)
  await pullHandle(page, 420)
  // No drag with reduced motion: the sheet stays where it is.
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate((node) => node.style.transform)).toBe('')
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('Dunkelmodus nutzt dunkle Flächen und eine Materialleiste', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true }),
  ).toBeVisible()
  const look = await page.evaluate(() => {
    const nav = getComputedStyle(document.querySelector('.tab-bar')!)
    return {
      body: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(document.body).color,
      blur:
        nav.backdropFilter || nav.getPropertyValue('-webkit-backdrop-filter'),
    }
  })
  expect(look.body).toBe('rgb(0, 0, 0)')
  expect(look.text).toBe('rgb(245, 245, 247)')
  expect(look.blur).toContain('blur')
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Garderobe', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
})
