import { test, expect, type Page, type Locator } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const stamp = '2026-01-01T00:00:00.000Z'
const now = '2026-10-15T10:00:00.000Z'
const garments = ['Oberteile', 'Hosen', 'Schuhe', 'Jacken', 'Accessoires'].map(
  (category, index) => ({
    id: `daily-${index}`,
    name: ['Hemd', 'Hose', 'Sneaker', 'Jacke', 'Uhr'][index],
    category,
    color: 'Weiss',
    brand: '',
    seasons: [],
    styles: [],
    notes: '',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
  }),
)
async function importData(page: Page, extra: Record<string, unknown> = {}) {
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'daily.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 4,
        garments,
        outfits: [],
        feedback: [],
        preferences: null,
        calendar: [],
        weather: null,
        ...extra,
      }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Dein Tageslook' })
      .locator('.outfit-piece')
      .first(),
  ).toBeVisible()
}
async function forecast(page: Page, fail: () => boolean = () => false) {
  const calls: string[] = []
  await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            name: 'Zürich',
            country: 'Schweiz',
            latitude: 47.3769,
            longitude: 8.5418,
          },
        ],
      },
    }),
  )
  await page.route('https://api.open-meteo.com/**', (route) => {
    calls.push(route.request().url())
    return fail()
      ? route.fulfill({ status: 503, body: 'Unavailable' })
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
              temperature_2m_min: [5, 6],
              temperature_2m_max: [9, 12],
              precipitation_probability_max: [80, 30],
              weather_code: [61, 3],
            },
          },
        })
  })
  return calls
}
async function pickWeather(page: Page) {
  await page
    .getByRole('button', { name: 'Wetter anzeigen und Ort ändern' })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Ort manuell suchen', { exact: true }).fill('Zürich')
  await dialog.getByRole('button', { name: 'Ort suchen', exact: true }).click()
  await dialog
    .getByRole('button', { name: 'Zürich, Schweiz', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByText('Wetter für Zürich, Schweiz gespeichert.', { exact: true }),
  ).toBeVisible()
}
async function swipe(target: Locator, dx: number, dy = 0, startX = 195) {
  await target.evaluate(
    (node, { dx, dy, startX }) => {
      const point = (x: number, y: number) =>
        new Touch({ identifier: 1, target: node, clientX: x, clientY: y })
      node.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          touches: [point(startX, 300)],
        }),
      )
      node.dispatchEvent(
        new TouchEvent('touchmove', {
          bubbles: true,
          touches: [point(startX + dx, 300 + dy)],
        }),
      )
      node.dispatchEvent(
        new TouchEvent('touchend', {
          bubbles: true,
          touches: [],
          changedTouches: [point(startX + dx, 300 + dy)],
        }),
      )
    },
    { dx, dy, startX },
  )
}
test.use({ timezoneId: 'Europe/Zurich' })
test('Tageslook erscheint ohne Klick, bleibt beim Neustart stabil und ist speicherbar', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date(now) })
  const external: string[] = []
  page.on('request', (r) => {
    if (r.url().startsWith('https://')) external.push(r.url())
  })
  await page.goto('/')
  await importData(page)
  const look = page.getByRole('region', { name: 'Dein Tageslook' })
  await expect(
    look.getByRole('heading', { name: 'Dein Look für heute' }),
  ).toBeVisible()
  for (const name of ['Hemd', 'Hose', 'Sneaker', 'Jacke'])
    await expect(
      look.getByRole('button', { name: `${name} öffnen`, exact: true }),
    ).toBeVisible()
  await expect(page.getByText('Dein Moment.', { exact: true })).toHaveCount(0)
  const before = await look.locator('.outfit-piece').allTextContents()
  await page.reload()
  await expect(look.locator('.outfit-piece')).toHaveCount(4)
  expect(await look.locator('.outfit-piece').allTextContents()).toEqual(before)
  await look
    .getByRole('button', { name: 'Look speichern', exact: true })
    .click()
  await expect(
    look.getByRole('button', { name: 'Gespeichert', exact: true }),
  ).toBeDisabled()
  expect(external).toEqual([])
  await page.screenshot({
    path: info.outputPath('daily-home-390.png'),
    fullPage: true,
  })
})
test('Anlass, Saison, Stil und Accessoire bleiben nach Navigation, Neustart und Vorlieben-Speichern erhalten und stehen im Backup', async ({
  page,
}) => {
  await page.goto('/')
  await importData(page)
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Anlass', exact: true })
    .selectOption('Büro')
  await page
    .getByRole('combobox', { name: 'Saison', exact: true })
    .selectOption('Winter')
  await page
    .getByRole('combobox', { name: 'Gewünschter Stil', exact: true })
    .selectOption('Minimalistisch')
  await page
    .getByRole('checkbox', {
      name: 'Ein Accessoire ergänzen, wenn eines passt',
    })
    .check()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await expect(
    page.getByRole('combobox', { name: 'Anlass', exact: true }),
  ).toHaveValue('Büro')
  await expect(
    page.getByRole('combobox', { name: 'Saison', exact: true }),
  ).toHaveValue('Winter')
  await expect(
    page.getByRole('combobox', { name: 'Gewünschter Stil', exact: true }),
  ).toHaveValue('Minimalistisch')
  await expect(
    page.getByRole('checkbox', {
      name: 'Ein Accessoire ergänzen, wenn eines passt',
    }),
  ).toBeChecked()
  await page.getByRole('button', { name: 'Stilvorlieben bearbeiten' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Vorlieben speichern' })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(
    page.getByRole('checkbox', {
      name: 'Ein Accessoire ergänzen, wenn eines passt',
    }),
  ).toBeChecked()
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const data = JSON.parse(
    await readFile((await (await downloadPromise).path())!, 'utf8'),
  )
  expect(data.preferences.outfitOptions).toEqual({
    occasion: 'Büro',
    season: 'Winter',
    style: 'Minimalistisch',
    includeAccessory: true,
  })
})
test('Wetterauswahl auf der Startseite speichert und schliesst, Einstellung bleibt erhalten, alte Vorhersage wird sichtbar als veraltet markiert', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date(now) })
  let fail = false
  const calls = await forecast(page, () => fail)
  await page.goto('/')
  await importData(page)
  expect(calls).toEqual([])
  await pickWeather(page)
  await expect(page.locator('.home-weather')).toContainText('5–9 °C · Regen')
  await expect(page.locator('.home-weather .lucide-cloud-rain')).toBeVisible()
  await expect(page.locator('.daily-context')).toContainText(
    'Wetter berücksichtigt',
  )
  await page.screenshot({
    path: info.outputPath('daily-weather-390.png'),
    fullPage: true,
  })
  await page.reload()
  await expect(page.locator('.home-weather')).toContainText('Zürich, Schweiz')
  expect(calls).toHaveLength(1)
  await page
    .getByRole('button', { name: 'Wetter anzeigen und Ort ändern' })
    .click()
  await page
    .getByRole('checkbox', {
      name: 'Wetter für Vorschläge verwenden',
      exact: true,
    })
    .uncheck()
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await page.reload()
  await page
    .getByRole('button', { name: 'Wetter anzeigen und Ort ändern' })
    .click()
  await expect(
    page.getByRole('checkbox', {
      name: 'Wetter für Vorschläge verwenden',
      exact: true,
    }),
  ).not.toBeChecked()
  await page
    .getByRole('checkbox', {
      name: 'Wetter für Vorschläge verwenden',
      exact: true,
    })
    .check()
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  fail = true
  await page.clock.fastForward(7 * 3600000)
  await expect.poll(() => calls.length).toBe(2)
  await expect(page.locator('.home-weather')).toContainText(
    'Gespeichert · veraltet',
  )
  await page.clock.fastForward(5 * 60000)
  expect(calls).toHaveLength(2) // no automatic retry loop
})
test('Wischen wechselt Tage auf Heute und lässt Tabs, vertikales Scrollen, Eingaben und Dialoge in Ruhe', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(now) })
  await page.goto('/')
  const look = page.getByRole('region', { name: 'Dein Tageslook' })
  await swipe(page.locator('.daily-look header'), 120)
  await expect(look).toHaveAttribute('data-day', '2026-10-14')
  await expect(
    page.getByRole('button', { name: 'Heute', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByText('Für diesen Tag ist kein Look vermerkt.', { exact: true }),
  ).toBeVisible()
  await swipe(page.locator('.daily-look header'), -120, 180)
  await expect(look).toHaveAttribute('data-day', '2026-10-14')
  await swipe(page.locator('.daily-look header'), -120)
  await expect(look).toHaveAttribute('data-day', '2026-10-15')
  await swipe(page.locator('.daily-look header'), -120)
  await expect(look).toHaveAttribute('data-day', '2026-10-16')
  await expect(
    page.getByText('Für diesen Tag ist noch kein Look eingeplant.', {
      exact: true,
    }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Zu heute', exact: true }).click()
  await page
    .getByRole('button', { name: 'Tageskalender öffnen', exact: true })
    .click()
  await swipe(page.locator('.home-view'), 120)
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(look).toHaveAttribute('data-day', '2026-10-15')
  await swipe(page.getByRole('dialog').getByLabel('Direkt zu einem Tag'), 120)
  await expect(look).toHaveAttribute('data-day', '2026-10-15')
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await swipe(page.locator('.daily-look header'), 120, 0, 8)
  await expect(look).toHaveAttribute('data-day', '2026-10-15')
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await swipe(page.locator('.page-heading'), -120)
  await expect(
    page.getByRole('button', { name: 'Kleiderschrank', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
})

test('Native Touch-Geste im mobilen Chromium wechselt den Tag und behält die Startseite', async ({
  page,
  context,
}) => {
  await page.clock.install({ time: new Date(now) })
  await page.goto('/')
  const bounds = await page.locator('.daily-look header').boundingBox()
  const y = bounds!.y + 20
  const session = await context.newCDPSession(page)
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 280, y }],
  })
  for (let index = 1; index <= 10; index++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 280 - index * 15, y }],
    })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await expect(
    page.getByRole('region', { name: 'Dein Tageslook' }),
  ).toHaveAttribute('data-day', '2026-10-16')
  await expect(
    page.getByRole('button', { name: 'Heute', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
})

test('Native Tagesgeste über einem Outfitfoto öffnet keine Kleidungsdetails', async ({
  page,
  context,
}) => {
  await page.clock.install({ time: new Date(now) })
  await page.goto('/')
  const session = await context.newCDPSession(page)
  // Swiping a garment photo also navigates days, without opening its detail.
  const photoData = (await readFile('public/icon-192.png')).toString('base64')
  await importData(page, {
    garments: garments.map((item) => ({
      ...item,
      photo: `data:image/png;base64,${photoData}`,
    })),
  })
  await page
    .getByRole('button', { name: 'Hinweis schliessen', exact: true })
    .click()
  const photo = page
    .getByRole('region', { name: 'Dein Tageslook' })
    .locator('.outfit-piece')
    .first()
  await photo.scrollIntoViewIfNeeded()
  const boundsPhoto = (await photo.boundingBox())!,
    x = boundsPhoto.x + boundsPhoto.width - 10,
    photoY = boundsPhoto.y + 30
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: photoY }],
  })
  for (let index = 1; index <= 10; index++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - index * 10, y: photoY }],
    })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await expect(
    page.getByRole('region', { name: 'Dein Tageslook' }),
  ).toHaveAttribute('data-day', '2026-10-16')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('Schliessen während Standortfreigabe verhindert späten Wetterabruf und irreführende Speicherung', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (success: (position: unknown) => void) => {
          ;(
            window as unknown as { finishLocation: () => void }
          ).finishLocation = () =>
            success({ coords: { latitude: 47.38, longitude: 8.54 } })
        },
      },
    }),
  )
  const calls = await forecast(page)
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Wetter anzeigen und Ort ändern' })
    .click()
  await page
    .getByRole('button', { name: 'Standort verwenden', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Wetterauswahl schliessen', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.evaluate(() =>
    (window as unknown as { finishLocation: () => void }).finishLocation(),
  )
  await expect(page.locator('.home-weather')).toContainText('Ort auswählen')
  expect(calls).toHaveLength(0)
  await expect(
    page.getByText('Wetter für Mein Standort gespeichert.', { exact: true }),
  ).toHaveCount(0)
})
test('Vergessen eines Orts wird von einer verspäteten automatischen Aktualisierung nicht rückgängig gemacht', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(now) })
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let calls = 0
  await page.route('https://api.open-meteo.com/**', async (route) => {
    calls++
    await gate
    await route
      .fulfill({
        json: {
          timezone: 'Europe/Zurich',
          daily_units: {
            temperature_2m_min: '°C',
            temperature_2m_max: '°C',
            precipitation_probability_max: '%',
          },
          daily: {
            time: ['2026-10-15'],
            temperature_2m_min: [5],
            temperature_2m_max: [9],
            precipitation_probability_max: [80],
            weather_code: [61],
          },
        },
      })
      .catch(() => {})
  })
  await page.goto('/')
  const old = '2026-10-15T01:00:00.000Z'
  await importData(page, {
    weather: {
      id: 'local',
      location: { name: 'Zürich', latitude: 47.38, longitude: 8.54 },
      report: {
        fetchedAt: old,
        timezone: 'Europe/Zurich',
        days: [{ day: '2026-10-15', min: 5, max: 9, rain: 80, code: 61 }],
      },
      updatedAt: old,
    },
  })
  await expect.poll(() => calls).toBe(1)
  await page
    .getByRole('button', { name: 'Wetter anzeigen und Ort ändern' })
    .click()
  await page
    .getByRole('button', { name: 'Ort und Wetter vergessen', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  release()
  await page.reload()
  await expect(page.locator('.home-weather')).toContainText('Ort auswählen')
  expect(calls).toBe(1)
})

