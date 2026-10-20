import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const stamp = '2026-01-01T00:00:00.000Z'
const profile = {
  version: 1,
  status: 'completed',
  colorMood: 'balanced',
  variety: 'balanced',
  usualOccasion: 'Alltag',
  avoidColors: [],
}
const garments = (['Oberteile', 'Hosen', 'Schuhe'] as const).map(
  (category, i) => ({
    id: `interview-${i}`,
    name: ['Hemd', 'Hose', 'Sneaker'][i],
    category,
    color: 'Weiss',
    brand: '',
    styles: [],
    seasons: [],
    notes: '',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
  }),
)
async function seed(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'interview.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 5,
        garments,
        outfits: [],
        feedback: [],
        calendar: [],
        weather: null,
        chat: null,
        preferences: {
          id: 'personal',
          styles: [],
          colors: [],
          styleProfile: profile,
          updatedAt: stamp,
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
  await expect(page.locator('.inbox-dot')).toBeVisible()
}
async function open(page: Page) {
  await page
    .getByRole('button', { name: 'Mit deinem Stylisten sprechen', exact: true })
    .click()
  const panel = page.getByRole('region', { name: 'Freiwilliges Stilgespräch' })
  await expect(panel).toBeVisible()
  return panel
}
async function close(page: Page) {
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
}
async function exportData(page: Page) {
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  return JSON.parse(await readFile((await (await download).path())!, 'utf8'))
}
test('Nach dem kurzen Stilcheck erscheint eine freiwillige Einladung; offline beantworten, überspringen und nach Neustart fortsetzen', async ({
  page,
  context,
}) => {
  const external: string[] = []
  page.on('request', (r) => {
    if (r.url().startsWith('https://')) external.push(r.url())
  })
  await seed(page)
  const panel = await open(page)
  await expect(page.locator('.inbox-dot')).toHaveCount(0)
  await expect(
    page.getByRole('button', {
      name: 'Kostenlosen Chat aktivieren',
      exact: true,
    }),
  ).toBeVisible()
  await context.setOffline(true)
  await panel
    .getByRole('button', { name: 'Stilgespräch starten', exact: true })
    .click()
  await panel
    .getByRole('button', { name: 'Klar & elegant', exact: true })
    .click()
  await panel
    .getByRole('button', { name: 'Antwort speichern', exact: true })
    .click()
  await expect(
    panel.getByRole('heading', {
      name: 'In welchen Schnitten fühlst du dich wohl?',
    }),
  ).toBeVisible()
  await panel
    .getByRole('button', { name: 'Frage überspringen', exact: true })
    .click()
  await panel
    .getByRole('button', { name: 'Viel zu Fuss & unterwegs', exact: true })
    .click()
  await panel
    .getByRole('button', { name: 'Antwort speichern', exact: true })
    .click()
  await panel
    .getByRole('button', { name: 'Später weiter', exact: true })
    .click()
  await close(page)
  await page.reload()
  await expect(page.locator('.inbox-dot')).toHaveCount(0)
  const again = await open(page)
  await again
    .getByRole('button', { name: 'Stilgespräch fortsetzen', exact: true })
    .click()
  await expect(
    again.getByRole('heading', {
      name: 'Wie empfindest du Temperaturen?',
      exact: true,
    }),
  ).toBeVisible()
  await close(page)
  await context.setOffline(false)
  const data = await exportData(page)
  expect(data.version).toBe(7)
  expect(data.preferences.styleInterview.answers).toEqual({
    focus: 'Klar & elegant',
    day: 'Viel zu Fuss & unterwegs',
  })
  expect(data.preferences.styleInterview.skipped).toEqual(['fit'])
  expect(data.preferences.styleProfile).toEqual(profile)
  expect(external).toEqual([])
})
test('Einladung dauerhaft ausblenden lässt den Chat und einen freiwilligen Neustart erreichbar', async ({
  page,
}) => {
  await seed(page)
  const panel = await open(page)
  await panel
    .getByRole('button', { name: 'Keine weiteren Fragen', exact: true })
    .click()
  await close(page)
  await page.reload()
  await expect(page.locator('.inbox-dot')).toHaveCount(0)
  const again = await open(page)
  await expect(
    again.getByRole('heading', {
      name: 'Mehr als drei kurze Antworten.',
      exact: true,
    }),
  ).toHaveCount(0)
  await again
    .getByRole('button', { name: 'Stilgespräch starten', exact: true })
    .click()
  await expect(
    again.getByRole('heading', {
      name: 'Welche Seite deines Stils möchtest du stärker zeigen?',
      exact: true,
    }),
  ).toBeVisible()
})
test('Früh abschliessen, offene Antworten später ergänzen und vertiefte Angaben löschen', async ({
  page,
}) => {
  await seed(page)
  const panel = await open(page)
  await panel
    .getByRole('button', { name: 'Stilgespräch starten', exact: true })
    .click()
  await panel
    .getByRole('button', { name: 'Klar & elegant', exact: true })
    .click()
  await panel
    .getByRole('button', { name: 'Antwort speichern', exact: true })
    .click()
  await panel
    .getByRole('button', { name: 'Stilgespräch abschliessen', exact: true })
    .click()
  await panel
    .getByRole('button', { name: 'Antworten ansehen & ändern', exact: true })
    .click()
  await panel
    .getByRole('button', {
      name: 'Was ziehst du ungern an? ändern',
      exact: true,
    })
    .click()
  await panel
    .getByRole('textbox', { name: 'Deine Antwort (freiwillig)' })
    .fill('Keine kratzigen Stoffe')
  await panel
    .getByRole('button', { name: 'Antwort speichern', exact: true })
    .click()
  await expect(
    panel.getByText('Keine kratzigen Stoffe', { exact: true }),
  ).toBeVisible()
  await panel
    .getByRole('button', { name: 'Vertiefte Antworten löschen', exact: true })
    .click()
  await panel
    .getByRole('button', { name: 'Antworten löschen', exact: true })
    .click()
  await close(page)
  const data = await exportData(page)
  expect(data.preferences.styleInterview.status).toBe('dismissed')
  expect(data.preferences.styleInterview.answers).toEqual({})
  expect(data.preferences.styleProfile).toEqual(profile)
  expect(data.garments).toHaveLength(3)
})
test('Neue ungelesene Antwort bekommt einen Punkt; sichtbares Lesen und Neustart behalten den Lesestand', async ({
  page,
  context,
}) => {
  await seed(page)
  const panel = await open(page)
  await panel
    .getByRole('button', { name: 'Keine weiteren Fragen', exact: true })
    .click()
  await close(page)
  // Incoming history from an explicit backup import is unread on this device.
  const data = await exportData(page)
  data.chat = {
    id: 'stylist',
    revision: 'incoming-chat',
    updatedAt: stamp,
    messages: [
      {
        id: 'incoming-question',
        role: 'user',
        text: 'Was passt zu mir?',
        createdAt: stamp,
      },
      {
        id: 'incoming-answer',
        role: 'assistant',
        text: 'Dein Stilprofil gibt eine Richtung vor. Was steht heute bei dir an?',
        createdAt: stamp,
      },
    ],
  }
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'incoming.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.locator('.inbox-dot')).toBeVisible()
  const dialog = await open(page)
  await expect(
    page.getByText(
      'Dein Stilprofil gibt eine Richtung vor. Was steht heute bei dir an?',
      { exact: true },
    ),
  ).toBeVisible()
  await expect(page.locator('.inbox-dot')).toHaveCount(0)
  await close(page)
  await page.reload()
  await expect(page.locator('.inbox-dot')).toHaveCount(0)
  expect(await context.pages()).toHaveLength(1)
  await expect(dialog).not.toBeVisible()
})
test('Zwei Fenster überschreiben keine neuere Antwort und können den aktuellen Stand bewusst laden', async ({
  page,
  context,
}) => {
  await seed(page)
  const first = await open(page)
  await first
    .getByRole('button', { name: 'Stilgespräch starten', exact: true })
    .click()
  const other = await context.newPage()
  await other.goto('/')
  const second = await open(other)
  await second
    .getByRole('button', { name: 'Stilgespräch fortsetzen', exact: true })
    .click()
  await second
    .getByRole('button', { name: 'Sportlich & entspannt', exact: true })
    .click()
  await first
    .getByRole('button', { name: 'Klar & elegant', exact: true })
    .click()
  await first
    .getByRole('button', { name: 'Antwort speichern', exact: true })
    .click()
  await expect(
    second.getByRole('button', {
      name: 'Neu laden und Entwurf verwerfen',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    second.getByRole('button', { name: 'Antwort speichern', exact: true }),
  ).toBeDisabled()
  await second
    .getByRole('button', {
      name: 'Neu laden und Entwurf verwerfen',
      exact: true,
    })
    .click()
  await expect(
    second.getByRole('heading', {
      name: 'In welchen Schnitten fühlst du dich wohl?',
      exact: true,
    }),
  ).toBeVisible()
  await second
    .getByRole('button', { name: 'Weit & locker', exact: true })
    .click()
  await second
    .getByRole('button', { name: 'Antwort speichern', exact: true })
    .click()
  await close(other)
  const data = await exportData(other)
  expect(data.preferences.styleInterview.answers).toEqual({
    focus: 'Klar & elegant',
    fit: 'Weit & locker',
  })
})

test('Eine ausgeblendete App markiert sichtbare Nachrichten erst beim Zurückkehren als gelesen', async ({
  page,
}) => {
  await seed(page)
  await page.addInitScript(() =>
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    }),
  )
  await page.reload()
  await open(page)
  await expect(page.locator('.inbox-dot')).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.inbox-dot')).toHaveCount(0)
})

test('Alle acht Antworten gelangen erst bei einer bewusst gesendeten Frage in den KI-Kontext', async ({
  page,
}) => {
  await seed(page)
  const panel = await open(page)
  const calls: Record<string, unknown>[] = []
  const host = 'https://prithivmlmods-qwen3-vl-outpost.hf.space'
  await page.route(`${host}/gradio_api/call/run_router`, async (route) => {
    const body = route.request().postDataJSON()
    calls.push(JSON.parse(body.data[1].split('REFERENCE DATA:\n')[1]))
    await route.fulfill({ json: { event_id: 'a'.repeat(32) } })
  })
  await page.route(`${host}/gradio_api/call/run_router/*`, (route) =>
    route.fulfill({
      contentType: 'text/event-stream',
      body: `event: complete\ndata: ${JSON.stringify([JSON.stringify({ reply: 'Deine Vorlieben sind berücksichtigt. Für den Alltag können klare Linien eine gute Richtung sein.', garments: [], occasion: 'Alltag' })])}\n\n`,
    }),
  )
  await panel
    .getByRole('button', { name: 'Stilgespräch starten', exact: true })
    .click()
  for (const choice of [
    'Markant & experimentell',
    'Weit & locker',
    'Drinnen & draussen im Wechsel',
    'Ich friere schnell',
    'Lieber unifarben',
    'Gern ein Accessoire',
  ]) {
    await panel.getByRole('button', { name: choice, exact: true }).click()
    await panel
      .getByRole('button', { name: 'Antwort speichern', exact: true })
      .click()
  }
  for (const answer of ['Keine kratzigen Stoffe', 'Klare Linien']) {
    await panel
      .getByRole('textbox', { name: 'Deine Antwort (freiwillig)' })
      .fill(answer)
    await panel
      .getByRole('button', { name: 'Antwort speichern', exact: true })
      .click()
  }
  await panel
    .getByRole('button', { name: 'Stilgespräch abschliessen', exact: true })
    .click()
  expect(calls).toHaveLength(0)
  await page
    .getByRole('button', { name: 'Kostenlosen Chat aktivieren', exact: true })
    .click()
  await page
    .getByRole('textbox', { name: 'Deine Nachricht', exact: true })
    .fill('Was passt zu meinem Alltag?')
  await page.getByRole('button', { name: 'Senden', exact: true }).click()
  await expect(
    page.getByText(
      'Deine Vorlieben sind berücksichtigt. Für den Alltag können klare Linien eine gute Richtung sein.',
      { exact: true },
    ),
  ).toBeVisible()
  expect(calls).toHaveLength(1)
  const preferences = calls[0].preferences as {
    styleConversation: { question: string; answer: string }[]
  }
  expect(preferences.styleConversation).toHaveLength(8)
  expect(preferences.styleConversation.map((a) => a.answer)).toContain(
    'Keine kratzigen Stoffe',
  )
  await close(page)
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await expect(
    page.getByRole('checkbox', {
      name: 'Ein Accessoire ergänzen, wenn eines passt',
      exact: true,
    }),
  ).toBeChecked()
})

for (const width of [320, 390, 430])
  test(`Vertiefung bei ${width}px bleibt ohne Chatfreigabe und mit reduzierter Bewegung bedienbar`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await seed(page)
    const panel = await open(page)
    await panel
      .getByRole('button', { name: 'Stilgespräch starten', exact: true })
      .click()
    expect(
      await page
        .getByRole('dialog')
        .evaluate((n) => n.scrollWidth <= n.clientWidth),
    ).toBe(true)
    const button = panel.getByRole('button', {
      name: 'Antwort speichern',
      exact: true,
    })
    const rect = (await button.boundingBox())!
    expect(rect.height).toBeGreaterThanOrEqual(44)
    await expect(
      page.getByRole('button', { name: 'Schliessen', exact: true }),
    ).toBeInViewport()
    await page.screenshot({ path: info.outputPath(`interview-${width}.png`) })
  })
