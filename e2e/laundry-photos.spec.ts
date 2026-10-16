import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function wardrobe(page: Page) {
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
  const garments = ['Oberteile', 'Hosen', 'Schuhe'].map((category, index) => ({
    id: `laundry-photo-${index}`,
    name: ['Fotohemd', 'Hose', 'Sneaker'][index],
    category,
    color: 'Weiss',
    styles: [],
    seasons: [],
    brand: '',
    notes: '',
    favorite: false,
    photo,
    cutout,
    createdAt: stamp,
    updatedAt: stamp,
  }))
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'photos.json',
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
      }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  return { photo, cutout }
}

test('Statuswechsel widerruft keine noch angezeigten Bildadressen und erhält beide Fotovarianten', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as typeof window & {
      activePhotoRevocations: string[]
      livePhotoUrls: Set<string>
    }
    state.activePhotoRevocations = []
    state.livePhotoUrls = new Set()
    const create = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (value) => {
      const url = create(value)
      state.livePhotoUrls.add(url)
      return url
    }
    const revoke = URL.revokeObjectURL.bind(URL)
    URL.revokeObjectURL = (url) => {
      if (
        [...document.images].some(
          (image) => image.isConnected && image.getAttribute('src') === url,
        )
      )
        state.activePhotoRevocations.push('connected image')
      revoke(url)
      state.livePhotoUrls.delete(url)
    }
  })
  await page.goto('/')
  const original = await wardrobe(page)
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Fotohemd öffnen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect
    .poll(() =>
      dialog
        .getByAltText('Fotohemd', { exact: true })
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(192)
  await page.evaluate(() => {
    ;(
      window as typeof window & { activePhotoRevocations: string[] }
    ).activePhotoRevocations = []
  })
  for (let round = 0; round < 3; round++) {
    await dialog
      .getByRole('button', { name: 'In die Wäsche legen', exact: true })
      .click()
    await expect(
      dialog.getByRole('button', { name: 'Als sauber markieren', exact: true }),
    ).toBeVisible()
    await expect
      .poll(() =>
        dialog
          .getByAltText('Fotohemd', { exact: true })
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBe(192)
    await dialog
      .getByRole('button', { name: 'Als sauber markieren', exact: true })
      .click()
    await expect(
      dialog.getByRole('button', { name: 'In die Wäsche legen', exact: true }),
    ).toBeVisible()
  }
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { activePhotoRevocations: string[] })
          .activePhotoRevocations,
    ),
  ).toEqual([])
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { livePhotoUrls: Set<string> })
            .livePhotoUrls.size,
      ),
    )
    .toBe(0)
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const backup = JSON.parse(
    await readFile((await (await downloading).path())!, 'utf8'),
  )
  const item = backup.garments.find(
    (item: { id: string }) => item.id === 'laundry-photo-0',
  )
  expect(item.photo).toBe(original.photo)
  expect(item.cutout).toBe(original.cutout)
  expect(item.inLaundry).toBe(false)
})

test('Im Kleiderschrank bleibt das Wäschefoto sichtbar und nach Saubermarkieren erhalten', async ({
  page,
}) => {
  await page.goto('/')
  await wardrobe(page)
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Fotohemd öffnen', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'In die Wäsche legen', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Schliessen', exact: true })
    .click()
  await page.reload()
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await page.getByRole('button', { name: 'Nur Wäsche', exact: true }).click()
  const card = page.locator('.garment-card').filter({ hasText: 'Fotohemd' })
  await expect
    .poll(() =>
      card
        .getByAltText('Fotohemd', { exact: true })
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(192)
  await card
    .getByRole('button', { name: 'Fotohemd öffnen', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Als sauber markieren', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Schliessen', exact: true })
    .click()
  await page.getByRole('button', { name: 'Nur Wäsche', exact: true }).click()
  await expect
    .poll(() =>
      card
        .getByAltText('Fotohemd', { exact: true })
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(192)
  await page.reload()
  await page
    .getByRole('button', { name: 'Kleiderschrank', exact: true })
    .click()
  await expect
    .poll(() =>
      card
        .getByAltText('Fotohemd', { exact: true })
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(192)
})