for (const width of [375, 390, 430]) {
  test(`Tragetag und Farbringe bei ${width}px: bestätigen, zurückblättern und Kalenderdatum wählen`, async ({
    page,
  }, info) => {
    await page.clock.install({ time: new Date(now) })
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    await importData(page, {
      garments: garments.map((item, index) => ({
        ...item,
        color: ['Weiss', 'Blau', 'Schwarz', 'Beige', 'Grau'][index],
      })),
    })
    const look = page.getByRole('region', { name: 'Dein Tageslook' })
    await look
      .getByRole('button', { name: 'Heute getragen', exact: true })
      .click()
    await expect(
      look.getByRole('button', { name: 'Getragen', exact: true }),
    ).toBeDisabled()
    const ring = page
      .getByRole('group', { name: 'Tage auswählen' })
      .getByRole('button', {
        name: /15. Oktober 2026.*Getragen.*Farben: Weiss, Blau, Schwarz, Beige/,
      })
    await expect(ring).toBeVisible()
    await expect(ring.locator('.day-color-ring.has-colors')).toBeVisible()
    await page.reload()
    await expect(
      look.getByRole('button', { name: 'Getragen', exact: true }),
    ).toBeDisabled()
    await page
      .getByRole('button', { name: 'Vorheriger Tag', exact: true })
      .click()
    await expect(
      page.getByText('Für diesen Tag ist kein Look vermerkt.', { exact: true }),
    ).toBeVisible()
    await expect(look.locator('.outfit-piece')).toHaveCount(0)
    await page
      .getByRole('button', { name: 'Tageskalender öffnen', exact: true })
      .click()
    const dialog = page.getByRole('dialog')
    await expect(
      dialog
        .getByRole('button', { name: /15. Oktober 2026.*Getragen/ })
        .locator('.day-color-ring.has-colors'),
    ).toBeVisible()
    await dialog.getByLabel('Direkt zu einem Tag').fill('2026-10-15')
    await expect(dialog).not.toBeVisible()
    await expect(
      look.getByRole('button', { name: 'Getragen', exact: true }),
    ).toBeDisabled()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: info.outputPath(`day-rings-${width}.png`),
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Outfits', exact: true }).click()
    await page.getByRole('button', { name: 'Kalender', exact: true }).click()
    await expect(
      page
        .getByRole('button', { name: /15. Oktober 2026.*Getragen/ })
        .locator('.day-color-ring.has-colors'),
    ).toBeVisible()
  })
}

