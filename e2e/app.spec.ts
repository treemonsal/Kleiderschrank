import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

async function addGarment(page: Page, name: string, photo = false) {
  await page
    .getByRole('button', { name: /Erstes Stück hinzufügen|^Stück hinzufügen$/ })
    .first()
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  if (photo) {
    await dialog
      .getByLabel('Foto aus Mediathek')
      .setInputFiles(path.resolve('public/icon-192.png'))
    await expect(
      dialog.getByAltText('Vorschau des Kleidungsstücks'),
    ).toBeVisible()
  }
  await dialog.getByLabel('Name', { exact: false }).fill(name)
  await dialog.getByLabel('Marke', { exact: true }).fill('Arket')
  await dialog.getByRole('button', { name: 'Weiss', exact: true }).click()
  await dialog.getByRole('button', { name: 'Sommer', exact: true }).click()
  await dialog
    .getByRole('button', { name: 'Minimalistisch', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: 'Zum Kleiderschrank hinzufügen' })
    .click()
  await expect(dialog).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: `${name} öffnen` }),
  ).toBeVisible()
}

test('Kleidung mit echtem Foto bleibt lokal; Bearbeiten, Suchen, Favorisieren und Löschen funktionieren', async ({
  page,
}) => {
  const errors: string[] = []
  const external: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (
      /^https?:/.test(request.url()) &&
      !request.url().startsWith('http://127.0.0.1:4173')
    )
      external.push(request.url())
  })
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true }),
  ).toBeVisible()
  await addGarment(page, 'Leinenhemd', true)
  await page.reload()
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Leinenhemd öffnen' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Leinenhemd öffnen' }).click()
  let dialog = page.getByRole('dialog')
  await expect(dialog.getByAltText('Leinenhemd')).toBeVisible()
  await expect(dialog.getByText('Sommer', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Bearbeiten', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name', { exact: false }).fill('Sommerhemd')
  await dialog.getByLabel('Notizen').fill('Für warme Tage.\nLeicht und luftig.')
  await dialog.getByRole('button', { name: 'Änderungen speichern' }).click()
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page
    .getByRole('button', { name: 'Sommerhemd: Als Favorit markieren' })
    .click()
  await expect(
    page.getByRole('button', { name: 'Sommerhemd: Favorit entfernen' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('searchbox', { name: 'Kleidung suchen' }).fill('arket')
  await expect(
    page.getByRole('button', { name: 'Sommerhemd öffnen' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Schuhe', exact: true }).click()
  await expect(page.getByText('Hier liegt gerade nichts.')).toBeVisible()
  await page.getByRole('button', { name: 'Filter zurücksetzen' }).click()
  await page.getByRole('button', { name: 'Nur Favoriten' }).click()
  await expect(
    page.getByRole('button', { name: 'Sommerhemd öffnen' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Sommerhemd öffnen' }).click()
  await expect(
    page.getByRole('dialog').getByText('Für warme Tage.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Stück löschen', exact: true }).click()
  await expect(page.getByText('Dieses Stück wirklich löschen?')).toBeVisible()
  await page.getByRole('button', { name: 'Behalten', exact: true }).click()
  await page.getByRole('button', { name: 'Stück löschen', exact: true }).click()
  await page.getByRole('button', { name: 'Endgültig löschen' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
  expect(external).toEqual([])
})

test('Sicherung exportiert Fotos und stellt sie wieder her; fehlerhafte Dateien verändern nichts', async ({
  page,
}) => {
  await page.goto('/')
  await addGarment(page, 'Mein Mantel', true)
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const download = await downloadPromise
  const json = await readFile((await download.path())!, 'utf8')
  const data = JSON.parse(json)
  expect(data.garments).toHaveLength(1)
  expect(data.garments[0].photo).toMatch(/^data:image\/jpeg;base64,/)
  expect(data.garments[0].name).toBe('Mein Mantel')
  // Delete through the real UI, then restore from the downloaded file.
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page.getByRole('button', { name: 'Mein Mantel öffnen' }).click()
  await page.getByRole('button', { name: 'Stück löschen', exact: true }).click()
  await page.getByRole('button', { name: 'Endgültig löschen' }).click()
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  })
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('1 mit Foto', { exact: true })).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(dialog).not.toBeVisible()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"garments":[]}'),
  })
  await expect(page.getByRole('alert')).toContainText(
    'keine gültige MyStyle-Sicherung',
  )
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page.getByRole('button', { name: 'Mein Mantel öffnen' }).click()
  const image = page.getByRole('dialog').getByAltText('Mein Mantel')
  await expect(image).toBeVisible()
  expect(
    await image.evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBe(192)
})

test('Offline-Neustart lädt die installierbare App mit lokalen Fotos', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await addGarment(page, 'Offline-Hemd', true)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          { once: true },
        ),
      )
  })
  const manifest = await page.evaluate(async () =>
    (
      await fetch(
        document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!.href,
      )
    ).json(),
  )
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons).toHaveLength(3)
  await context.setOffline(true)
  await page.reload()
  await expect(
    page.getByText('Du bist offline.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page.getByRole('button', { name: 'Offline-Hemd öffnen' }).click()
  const image = page.getByRole('dialog').getByAltText('Offline-Hemd')
  await expect(image).toBeVisible()
  expect(
    await image.evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0)
})

test('Ungespeicherte Eingaben gehen beim Schliessen nicht unbemerkt verloren', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Erstes Stück hinzufügen' }).click()
  await page.getByLabel('Name', { exact: false }).fill('Noch nicht gespeichert')
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(
    page.getByText('Ungespeicherte Änderungen verwerfen?'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Weiter bearbeiten' }).click()
  await expect(page.getByLabel('Name', { exact: false })).toHaveValue(
    'Noch nicht gespeichert',
  )
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await page.getByRole('button', { name: 'Verwerfen', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true }),
  ).toBeVisible()
})

for (const width of [375, 390, 430]) {
  test(`iPhone-Layout ${width}px, Editorial-Design trotz alter Theme-Vorgabe und Editor ohne horizontalen Überlauf`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ colorScheme: 'light' })
    await page.addInitScript(() =>
      localStorage.setItem('mystyle-theme', 'light'),
    )
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'luxe')
    await expect(
      page.getByRole('heading', { name: 'Dein Look für heute' }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`home-${width}.png`),
      fullPage: true,
    })
    for (const button of await page
      .getByRole('navigation', { name: 'Hauptnavigation' })
      .getByRole('button')
      .all()) {
      const bounds = await button.boundingBox()
      expect(bounds!.width).toBeGreaterThanOrEqual(44)
      expect(bounds!.height).toBeGreaterThanOrEqual(44)
    }
    await page
      .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Einstellungen öffnen', exact: true }),
    ).toHaveAttribute('aria-current', 'page')
    // Settings sit outside the four tabs, so no tab is marked.
    await expect(page.locator('.nav-selection')).toHaveCount(0)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'luxe')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`settings-editorial-${width}.png`),
      fullPage: true,
    })
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'luxe')
    await page.getByRole('button', { name: 'Erstes Stück hinzufügen' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(
      await page
        .getByRole('dialog')
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`editor-editorial-${width}.png`),
    })
  })
}

