import { test, expect, type Page, type BrowserContext } from './fixtures'
import { readFile } from 'node:fs/promises'

const host = 'https://prithivmlmods-qwen3-vl-outpost.hf.space'
const stamp = '2026-01-01T00:00:00.000Z'
const serverDraft = 'https://unfinished-server.hf.space'
const codeDraft = 'unfinished-connection-code-for-test'
async function mockProviders(context: BrowserContext) {
  await context.route('https://*.hf.space/**', async (route) => {
    if (route.request().url().endsWith('/gradio_api/info'))
      await route.fulfill({
        json: { named_endpoints: { '/run_router': {}, '/image': {} } },
      })
    else
      await route.fulfill({
        status: 503,
        body: 'Controlled unavailable photo service',
      })
  })
}
async function activate(page: Page) {
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page
    .getByRole('checkbox', { name: /Ich erlaube, neue Kleidungsfotos/ })
    .check()
  await page
    .getByRole('button', { name: 'Kostenlose KI aktivieren', exact: true })
    .click()
  await expect(
    page.getByText('Kostenlose Community-KI ist aktiv', { exact: true }),
  ).toBeVisible()
}
async function serverFields(page: Page) {
  await page.getByText('Eigenen Server verbinden', { exact: true }).click()
  await page.getByLabel('KI-Server', { exact: true }).fill(serverDraft)
  await page.getByLabel('Verbindungscode', { exact: true }).fill(codeDraft)
}
async function seed(page: Page, chat = false) {
  const photo = chat
    ? `data:image/png;base64,${(await readFile('public/icon-192.png')).toString('base64')}`
    : undefined
  const garments = (['Oberteile', 'Hosen', 'Schuhe'] as const).map(
    (category, i) => ({
      id: `sync-${i}`,
      name: ['Hemd', 'Hose', 'Sneaker'][i],
      category,
      color: 'Schwarz',
      brand: '',
      seasons: [],
      styles: [],
      notes: '',
      favorite: false,
      photo,
      createdAt: stamp,
      updatedAt: stamp,
    }),
  )
  const options = {
    occasion: 'Alltag',
    season: 'Alle',
    style: 'Alle',
    includeAccessory: false,
  }
  const data = {
    app: 'MyStyle',
    version: 6,
    garments,
    outfits: [],
    feedback: [],
    preferences: null,
    calendar: [],
    weather: null,
    chat: null,
    ...(chat
      ? {
          chat: {
            id: 'stylist',
            revision: 'sync-history',
            updatedAt: stamp,
            messages: [
              {
                id: 'sync-question',
                role: 'user',
                text: 'Was passt zusammen?',
                createdAt: stamp,
              },
              {
                id: 'sync-answer',
                role: 'assistant',
                text: 'Hemd, Hose und Sneaker bilden einen vollständigen Look.',
                createdAt: stamp,
                look: { garmentIds: garments.map((item) => item.id), options },
              },
            ],
          },
        }
      : {}),
  }
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'sync.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}

test('Geöffnete KI-Einstellungen folgen anderem Fenster und erhalten ungespeicherte Serverfelder', async ({
  page,
  context,
}) => {
  await mockProviders(context)
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await serverFields(page)
  const other = await context.newPage()
  await other.goto('/')
  await activate(other)
  await expect(
    page.getByRole('button', { name: 'Kostenlose KI aktivieren', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Community-KI ausschalten', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('KI-Server', { exact: true })).toHaveValue(
    serverDraft,
  )
  await expect(page.getByLabel('Verbindungscode', { exact: true })).toHaveValue(
    codeDraft,
  )
  await other
    .getByRole('button', { name: 'Community-KI ausschalten', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Kostenlose KI aktivieren', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('checkbox', { name: /Ich erlaube, neue Kleidungsfotos/ }),
  ).not.toBeChecked()
  await expect(page.getByLabel('KI-Server', { exact: true })).toHaveValue(
    serverDraft,
  )
  await expect(page.getByLabel('Verbindungscode', { exact: true })).toHaveValue(
    codeDraft,
  )
})

test('Inline-Aktivierung aktualisiert die darunter gemounteten Einstellungen im selben Dokument', async ({
  page,
  context,
}) => {
  await mockProviders(context)
  await page.goto('/')
  await seed(page, true)
  await serverFields(page)
  await page
    .getByRole('button', { name: 'Mit deinem Stylisten sprechen', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Hemd öffnen', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Bearbeiten', exact: true })
    .click()
  const editor = page.getByRole('dialog')
  await editor
    .getByRole('button', { name: 'Kostenlose Foto-KI einrichten', exact: true })
    .click()
  await editor
    .getByRole('checkbox', { name: /Ich erlaube, neue Kleidungsfotos/ })
    .check()
  await editor
    .getByRole('button', { name: 'Kostenlose KI aktivieren', exact: true })
    .click()
  await expect(
    editor.getByRole('button', {
      name: /Foto erneut analysieren|Foto mit KI vorbereiten/,
    }),
  ).toBeVisible()
  await editor.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(editor).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Community-KI ausschalten', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Kostenlose KI aktivieren', exact: true }),
  ).toHaveCount(0)
  await expect(page.getByLabel('KI-Server', { exact: true })).toHaveValue(
    serverDraft,
  )
  await expect(page.getByLabel('Verbindungscode', { exact: true })).toHaveValue(
    codeDraft,
  )
})

test('Ein externer Verbindungswechsel verhindert die späte eigene Aktivierung und erhält den Entwurf', async ({
  page,
  context,
}) => {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let finished!: () => void
  const replied = new Promise<void>((resolve) => {
    finished = resolve
  })
  await mockProviders(context)
  await context.route(`${serverDraft}/health`, async (route) => {
    await held
    try {
      await route.fulfill({ json: { service: 'mystyle-photo-ai', version: 1 } })
    } catch {
      /* Request intentionally aborted. */
    } finally {
      finished()
    }
  })
  try {
    await page.goto('/')
    await page
      .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
      .click()
    await serverFields(page)
    await page
      .getByRole('checkbox', {
        name: /Neue Fotos nach meinem Start an diesen Server/,
      })
      .check()
    await page
      .getByRole('button', { name: 'Verbinden und aktivieren', exact: true })
      .click()
    await expect(
      page.getByRole('button', {
        name: 'Verbinden und aktivieren',
        exact: true,
      }),
    ).toBeDisabled()
    const other = await context.newPage()
    await other.goto('/')
    await activate(other)
    await expect(
      page.getByText('Kostenlose Community-KI ist aktiv', { exact: true }),
    ).toBeVisible()
    release()
    await replied
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('mystyle-photo-ai') || 'null')?.mode,
      ),
    ).toBe('community')
    await expect(page.getByLabel('KI-Server', { exact: true })).toHaveValue(
      serverDraft,
    )
    await expect(
      page.getByLabel('Verbindungscode', { exact: true }),
    ).toHaveValue(codeDraft)
  } finally {
    release()
  }
})

test('Geöffneter Online-Stylist übernimmt Freigaben ohne Bereichswechsel und ohne automatische Anfrage', async ({
  page,
  context,
}) => {
  await mockProviders(context)
  let comparisons = 0
  context.on('request', (request) => {
    if (request.url() === `${host}/gradio_api/call/run_router`) comparisons++
  })
  await page.goto('/')
  await seed(page)
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
  const compare = page
    .getByRole('region', { name: 'Online-Stylist' })
    .getByRole('button', { name: 'Looks online vergleichen', exact: true })
  await expect(compare).toBeDisabled()
  const other = await context.newPage()
  await other.goto('/')
  await activate(other)
  await expect(compare).toBeEnabled()
  // One switch also unlocks chat and shopping ideas, and turns them off again.
  const consents = () =>
    other.evaluate(() => [
      localStorage.getItem('mystyle-chat-consent'),
      localStorage.getItem('mystyle-shopping-consent'),
    ])
  expect(await consents()).toEqual(['enabled-v1', 'enabled-v1'])
  await other
    .getByRole('button', { name: 'Community-KI ausschalten', exact: true })
    .click()
  await expect(compare).toBeDisabled()
  expect(await consents()).toEqual([null, null])
  expect(comparisons).toBe(0)
})
