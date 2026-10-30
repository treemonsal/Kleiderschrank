import { test, expect, type Page } from './base'

test.use({ timezoneId: 'Europe/Zurich' })

async function importWeather(
  page: Page,
  day: string,
  code: number,
  place: string,
) {
  const fetchedAt = new Date(`${day}T06:00:00Z`).toISOString()
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
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
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