test('Vergangene Pläne und zukünftige Looks bleiben klar von bestätigter Historie getrennt', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(now) })
  await page.goto('/')
  const outfits = [
    {
      id: 'planned-look',
      name: 'Mein Plan',
      garmentIds: ['daily-0', 'daily-1', 'daily-2'],
      occasion: 'Alltag',
      season: 'Alle',
      style: 'Alle',
      favorite: false,
      createdAt: stamp,
      updatedAt: stamp,
    },
  ]
  const calendar = ['2026-10-14', '2026-10-16'].map((day) => ({
    id: day,
    day,
    outfitId: 'planned-look',
    status: 'planned',
    note: 'Termin',
    createdAt: stamp,
    updatedAt: stamp,
  }))
  await importData(page, { outfits, calendar })
  await swipe(page.locator('.daily-look header'), 120)
  const look = page.getByRole('region', { name: 'Dein Tageslook' })
  await expect(
    look.getByText('Geplant · nicht bestätigt', { exact: true }),
  ).toBeVisible()
  await expect(look.getByText('Termin', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('group', { name: 'Tage auswählen' }).locator('.has-colors'),
  ).toHaveCount(0)
  await look
    .getByRole('button', { name: 'Als getragen bestätigen', exact: true })
    .click()
  await expect(
    look.getByText('Bestätigt getragen', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Nächster Tag', exact: true }).click()
  await page.getByRole('button', { name: 'Nächster Tag', exact: true }).click()
  await expect(look.getByText('Eingeplant', { exact: true })).toBeVisible()
  await expect(look.getByRole('button', { name: /getragen/i })).toHaveCount(0)
})

test('Ein Teil tauschen bleibt nach Neustart erhalten, der Rest bleibt gleich und alles kommt in die Sicherung', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date(now) })
  const external: string[] = []
  page.on('request', (request) => {
    if (request.url().startsWith('https://')) external.push(request.url())
  })
  await page.goto('/')
  const photo = `data:image/png;base64,${(await readFile('public/icon-192.png')).toString('base64')}`
  const extraTop = { ...garments[0], id: 'other-top', name: 'Pullover' }
  await importData(page, {
    garments: [...garments, { ...extraTop, photo, cutout: photo }],
  })
  const look = page.getByRole('region', { name: 'Dein Tageslook' })
  const before = await look
    .locator('.outfit-piece > span:first-of-type')
    .allTextContents()
  const oldTop = before[0],
    newTop = oldTop === 'Hemd' ? 'Pullover' : 'Hemd'
  await look
    .getByRole('button', { name: `${oldTop} austauschen`, exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('button', { name: `${newTop} übernehmen`, exact: true }),
  ).toBeVisible()
  await page.screenshot({
    path: info.outputPath('piece-swap-390.png'),
    fullPage: true,
  })
  await dialog
    .getByRole('button', { name: `${newTop} übernehmen`, exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  await expect(
    look.getByRole('button', { name: `${newTop} öffnen`, exact: true }),
  ).toBeVisible()
  expect(
    await look.locator('.outfit-piece > span:first-of-type').allTextContents(),
  ).toEqual([newTop, ...before.slice(1)])
  await page.reload()
  await expect(
    look.getByRole('button', { name: `${newTop} öffnen`, exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const data = JSON.parse(
    await readFile((await (await download).path())!, 'utf8'),
  )
  expect(data.preferences.dailySelection.garmentIds).toContain(
    newTop === 'Hemd' ? 'daily-0' : 'other-top',
  )
  expect(
    data.garments.find((item: { id: string }) => item.id === 'other-top').photo,
  ).toBe(photo)
  expect(
    data.garments.find((item: { id: string }) => item.id === 'other-top')
      .cutout,
  ).toBe(photo)
  expect(external).toEqual([])
  expect(data.preferences.backupReminder.lastExportedRevision).toMatch(
    /^[a-f0-9]{16}$/,
  )
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await look
    .getByRole('button', { name: 'Heute getragen', exact: true })
    .click()
  await expect(look.locator('.piece-swap')).toHaveCount(0)
})

test('Wäsche-Status übersteht Neustart und Bearbeitung, filtert Vorschläge und lässt sich wieder aufheben', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date(now) })
  await page.setViewportSize({ width: 375, height: 844 })
  await page.goto('/')
  await importData(page)
  await page
    .getByRole('region', { name: 'Dein Tageslook' })
    .getByRole('button', { name: 'Hemd öffnen', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'In die Wäsche legen', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Als sauber markieren', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Dein Tageslook' })
      .getByRole('button', { name: 'Hemd öffnen', exact: true }),
  ).toHaveCount(0)
  await page.reload()
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await page.getByRole('button', { name: 'Nur Wäsche', exact: true }).click()
  await expect(page.locator('.garment-card')).toHaveCount(1)
  await expect(page.locator('.garment-card')).toContainText('Hemd')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: info.outputPath('laundry-375.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Hemd öffnen', exact: true }).click()
  await page.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  await expect(
    page.getByRole('checkbox', {
      name: 'In der Wäsche · aus neuen Vorschlägen ausblenden',
      exact: true,
    }),
  ).toBeChecked()
  await page
    .getByRole('button', { name: 'Änderungen speichern', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Hemd öffnen', exact: true }).click()
  await page
    .getByRole('button', { name: 'Als sauber markieren', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'In die Wäsche legen', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(page.locator('.garment-card')).toHaveCount(0)
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await expect(
    page
      .getByRole('region', { name: 'Dein Tageslook' })
      .getByRole('button', { name: 'Hemd öffnen', exact: true }),
  ).toBeVisible()
})

test('Sicherungserinnerung lässt sich pausieren und dauerhaft ausschalten; unveränderter Export bleibt ruhig', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date(now) })
  await page.goto('/')
  await importData(page, {
    preferences: {
      id: 'personal',
      styles: [],
      colors: [],
      updatedAt: stamp,
      backupReminder: { firstSeenAt: stamp },
    },
  })
  const reminder = page.getByRole('complementary', {
    name: 'Sicherungserinnerung',
  })
  await expect(reminder).toBeVisible()
  await page.screenshot({
    path: info.outputPath('backup-reminder-390.png'),
    fullPage: true,
  })
  await reminder
    .getByRole('button', { name: 'In einer Woche', exact: true })
    .click()
  await expect(reminder).toHaveCount(0)
  await page.reload()
  await expect(reminder).toHaveCount(0)
  await page.clock.fastForward(7 * 86400000 + 1000)
  await expect(reminder).toBeVisible()
  await reminder
    .getByRole('button', { name: 'Sicherung öffnen', exact: true })
    .click()
  const setting = page.getByRole('checkbox', {
    name: 'An Sicherungen erinnern',
    exact: true,
  })
  await expect(setting).toBeVisible()
  await expect(setting).toBeInViewport()
  await setting.uncheck()
  await expect(setting).toBeEnabled()
  await page.reload()
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await expect(setting).not.toBeChecked()
  await setting.check()
  await expect(setting).toBeChecked()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  await download
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await page.clock.fastForward(8 * 86400000)
  await expect(reminder).toHaveCount(0)
})

