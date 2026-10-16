import { test, expect } from '@playwright/test'

test('Wäschetrommel dreht und startet bei erneutem Tippen neu, während der Filter sofort reagiert', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  const laundry = page.getByRole('button', { name: 'Nur Wäsche', exact: true })
  await laundry.click()
  await expect(laundry).toHaveAttribute('aria-pressed', 'true')
  const drum = laundry.locator('[data-washer-drum]')
  const first = await drum.evaluate((node) => {
    const animation = node.getAnimations()[0]
    if (!animation) return null
    animation.pause()
    animation.currentTime = 220
    return getComputedStyle(node).transform
  })
  expect(first).not.toBeNull()
  expect(first).not.toBe('none')
  expect(first).not.toBe('matrix(1, 0, 0, 1, 0, 0)')
  // A rapid second activation replaces the old feedback, rather than stacking spins.
  await laundry.click()
  await expect(laundry).toHaveAttribute('aria-pressed', 'false')
  expect(
    await drum.evaluate(
      (node) =>
        node.getAnimations().filter((a) => a.playState !== 'finished').length,
    ),
  ).toBe(1)
  await expect
    .poll(() => drum.evaluate((node) => node.getAnimations().length))
    .toBe(0)
})

test('Herz reagiert auf Tippen; Bewegung reduzieren stoppt laufendes Feedback und neue Drehungen', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  const heart = page.getByRole('button', { name: 'Nur Favoriten', exact: true })
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'true')
  expect(
    await heart.locator('svg').evaluate((node) => node.getAnimations().length),
  ).toBeGreaterThan(0)
  const laundry = page.getByRole('button', { name: 'Nur Wäsche', exact: true })
  await laundry.click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect
    .poll(() =>
      laundry
        .locator('svg')
        .evaluate((node) => node.getAnimations({ subtree: true }).length),
    )
    .toBe(0)
  await laundry.click()
  await expect(laundry).toHaveAttribute('aria-pressed', 'false')
  expect(
    await laundry
      .locator('[data-washer-drum]')
      .evaluate((node) => getComputedStyle(node).transform),
  ).toBe('none')
  await heart.click()
  await expect(heart).toHaveAttribute('aria-pressed', 'false')
  expect(
    await heart.locator('svg').evaluate((node) => node.getAnimations().length),
  ).toBe(0)
})

test('Schnelle Tabwechsel behalten die letzte Auswahl, auch beim sofortigen Zurücktippen auf Heute', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true }),
  ).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
  await nav.evaluate((node) => {
    const buttons = node.querySelectorAll('button')
    buttons[1].click()
    buttons[0].click()
  })
  await expect(
    nav.getByRole('button', { name: 'Heute', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  // Let any superseded snapshot callback run before checking the final state.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  await expect(
    page.getByRole('region', { name: 'Dein Tageslook' }),
  ).toBeVisible()
  await nav.evaluate((node) => {
    const buttons = node.querySelectorAll('button')
    buttons[1].click()
    buttons[3].click()
    buttons[2].click()
  })
  await expect(
    nav.getByRole('button', { name: 'Outfits', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('heading', { name: 'Deine nächsten Looks.', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Outfits zusammenstellen', exact: true })
    .click()
  await expect(
    page.getByText('Noch kein kompletter Look.', { exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('Ohne Animations-APIs bleiben Filter, Navigation und Fenster bedienbar', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, 'startViewTransition', {
      value: undefined,
      configurable: true,
    })
    Object.defineProperty(Element.prototype, 'animate', {
      value: undefined,
      configurable: true,
    })
  })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  const laundry = page.getByRole('button', { name: 'Nur Wäsche', exact: true })
  await laundry.click()
  await expect(laundry).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: 'Stück hinzufügen', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await expect(
    page.getByRole('region', { name: 'Dein Tageslook' }),
  ).toBeVisible()
})

test('Reduzierte Bewegung lässt Seiten und Fenster ohne Einfedern erscheinen', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  expect(
    await dialog.evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none')
  expect(
    await dialog.evaluate((node) => getComputedStyle(node).transform),
  ).toBe('none')
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  expect(
    await page
      .locator('.view')
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none')
  expect(
    await page
      .locator('.view')
      .evaluate((node) => getComputedStyle(node).transform),
  ).toBe('none')
})
