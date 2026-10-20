import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

for (const width of [320, 375, 430])
  test(`Tages- und Kalenderziele bleiben bei ${width}px mindestens 44 Pixel gross`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/')
    const days = page
      .getByRole('group', { name: 'Tage auswählen', exact: true })
      .getByRole('button')
    await expect(days).toHaveCount(7)
    for (const button of await days.all()) {
      const box = (await button.boundingBox())!
      expect(Number(box.width.toFixed(3))).toBeGreaterThanOrEqual(44)
      expect(Number(box.height.toFixed(3))).toBeGreaterThanOrEqual(44)
    }
    await page
      .getByRole('button', { name: 'Tageskalender öffnen', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const sizes = await page
      .getByRole('dialog')
      .locator('.calendar-grid > button')
      .evaluateAll((buttons) =>
        buttons.map((button) => ({
          width: button.getBoundingClientRect().width,
          height: button.getBoundingClientRect().height,
        })),
      )
    expect(sizes.length).toBeGreaterThanOrEqual(28)
    for (const size of sizes) {
      expect(Number(size.width.toFixed(3))).toBeGreaterThanOrEqual(44)
      expect(Number(size.height.toFixed(3))).toBeGreaterThanOrEqual(44)
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })

async function seed(page: Page) {
  const cutout = `data:image/png;base64,${(await readFile('public/icon-192.png')).toString('base64')}`
  const photo = await page.evaluate(async (data) => {
    const image = new Image()
    image.src = data
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 192
    canvas.getContext('2d')!.drawImage(image, 0, 0)
    return canvas.toDataURL('image/jpeg')
  }, cutout)
  const stamp = '2026-01-01T00:00:00.000Z'
  const garments = Array.from({ length: 10 }, (_, i) => ({
    id: `full-audit-${i}`,
    name: `Fotostück ${i}`,
    category: i < 6 ? 'Oberteile' : i < 8 ? 'Hosen' : 'Schuhe',
    color: 'Weiss',
    brand: '',
    styles: [],
    seasons: [],
    notes: '',
    favorite: false,
    photo,
    cutout,
    createdAt: stamp,
    updatedAt: stamp,
  }))
  const outfit = {
    id: 'full-audit-look',
    name: 'Alltagslook',
    garmentIds: ['full-audit-0', 'full-audit-6', 'full-audit-8'],
    occasion: 'Alltag',
    season: 'Alle',
    style: 'Alle',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
  }
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'audit.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 4,
        garments,
        outfits: [outfit],
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
  await expect(page.getByRole('dialog')).not.toBeVisible()
  return { photo, cutout }
}

test('Bereichswechsel behalten Datum, Suchfilter, Sortierung, Reiter und Scrollposition; erneutes Tippen führt nach oben', async ({
  page,
}) => {
  await page.goto('/')
  await seed(page)
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await page
    .getByRole('button', { name: 'Vorheriger Tag', exact: true })
    .click()
  const day = await page.locator('.daily-look').getAttribute('data-day')
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await page
    .getByRole('searchbox', { name: 'Kleidung suchen' })
    .fill('Fotostück')
  await page.getByRole('button', { name: 'Oberteile', exact: true }).click()
  await page.getByRole('button', { name: 'Sortierung ändern' }).click()
  await page
    .getByRole('combobox', { name: 'Sortierung', exact: true })
    .selectOption('name')
  await page.evaluate(() => window.scrollTo({ top: 350, behavior: 'instant' }))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(350)
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await page
    .getByRole('button', { name: 'Gespeichert (1)', exact: true })
    .click()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  await expect(page.locator('.daily-look')).toHaveAttribute('data-day', day!)
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await expect(
    page.getByRole('searchbox', { name: 'Kleidung suchen' }),
  ).toHaveValue('Fotostück')
  await expect(
    page.getByRole('button', { name: 'Oberteile', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(() => page.evaluate(() => Math.abs(window.scrollY - 350)))
    .toBeLessThan(2)
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.getByRole('button', { name: 'Sortierung ändern' }).click()
  await expect(
    page.getByRole('combobox', { name: 'Sortierung', exact: true }),
  ).toHaveValue('name')
  await page
    .getByRole('button', { name: 'Filter zurücksetzen', exact: true })
    .click()
  await expect(page.locator('.garment-card')).toHaveCount(10)
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Gespeichert (1)', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('Gespeicherte Outfit-Favoriten und Wäschewechsel erhalten echte Fotos und identische Sicherungsdaten', async ({
  page,
}) => {
  await page.goto('/')
  const originals = await seed(page)
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await page
    .getByRole('button', { name: 'Gespeichert (1)', exact: true })
    .click()
  const card = page.locator('.outfit-card')
  for (let i = 0; i < 3; i++) {
    await card
      .getByRole('button', { name: 'Alltagslook: Outfit-Favorit', exact: true })
      .click()
    await expect(
      card.getByRole('button', {
        name: 'Alltagslook: Outfit-Favorit',
        exact: true,
      }),
    ).toHaveAttribute('aria-pressed', String(i % 2 === 0))
    await expect
      .poll(() =>
        card
          .getByRole('img')
          .evaluateAll((images) =>
            images.every(
              (image) => (image as HTMLImageElement).naturalWidth === 192,
            ),
          ),
      )
      .toBe(true)
  }
  await card
    .getByRole('button', { name: 'Fotostück 0 öffnen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'In die Wäsche legen', exact: true })
    .click()
  await expect(
    dialog.getByRole('button', { name: 'Als sauber markieren', exact: true }),
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect
    .poll(() =>
      card
        .getByRole('img')
        .evaluateAll((images) =>
          images.every(
            (image) => (image as HTMLImageElement).naturalWidth === 192,
          ),
        ),
    )
    .toBe(true)
  await expect(card.getByText('In der Wäsche', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const backup = JSON.parse(
    await readFile((await (await downloading).path())!, 'utf8'),
  )
  expect(backup.outfits[0].favorite).toBe(true)
  expect(
    backup.garments.find((item: { id: string }) => item.id === 'full-audit-0')
      .inLaundry,
  ).toBe(true)
  for (const item of backup.garments) {
    expect(item.photo).toBe(originals.photo)
    expect(item.cutout).toBe(originals.cutout)
  }
})

test('Fehlgeschlagene Freistellungsanzeige versucht erneut und fällt ohne Datenänderung aufs Original zurück', async ({
  page,
}) => {
  await page.goto('/')
  await seed(page)
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await expect
    .poll(() =>
      page
        .getByAltText('Fotostück 0', { exact: true })
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBe(192)
  await page.evaluate(() => {
    const create = URL.createObjectURL.bind(URL)
    const revoke = URL.revokeObjectURL.bind(URL)
    let failures = 2
    URL.createObjectURL = (value) => {
      const url = create(value)
      if (
        value instanceof Blob &&
        value.type.startsWith('image/') &&
        failures-- > 0
      )
        revoke(url)
      return url
    }
  })
  await page
    .getByRole('button', { name: 'Fotostück 0 öffnen', exact: true })
    .click()
  const picture = page
    .getByRole('dialog')
    .getByAltText('Fotostück 0', { exact: true })
  await expect
    .poll(() =>
      picture.evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBe(192)
  expect(
    await picture.evaluate(async (image: HTMLImageElement) =>
      (await fetch(image.src)).headers.get('content-type'),
    ),
  ).toBe('image/jpeg')
})

test('Look- und Kalenderentwürfe sind geschützt, der Schliessen-Knopf bleibt im langen Editor sichtbar', async ({
  page,
}) => {
  await page.goto('/')
  await seed(page)
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await page
    .getByRole('button', { name: 'Gespeichert (1)', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Alltagslook bearbeiten', exact: true })
    .click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('Outfit-Name').fill('Noch nicht gespeichert')
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText(
    'Ungespeicherte Änderungen',
  )
  await dialog
    .getByRole('button', { name: 'Weiter bearbeiten', exact: true })
    .click()
  await expect(dialog.getByLabel('Outfit-Name')).toHaveValue(
    'Noch nicht gespeichert',
  )
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await dialog.getByRole('button', { name: 'Verwerfen', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Alltagslook bearbeiten', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Kalender', exact: true }).click()
  await page
    .getByRole('button', { name: 'Look einplanen', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Notiz zum Tag').fill('Unbestätigter Entwurf')
  await page.keyboard.press('Escape')
  await expect(dialog.getByRole('alert')).toContainText(
    'Ungespeicherte Änderungen',
  )
  await dialog
    .getByRole('button', { name: 'Weiter bearbeiten', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: 'Tag speichern', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByText('Unbestätigter Entwurf', { exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Stück hinzufügen', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await dialog.evaluate((node) =>
    node.scrollTo({ top: node.scrollHeight, behavior: 'instant' }),
  )
  await expect(
    dialog.getByRole('button', { name: 'Schliessen', exact: true }),
  ).toBeInViewport()
})

test('Eigener Server deaktiviert keine Community-Freigabe; gesperrter Speicher zeigt einen ehrlichen Fehler', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() =>
    localStorage.setItem(
      'mystyle-photo-ai',
      JSON.stringify({
        mode: 'community',
        url: 'https://prithivmlmods-qwen3-vl-outpost.hf.space',
        code: '',
        enabled: true,
      }),
    ),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await expect(
    page.getByText('Für die Nacht gemacht', { exact: true }),
  ).toHaveCount(0)
  await page.getByText('Eigenen Server verbinden', { exact: true }).click()
  const server = page.getByRole('checkbox', {
    name: /Neue Fotos automatisch an diesen Server/,
  })
  await server.check()
  await server.uncheck()
  expect(
    JSON.parse(
      (await page.evaluate(() => localStorage.getItem('mystyle-photo-ai')))!,
    ),
  ).toMatchObject({ mode: 'community', enabled: true })
  await expect(
    page.getByRole('button', { name: 'Online-KI ausschalten', exact: true }),
  ).toHaveCount(0)
  await page.evaluate(() => {
    Storage.prototype.removeItem = () => {
      throw new DOMException('Blocked', 'SecurityError')
    }
  })
  await page
    .getByRole('button', { name: 'Community-KI ausschalten', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('Freigabe konnte nicht')
  await expect(
    page.getByRole('heading', {
      name: 'Kostenlose Community-KI ist aktiv',
      exact: true,
    }),
  ).toBeVisible()
  expect(errors).toEqual([])
})
