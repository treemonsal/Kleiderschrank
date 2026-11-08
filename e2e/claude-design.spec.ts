import { test, expect, type Page } from './base'

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

test('Charcoal und Sand, Systemschrift und Lucide-Symbole, auch bei heller Geräteeinstellung', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true }),
  ).toBeVisible()
  const look = await page.evaluate(() => {
    const nav = getComputedStyle(document.querySelector('.tab-bar')!)
    const icon = getComputedStyle(
      document.querySelector('.tab-bar button:not(.active) svg')!,
    )
    const add = getComputedStyle(
      document.querySelector('.daily-look .button.primary, .button.primary')!,
    )
    const today = document.querySelector(
      '.home-week-strip [aria-current="date"] .day-number > span:last-child',
    )
    return {
      body: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(document.body).color,
      blur:
        nav.backdropFilter || nav.getPropertyValue('-webkit-backdrop-filter'),
      font: getComputedStyle(document.querySelector('h1')!).fontFamily,
      stroke: icon.strokeWidth,
      filter: icon.filter,
      primary: add.backgroundColor,
      today: today ? getComputedStyle(today).backgroundColor : null,
    }
  })
  // Charcoal ground, warm light ink and buttons, sand for today; no glow.
  expect(look.body).toBe('rgb(35, 35, 37)')
  expect(look.text).toBe('rgb(238, 230, 216)')
  expect(look.primary).toBe('rgb(238, 230, 216)')
  expect(look.today).toBe('rgb(217, 200, 169)')
  expect(look.blur).not.toContain('blur')
  expect(look.font).toContain('-apple-system')
  expect(look.font).not.toContain('Caveat')
  expect(look.stroke).toBe('1.5px')
  expect(look.filter).toBe('none')
})

test('Das Datum passt sich an und bleibt danach ruhig, auch mit reduzierter Bewegung', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 320, height: 700 })
  await page.clock.install({ time: new Date('2026-09-28T08:00:00Z') })
  await page.goto('/')
  const date = page.locator('.journal-day-head .home-date')
  await expect(date).toHaveText('28. September')
  const changes = await date.evaluate(
    (node) =>
      new Promise<number>((resolve) => {
        let count = 0
        const observer = new MutationObserver(() => count++)
        observer.observe(node, { attributes: true })
        setTimeout(() => {
          observer.disconnect()
          resolve(count)
        }, 800)
      }),
  )
  expect(changes).toBe(0)
  const fits = await date.evaluate((node) => {
    const range = document.createRange()
    range.selectNodeContents(node)
    return (
      range.getBoundingClientRect().right <=
      node.parentElement!.getBoundingClientRect().right + 0.5
    )
  })
  expect(fits).toBe(true)
})

test('Flach und ruhig: kein Leuchten, keine Box in der Box, konzentrische Ecken', async ({
  page,
}) => {
  const stamp = '2026-01-01T00:00:00.000Z'
  const piece = (id: string, category: string, color: string) => ({
    id,
    name: id,
    category,
    color,
    brand: '',
    seasons: [],
    styles: [],
    notes: '',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
  })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'flat.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 4,
        garments: [
          piece('Hemd', 'Oberteile', 'Weiss'),
          piece('Chino', 'Hosen', 'Beige'),
          piece('Sneaker', 'Schuhe', 'Weiss'),
        ],
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
  await expect(page.locator('.figure-tile').first()).toBeVisible()
  const shape = await page.evaluate(() => {
    const glowing = [...document.querySelectorAll('body *')].filter((node) => {
      const style = getComputedStyle(node)
      return (
        (style.boxShadow !== 'none' && !style.boxShadow.includes('inset')) ||
        style.backdropFilter.includes('blur') ||
        style.textShadow !== 'none'
      )
    })
    const plate = getComputedStyle(document.querySelector('.figure-plate')!)
    const tile = document.querySelector('.figure-tile > .outfit-piece')!
    const swap = document.querySelector('.figure-tile .piece-swap')!
    const t = tile.getBoundingClientRect(),
      s = swap.getBoundingClientRect()
    return {
      glowing: glowing.map((node) => node.className).slice(0, 5),
      plate: plate.backgroundColor,
      tileRadius: parseFloat(getComputedStyle(tile).borderTopRightRadius),
      inset: t.right - s.right,
      swapRadius: s.width / 2,
    }
  })
  expect(shape.glowing).toEqual([])
  expect(shape.plate).toBe('rgba(0, 0, 0, 0)')
  // The swap button sits in the tile's corner on the same curve.
  expect(
    Math.abs(shape.tileRadius - (shape.inset + shape.swapRadius)),
  ).toBeLessThan(1)
})
