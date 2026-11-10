import { test, expect, type Page } from './base'

test.use({ timezoneId: 'Europe/Zurich' })

async function importWeather(
  page: Page,
  day: string,
  code: number,
  place: string,
) {
  const fetchedAt = new Date(`${day}T06:00:00Z`).toISOString()
  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'weather.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 8,
        garments: [],
        outfits: [],
        feedback: [],
        preferences: null,
        calendar: [],
        chat: null,
        weather: {
          id: 'local',
          location: { name: place, latitude: 47.23, longitude: 8.82 },
          updatedAt: fetchedAt,
          report: {
            fetchedAt,
            timezone: 'Europe/Zurich',
            days: [{ day, min: 7, max: 13, rain: 60, code }],
          },
        },
      }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Home', exact: true }).click()
}

// Long weather words, places and months must never run into the date.
for (const width of [320, 375, 390, 430])
  for (const [day, code, place] of [
    ['2026-10-28', 80, 'Mein Standort'],
    ['2026-09-28', 2, 'Rapperswil-Jona'],
  ] as const)
    test(`Datum und Wetter überlappen bei ${width}px nicht (${day}, ${place})`, async ({
      page,
    }) => {
      await page.clock.install({ time: new Date(`${day}T08:00:00Z`) })
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/')
      await importWeather(page, day, code, place)
      const weather = page.getByRole('button', {
        name: 'Wetter anzeigen und Ort ändern',
        exact: true,
      })
      await expect(weather).toContainText('7°–13°')
      const date = page.locator('.journal-day-head .home-date')
      const dateBox = (await date.boundingBox())!
      const weatherBox = (await weather.boundingBox())!
      // The rendered text (not just its box) must end before the weather.
      const textRight = await date.evaluate((node) => {
        const range = document.createRange()
        range.selectNodeContents(node)
        return range.getBoundingClientRect().right
      })
      expect(textRight).toBeLessThan(weatherBox.x - 4)
      expect(dateBox.x).toBeGreaterThanOrEqual(0)
      expect(weatherBox.x + weatherBox.width).toBeLessThanOrEqual(width)
      expect(Number(weatherBox.height.toFixed(3))).toBeGreaterThanOrEqual(44)
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true)
    })

test('Datum und Wetter stehen auf einer Linie: Überzeilen oben, Werte unten', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-11-10T07:13:00Z') })
  await page.goto('/')
  await importWeather(page, '2026-11-10', 80, 'Mein Standort')
  const kicker = await page.locator('.journal-date .kicker').boundingBox()
  const date = await page.locator('.journal-date .home-date').boundingBox()
  const label = await page.locator('.home-weather-label').boundingBox()
  const range = await page.locator('.weather-range').boundingBox()
  // Judged by eye: the two small lines share a top, the values a bottom.
  expect(Math.abs(kicker!.y - label!.y)).toBeLessThanOrEqual(3)
  expect(
    Math.abs(date!.y + date!.height - (range!.y + range!.height)),
  ).toBeLessThanOrEqual(3)
  // Only two lines: the place is spoken, not shown.
  await expect(page.locator('.home-weather')).not.toContainText(
    'Regenschauer\nMein',
  )
  await expect(page.locator('.home-weather .sr-only')).toContainText(
    'Mein Standort',
  )
})

test('Home und Profil ohne überflüssige Texte und Knöpfe', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true }),
  ).toBeVisible()
  for (const text of [
    'Starte mit einem Foto.',
    'Für deinen ersten Look brauchst du',
    'Erster Schritt',
  ])
    await expect(page.getByText(text, { exact: false })).toHaveCount(0)
  // Settings live in the profile; an empty wardrobe hides the composer.
  await expect(
    page.getByRole('button', { name: 'Einstellungen öffnen', exact: true }),
  ).toHaveCount(0)
  await expect(page.locator('#more-looks')).toHaveCount(0)
  // The active tab icon is filled, as Home's is.
  await expect(
    page.locator('.bottom-nav button.active [data-filled]'),
  ).toHaveCount(1)
  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  await expect(
    page.locator('.bottom-nav button.active [data-filled]'),
  ).toHaveCount(1)
  await expect(page.locator('.bottom-nav [data-filled]')).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Einstellungen öffnen', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('group', { name: 'Kategorie filtern' }),
  ).toHaveCount(0)
  await expect(page.getByText('Füge dein erstes Stück hinzu.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await expect(
    page.getByText('Speichere auf Home', { exact: false }),
  ).toHaveCount(0)
  // The page is never shorter than the screen, so the tab bar stays put.
  const heights = await page.evaluate(() => ({
    doc: document.documentElement.scrollHeight,
    screen: window.innerHeight,
  }))
  expect(heights.doc).toBeGreaterThanOrEqual(heights.screen)
})

test('Nach dem Schliessen eines Stücks bekommt die Seite keinen Rahmen', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page
    .getByRole('button', { name: 'Ohne Foto eintragen', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByLabel('Name', { exact: false })
    .fill('Hemd')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'In die Garderobe legen' })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  await page.getByRole('button', { name: 'Hemd öffnen', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // Also the page focused by switching tabs (as with the keyboard).
  await page.locator('#main-content').focus()
  const outlines = await page.evaluate(() =>
    [...document.querySelectorAll('[tabindex="-1"]')].map(
      (node) => getComputedStyle(node).outlineStyle,
    ),
  )
  expect(outlines.every((style) => style === 'none')).toBe(true)
})
