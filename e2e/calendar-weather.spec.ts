import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.use({ timezoneId: 'Europe/Zurich' })
const fixedTime = new Date('2026-10-15T10:00:00Z')
async function seed(page: Page) {
  const items = ['Oberteile', 'Hosen', 'Schuhe', 'Jacken'].map(
    (category, index) => ({
      id: `item-${index}`,
      name: ['Hemd', 'Hose', 'Sneaker', 'Jacke'][index],
      category,
      color: 'Weiss',
      brand: '',
      seasons: [],
      styles: [],
      notes: '',
      favorite: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }),
  )
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'test-wardrobe.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ app: 'MyStyle', version: 1, garments: items }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
}
async function mockWeather(page: Page, fail: () => boolean = () => false) {
  const calls: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('open-meteo.com')) calls.push(request.url())
  })
  await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            name: 'Zürich',
            admin1: 'Zürich',
            country: 'Schweiz',
            latitude: 47.3769123,
            longitude: 8.5417821,
          },
        ],
      },
      headers: { 'Access-Control-Allow-Origin': '*' },
    }),
  )
  await page.route('https://api.open-meteo.com/**', (route) =>
    fail()
      ? route.fulfill({
          status: 503,
          body: 'Unavailable',
          headers: { 'Access-Control-Allow-Origin': '*' },
        })
      : route.fulfill({
          json: {
            timezone: 'Europe/Zurich',
            daily_units: {
              temperature_2m_min: '°C',
              temperature_2m_max: '°C',
              precipitation_probability_max: '%',
            },
            daily: {
              time: ['2026-10-15', '2026-10-16'],
              temperature_2m_min: [5, 7],
              temperature_2m_max: [9, 12],
              precipitation_probability_max: [80, 40],
              weather_code: [61, 3],
            },
          },
          headers: { 'Access-Control-Allow-Origin': '*' },
        }),
  )
  return calls
}
async function manualWeather(page: Page) {
  await page
    .getByText('Wetter für deinen Look', { exact: false })
    .first()
    .click()
  await page
    .getByRole('textbox', { name: 'Ort manuell suchen', exact: true })
    .fill('Zürich')
  await page.getByRole('button', { name: 'Ort suchen', exact: true }).click()
  await page
    .getByRole('button', { name: 'Zürich, Zürich, Schweiz', exact: true })
    .click()
  await page.getByRole('button', { name: 'Wetter laden', exact: true }).click()
  await expect(
    page.getByText('Regenwahrscheinlichkeit: 80 %', { exact: true }),
  ).toBeVisible()
}

