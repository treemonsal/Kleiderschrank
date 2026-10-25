import { test, expect } from './fixtures'

// Controlled provider response: verifies honest metadata-only presentation,
// not availability or recommendation quality of the public community service.
test('Online-Beratung ohne Kleidungsfotos behauptet im Ergebnis keine visuelle Analyse', async ({
  page,
}) => {
  const host = 'https://prithivmlmods-qwen3-vl-outpost.hf.space'
  const event = 'd'.repeat(32)
  let sent = 0
  await page.addInitScript(
    ({ host }) => {
      localStorage.setItem(
        'mystyle-photo-ai',
        JSON.stringify({
          mode: 'community',
          url: host,
          code: '',
          enabled: true,
        }),
      )
    },
    { host },
  )
  await page.route(`${host}/gradio_api/call/run_router`, async (route) => {
    sent++
    const body = route.request().postDataJSON() as { data: unknown[] }
    const reference = JSON.parse(
      (body.data[1] as string).split('REFERENCE DATA:\n')[1],
    ) as { garments: { photo: boolean }[] }
    expect(reference.garments.every((item) => !item.photo)).toBe(true)
    await route.fulfill({ json: { event_id: event } })
  })
  await page.route(
    `${host}/gradio_api/call/run_router/${event}`,
    async (route) => {
      await route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([JSON.stringify({ choice: 'L1', reason: 'Die erfassten dunklen Farben ergeben eine ruhige Kombination.', tips: ['Das Hemd einstecken.'], caveat: 'Ohne Kleidungsfotos ist keine visuelle Einschätzung möglich.' })])}\n\n`,
      })
    },
  )
  const stamp = '2026-01-01T00:00:00.000Z'
  const garments = (['Oberteile', 'Hosen', 'Schuhe'] as const).map(
    (category, i) => ({
      id: `metadata-${i}`,
      name: ['Hemd', 'Hose', 'Sneaker'][i],
      category,
      color: 'Schwarz',
      brand: '',
      styles: [],
      seasons: [],
      notes: '',
      favorite: false,
      createdAt: stamp,
      updatedAt: stamp,
    }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'metadata.json',
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
  const stylist = page.getByRole('region', { name: 'Online-Stylist' })
  await expect(stylist).toBeVisible()
  expect(sent).toBe(0)
  await stylist
    .getByRole('button', { name: 'Looks online vergleichen', exact: true })
    .click()
  await expect(
    stylist.getByText('Qwen · Beratung nach Angaben', { exact: true }),
  ).toBeVisible()
  await expect(
    stylist.getByText('Qwen · Visuelle Beratung', { exact: true }),
  ).toHaveCount(0)
  expect(sent).toBe(1)
})