test('Gedämpfte Beschriftungen und Aktionen bleiben auf Papierflächen lesbar', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true }),
  ).toBeVisible()
  const contrast = async (selectors: string[]) => {
    const results = await page.evaluate((selectors) => {
      const rgb = (color: string) => (color.match(/[\d.]+/g) ?? []).map(Number)
      const luminance = (color: number[]) => {
        const linear = color.slice(0, 3).map((value) => {
          const channel = value / 255
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
      }
      return selectors.flatMap((selector) =>
        [...document.querySelectorAll(selector)].map((node) => {
          let parent: Element | null = node
          let background = [255, 255, 255]
          while (parent) {
            const value = rgb(getComputedStyle(parent).backgroundColor)
            if (value.length === 3 || value[3] === 1) {
              background = value
              break
            }
            parent = parent.parentElement
          }
          const a = luminance(rgb(getComputedStyle(node).color))
          const b = luminance(background)
          return {
            selector,
            ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          }
        }),
      )
    }, selectors)
    expect(results.length).toBeGreaterThanOrEqual(selectors.length)
    for (const result of results)
      expect(result.ratio, result.selector).toBeGreaterThanOrEqual(4.5)
  }
  await contrast([
    '.daily-look header .muted',
    '.daily-look .eyebrow',
    '.daily-add',
    '.home-date',
    '.home-week-strip small',
    '.bottom-nav button',
    '.bottom-nav .nav-numeral',
  ])
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await contrast(['.category-tabs button', '.collection-toolbar'])
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await expect(page.locator('.settings-action small').first()).toBeVisible()
  await contrast(['.settings-action small'])
})