test('Tageskarte folgt dem Finger, federt bei kurzer Geste zurück und manuelle Auswahl stoppt einen ausstehenden Wechsel', async ({
  page,
}) => {
  await page.goto('/')
  const look = page.getByRole('region', { name: 'Dein Tageslook' })
  const before = await look.getAttribute('data-day')
  async function touch(type: string, x: number) {
    await page.locator('.daily-look header').evaluate(
      (node, { type, x }) => {
        const t = new Touch({
          identifier: 3,
          target: node,
          clientX: x,
          clientY: 330,
        })
        node.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            touches: type === 'touchend' || type === 'touchcancel' ? [] : [t],
            changedTouches: [t],
          }),
        )
      },
      { type, x },
    )
  }
  await touch('touchstart', 190)
  await touch('touchmove', 230)
  expect(
    await look.evaluate((node) => getComputedStyle(node).transform),
  ).toContain('40')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await touch('touchend', 230)
  await expect(look).toHaveAttribute('data-day', before!)
  await expect
    .poll(() => look.evaluate((node) => getComputedStyle(node).transform))
    .toBe('none')
  await touch('touchstart', 190)
  await touch('touchmove', 300)
  // End the gesture and navigate manually within the same event loop, before the settling timer.
  await page.locator('.daily-look header').evaluate((node) => {
    const t = new Touch({
      identifier: 3,
      target: node,
      clientX: 300,
      clientY: 330,
    })
    node.dispatchEvent(
      new TouchEvent('touchend', { bubbles: true, changedTouches: [t] }),
    )
    document
      .querySelector<HTMLButtonElement>('[aria-label="Nächster Tag"]')!
      .click()
  })
  const next = await look.getAttribute('data-day')
  expect(next).not.toBe(before)
  await expect
    .poll(() => look.evaluate((node) => getComputedStyle(node).transform))
    .toBe('none')
  await expect(look).toHaveAttribute('data-day', next!)
})

test('Reduzierte Bewegung wechselt Tage ohne Verschieben der Karte', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install({ time: new Date(now) })
  await page.goto('/')
  await swipe(page.locator('.daily-look header'), 120)
  const look = page.getByRole('region', { name: 'Dein Tageslook' })
  await expect(look).toHaveAttribute('data-day', '2026-10-14')
  expect(await look.evaluate((node) => getComputedStyle(node).transform)).toBe(
    'none',
  )
})
