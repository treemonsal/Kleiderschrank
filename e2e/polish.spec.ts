import { test, expect } from './base'

test('Erster Start: Grundstücke antippen und gemeinsam hinzufügen, mit Google-Hinweis', async ({
  page,
}) => {
  await page.addInitScript(() => {
    ;(
      window as unknown as { __MYSTYLE_GOOGLE_CLIENT_ID__: string }
    ).__MYSTYLE_GOOGLE_CLIENT_ID__ = 'test.apps.googleusercontent.com'
  })
  await page.goto('/')
  const starter = page.getByRole('region', { name: 'Was besitzt du?' })
  await expect(starter).toBeVisible()
  await expect(
    starter.getByRole('button', { name: 'Mit Google anmelden' }),
  ).toBeVisible()
  // No dead button: adding appears once something is picked.
  await expect(
    starter.getByRole('button', { name: /^\d+ Stücke? hinzufügen$/ }),
  ).toHaveCount(0)
  for (const name of ['Weisses T-Shirt', 'Blaue Jeans', 'Weisse Sneaker'])
    await starter.getByRole('button', { name }).click()
  await starter.getByRole('button', { name: 'Blaue Jeans' }).click()
  await starter.getByRole('button', { name: 'Blaue Jeans' }).click()
  await starter.getByRole('button', { name: '3 Stücke hinzufügen' }).click()
  await expect(
    page.getByRole('region', { name: 'Was besitzt du?' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: 'Dein Tageslook' }).getByRole('button', {
      name: 'Blaue Jeans öffnen',
      exact: true,
    }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  await expect(page.locator('.profile-stats')).toHaveText(/Stücke\s*3/)
  // Zero counts stay hidden.
  await expect(page.locator('.profile-stats')).not.toContainText('Getragen')
})

test('Eigenes Profilbild wählen, entfernen und mitsichern', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  await page.getByRole('button', { name: 'Profil bearbeiten' }).click()
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 300
    canvas.height = 200
    const c = canvas.getContext('2d')!
    c.fillStyle = '#9fc4a3'
    c.fillRect(0, 0, 300, 200)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.getByLabel('Profilfoto wählen').setInputFiles({
    name: 'ich.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  })
  await page.getByRole('button', { name: 'Speichern', exact: true }).click()
  const avatar = page.locator('.profile-head .profile-avatar img')
  await expect(avatar).toHaveAttribute('src', /^data:image\/jpeg;base64,/)
  // In the backup, and accepted when read back.
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const stream = await (await download).createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  expect(data.preferences.avatar).toMatch(/^data:image\/jpeg;base64,/)
  await page.getByRole('button', { name: 'Zurück zum Profil' }).click()
  await page.getByRole('button', { name: 'Profil bearbeiten' }).click()
  await page
    .getByRole('button', { name: 'Eigenes Profilfoto entfernen' })
    .click()
  await page.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(avatar).toHaveCount(0)
})

test('Lang drücken öffnet Schnellaktionen statt des Webmenüs', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('region', { name: 'Was besitzt du?' })
    .getByRole('button', { name: 'Weisses T-Shirt' })
    .click()
  await page.getByRole('button', { name: '1 Stück hinzufügen' }).click()
  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  const card = page.locator('.garment-card').first()
  const box = (await card.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(600)
  await page.mouse.up()
  const menu = page.getByRole('dialog', { name: 'Weisses T-Shirt' })
  await expect(menu).toBeVisible()
  await menu.getByRole('button', { name: 'In die Wäsche legen' }).click()
  await expect(menu).toHaveCount(0)
  await page.getByRole('button', { name: 'Nur Wäsche' }).click()
  await expect(page.locator('.garment-card')).toHaveCount(1)
  // The web menu is switched off over the UI.
  expect(
    await card.evaluate(
      (node) =>
        getComputedStyle(node).getPropertyValue('-webkit-touch-callout') ||
        'none',
    ),
  ).toBe('none')
})

test('Journal und Einstellungen: Zurück-Knopf und Wischen vom Rand', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  await page.getByRole('button', { name: 'Journal', exact: true }).click()
  await page.getByRole('button', { name: 'Zurück zum Profil' }).click()
  await expect(
    page.getByRole('button', { name: 'Profil bearbeiten' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Einstellungen', exact: true }),
  ).toBeVisible()
  // A swipe from the left edge goes back, like on iOS.
  await page.evaluate(() => {
    const touch = (x: number) =>
      new Touch({
        identifier: 1,
        target: document.body,
        clientX: x,
        clientY: 400,
      })
    window.dispatchEvent(
      new TouchEvent('touchstart', {
        touches: [touch(8)],
        changedTouches: [touch(8)],
      }),
    )
    window.dispatchEvent(
      new TouchEvent('touchend', { touches: [], changedTouches: [touch(160)] }),
    )
  })
  await expect(
    page.getByRole('button', { name: 'Profil bearbeiten' }),
  ).toBeVisible()
})

test('Haptik bei wichtigen Tipps, nie bei reduzierter Bewegung', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const calls: unknown[] = []
    ;(window as unknown as { __vibrations: unknown[] }).__vibrations = calls
    Object.defineProperty(navigator, 'vibrate', {
      value: (pattern: unknown) => {
        calls.push(pattern)
        return true
      },
      configurable: true,
    })
  })
  await page.goto('/')
  await page
    .getByRole('region', { name: 'Was besitzt du?' })
    .getByRole('button', { name: 'Blaue Jeans' })
    .click()
  const count = () =>
    page.evaluate(
      () =>
        (window as unknown as { __vibrations: unknown[] }).__vibrations.length,
    )
  expect(await count()).toBe(1)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page
    .getByRole('region', { name: 'Was besitzt du?' })
    .getByRole('button', { name: 'Blaue Jeans' })
    .click()
  expect(await count()).toBe(1)
})

test('Startbilder für das iPhone und deckende Statusleiste', async ({
  page,
}) => {
  await page.goto('/')
  const links = page.locator('link[rel="apple-touch-startup-image"]')
  expect(await links.count()).toBeGreaterThanOrEqual(10)
  const href = await links.first().getAttribute('href')
  const response = await page.request.get(href!)
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('image/png')
  await expect(
    page.locator('meta[name="apple-mobile-web-app-status-bar-style"]'),
  ).toHaveAttribute('content', 'black')
})