test('Kalender plant und bestätigt Looks, stellt sie aus Sicherungen wieder her und entfernt abhängige Tage', async ({
  page,
  context,
}, testInfo) => {
  await page.clock.install({ time: fixedTime })
  await page.goto('/')
  await seed(page)
  await page
    .getByRole('button', { name: 'Outfits zusammenstellen', exact: true })
    .click()
  await page.getByRole('button', { name: 'Speichern', exact: true }).click()
  await page.getByRole('button', { name: 'Kalender', exact: true }).click()
  await page.getByLabel('Tag auswählen', { exact: true }).fill('2026-10-16')
  await page
    .getByRole('button', { name: 'Look einplanen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('option', { name: 'Getragen', exact: true }),
  ).toHaveJSProperty('disabled', true)
  await dialog.getByLabel('Notiz zum Tag').fill('Besprechung')
  await dialog
    .getByRole('button', { name: 'Tag speichern', exact: true })
    .click()
  await expect(page.getByText('Geplant', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Getragen', exact: true }),
  ).toHaveCount(0)
  await page.getByLabel('Tag auswählen', { exact: true }).fill('2026-10-15')
  await page
    .getByRole('button', { name: 'Look einplanen', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Tag speichern', exact: true })
    .click()
  await page.getByRole('button', { name: 'Getragen', exact: true }).click()
  await expect(
    page.getByText('1 Tag als getragen vermerkt.', { exact: false }),
  ).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('calendar-worn-390.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const download = await downloadPromise
  const json = await readFile((await download.path())!, 'utf8'),
    data = JSON.parse(json)
  expect(data.version).toBe(4)
  expect(data.calendar).toHaveLength(2)
  const empty = {
    ...data,
    garments: [],
    outfits: [],
    feedback: [],
    preferences: null,
    calendar: [],
    weather: null,
  }
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'empty.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(empty)),
  })
  await page
    .getByRole('radio', { name: /Vorhandenen Bestand ersetzen/ })
    .check()
  await page
    .getByRole('button', {
      name: 'Bestand ersetzen und importieren',
      exact: true,
    })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'restore.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await page.getByRole('button', { name: 'Kalender', exact: true }).click()
  await expect(page.getByText('Getragen', { exact: true })).toBeVisible()
  await page.getByLabel('Tag auswählen', { exact: true }).fill('2026-10-16')
  await expect(page.getByText('Besprechung', { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Gespeichert (1)', exact: true })
    .click()
  await page
    .getByRole('button', {
      name: 'Name ändern oder Outfit löschen',
      exact: true,
    })
    .click()
  await page
    .getByRole('button', { name: 'Outfit löschen', exact: true })
    .click()
  await expect(
    page.getByText('seine Kalendereinträge löschen', { exact: false }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Outfit endgültig löschen', exact: true })
    .click()
  await page.getByRole('button', { name: 'Kalender', exact: true }).click()
  await expect(
    page.getByText('0 Tage als getragen vermerkt.', { exact: false }),
  ).toBeVisible()
})

test('Wetter sendet ohne Aktion nichts, beeinflusst Looks erst nach Aktivierung und erhält Cache bei Fehler', async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: fixedTime })
  let fail = false
  const calls = await mockWeather(page, () => fail)
  await page.goto('/')
  await seed(page)
  expect(calls).toEqual([])
  await manualWeather(page)
  expect(calls).toHaveLength(2)
  const url = new URL(calls[1])
  expect(url.searchParams.get('latitude')).toBe('47.38')
  expect(url.searchParams.get('longitude')).toBe('8.54')
  const toggle = page.getByRole('checkbox', {
    name: 'Wetter für Vorschläge verwenden',
    exact: true,
  })
  await expect(toggle).not.toBeChecked()
  await page
    .getByRole('button', { name: 'Outfits zusammenstellen', exact: true })
    .click()
  let result = page.getByRole('article', { name: 'Outfit-Vorschlag 1' })
  await expect(
    result.getByRole('button', { name: 'Jacke öffnen', exact: true }),
  ).toHaveCount(0)
  await toggle.check()
  result = page.getByRole('article', { name: 'Outfit-Vorschlag 1' })
  await expect(
    result.getByRole('button', { name: 'Jacke öffnen', exact: true }),
  ).toBeVisible()
  await result.getByText('Warum diese Kombination?', { exact: true }).click()
  await expect(
    result.getByText('Regen ist möglich.', { exact: false }),
  ).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('weather-styling-390.png'),
    fullPage: true,
  })
  fail = true
  await page.getByRole('button', { name: 'Wetter laden', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('503')
  await expect(
    page.getByText('Regenwahrscheinlichkeit: 80 %', { exact: true }),
  ).toBeVisible()
  await page.clock.fastForward(7 * 3600000)
  await expect(toggle).toBeDisabled()
  await expect(toggle).not.toBeChecked()
  await expect(
    page.getByText('Gespeicherte Vorhersage veraltet', { exact: false }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('article', { name: 'Outfit-Vorschlag 1' })
      .getByRole('button', { name: 'Jacke öffnen', exact: true }),
  ).toHaveCount(0)
})

test('Wetterort bleibt offline verfügbar und kann ohne Netz vollständig vergessen werden', async ({
  page,
  context,
}) => {
  await page.clock.install({ time: fixedTime })
  const calls = await mockWeather(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await manualWeather(page)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await page
    .getByText('Wetter für deinen Look', { exact: false })
    .first()
    .click()
  await expect(
    page.getByText('Regenwahrscheinlichkeit: 80 %', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('checkbox', {
      name: 'Wetter für Vorschläge verwenden',
      exact: true,
    }),
  ).not.toBeChecked()
  expect(calls).toHaveLength(2)
  await page
    .getByRole('button', { name: 'Ort und Wetter vergessen', exact: true })
    .click()
  await expect(
    page.getByText('Regenwahrscheinlichkeit: 80 %', { exact: true }),
  ).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await page
    .getByText('Wetter für deinen Look', { exact: false })
    .first()
    .click()
  await expect(
    page.getByRole('button', { name: 'Wetter laden', exact: true }),
  ).toHaveCount(0)
  expect(calls).toHaveLength(2)
})

test('Standort wird erst auf Wunsch angefragt; eine Ablehnung lässt die manuelle Wahl nutzbar', async ({
  page,
}) => {
  await page.clock.install({ time: fixedTime })
  const calls = await mockWeather(page)
  await page.addInitScript(() => {
    Object.defineProperty(window, '__geoCalls', { value: 0, writable: true })
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (
          _success: unknown,
          error: (value: unknown) => void,
        ) => {
          ;(window as unknown as { __geoCalls: number }).__geoCalls++
          error({ code: 1 })
        },
      },
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  expect(
    await page.evaluate(
      () => (window as unknown as { __geoCalls: number }).__geoCalls,
    ),
  ).toBe(0)
  await page
    .getByText('Wetter für deinen Look', { exact: false })
    .first()
    .click()
  await page
    .getByRole('button', { name: 'Standort verwenden', exact: true })
    .click()
  expect(
    await page.evaluate(
      () => (window as unknown as { __geoCalls: number }).__geoCalls,
    ),
  ).toBe(1)
  await expect(page.getByRole('alert')).toContainText('Keine Standortfreigabe')
  expect(calls).toEqual([])
  await page
    .getByRole('textbox', { name: 'Ort manuell suchen', exact: true })
    .fill('Zürich')
  await page.getByRole('button', { name: 'Ort suchen', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Zürich, Zürich, Schweiz', exact: true }),
  ).toBeVisible()
})

test('Kalender verwendet den lokalen iPhone-Tag statt des UTC-Datums', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-03-28T23:30:00Z') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await page.getByRole('button', { name: 'Kalender', exact: true }).click()
  await expect(page.getByLabel('Tag auswählen', { exact: true })).toHaveValue(
    '2026-03-29',
  )
  await page
    .getByRole('button', { name: 'Nächster Monat', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'April 2026', exact: true }),
  ).toBeVisible()
})

test('Freigegebener Standort wird gerundet und erst nach Wetter laden an den Dienst gesendet', async ({
  page,
  context,
}) => {
  await page.clock.install({ time: fixedTime })
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 47.3769123, longitude: 8.5417821 })
  const calls = await mockWeather(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await page
    .getByText('Wetter für deinen Look', { exact: false })
    .first()
    .click()
  expect(calls).toEqual([])
  await page
    .getByRole('button', { name: 'Standort verwenden', exact: true })
    .click()
  await expect(page.getByText('Ausgewählt:', { exact: false })).toContainText(
    'Mein Standort',
  )
  expect(calls).toEqual([])
  await page.getByRole('button', { name: 'Wetter laden', exact: true }).click()
  await expect(
    page.getByText('Regenwahrscheinlichkeit: 80 %', { exact: true }),
  ).toBeVisible()
  expect(calls).toHaveLength(1)
  expect(new URL(calls[0]).searchParams.get('latitude')).toBe('47.38')
  expect(new URL(calls[0]).searchParams.get('longitude')).toBe('8.54')
})

for (const width of [375, 390, 430]) {
  test(`Kalender und Wetter bei ${width}px ohne Überlauf, auch im Dunkelmodus`, async ({
    page,
  }, testInfo) => {
    await page.clock.install({ time: fixedTime })
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Outfits', exact: true }).click()
    await page
      .getByText('Wetter für deinen Look', { exact: false })
      .first()
      .click()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.getByRole('button', { name: 'Kalender', exact: true }).click()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`calendar-${width}.png`),
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Mehr', exact: true }).click()
    await page.getByRole('button', { name: 'Dunkel', exact: true }).click()
    await page.getByRole('button', { name: 'Outfits', exact: true }).click()
    await page.getByRole('button', { name: 'Kalender', exact: true }).click()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`calendar-dark-${width}.png`),
      fullPage: true,
    })
  })
}
