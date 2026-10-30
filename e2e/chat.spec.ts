import { test, expect, type Page } from './fixtures'
import { readFile } from 'node:fs/promises'
const host = 'https://prithivmlmods-qwen3-vl-outpost.hf.space'
const stamp = '2026-01-01T00:00:00.000Z'
const garments = (['Oberteile', 'Hosen', 'Schuhe', 'Oberteile'] as const).map(
  (category, index) => ({
    id: `chat-${index}`,
    name: ['Blaues Hemd', 'Dunkle Hose', 'Weisse Sneaker', 'Rotes Shirt'][
      index
    ],
    category,
    color: ['Blau', 'Schwarz', 'Weiss', 'Rot'][index],
    brand: '',
    styles: ['Casual'],
    seasons: [],
    notes: 'PRIVATE-NOTE',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
  }),
)
async function importData(page: Page, data?: unknown) {
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  const photo = `data:image/png;base64,${(await readFile('public/icon-192.png')).toString('base64')}`
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'chat.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify(
        data ?? {
          app: 'MyStyle',
          version: 4,
          garments: garments.map((g) => ({ ...g, photo })),
          outfits: [],
          feedback: [],
          preferences: null,
          calendar: [],
          weather: null,
        },
      ),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
}
async function open(page: Page, activate = true) {
  await page
    .getByRole('button', { name: 'Mit deinem Stylisten sprechen', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // The sheet rises on a spring; measure once it has arrived.
  await expect
    .poll(() => dialog.evaluate((node) => node.style.transform))
    .toBe('')
  if (
    activate &&
    (await dialog
      .getByRole('button', { name: 'Kostenlosen Chat aktivieren', exact: true })
      .isVisible())
  )
    await dialog
      .getByRole('button', { name: 'Kostenlosen Chat aktivieren', exact: true })
      .click()
  return dialog
}
async function exportData(page: Page) {
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  return JSON.parse(await readFile((await (await download).path())!, 'utf8'))
}
interface Reference {
  question: string
  garments: { label: string; name: string; category: string }[]
  conversation: { role: string; text: string }[]
}
async function provider(
  page: Page,
  options: { error?: boolean; invalid?: boolean; holdAfter?: number } = {},
) {
  const calls: { data: unknown[]; reference: Reference }[] = []
  const answers = new Map<string, unknown>()
  let release: (() => void) | undefined
  let waiting = false
  await page.route(`${host}/gradio_api/call/run_router`, async (route) => {
    const body = route.request().postDataJSON() as { data: unknown[] }
    const reference = JSON.parse(
      (body.data[1] as string).split('REFERENCE DATA:\n')[1],
    ) as Reference
    calls.push({ data: body.data, reference })
    if (options.error)
      return route.fulfill({
        status: 429,
        json: { error: 'GPU quota exceeded' },
      })
    const event = calls.length.toString(16).padStart(32, '0')
    const labels = ['Oberteile', 'Hosen', 'Schuhe'].map(
      (category) =>
        reference.garments.find((g) => g.category === category)!.label,
    )
    answers.set(event, {
      reply:
        calls.length === 1
          ? 'Dein blaues Hemd passt zur dunklen Hose und den weissen Sneakern.'
          : 'Mit dem Hemd etwas ordentlicher getragen wirkt die Kombination eleganter.',
      garments: options.invalid ? ['G99'] : labels,
      occasion: 'Alltag',
    })
    await route.fulfill({ json: { event_id: event } })
  })
  await page.route(`${host}/gradio_api/call/run_router/*`, async (route) => {
    const event = route.request().url().split('/').at(-1)!
    if (options.holdAfter && calls.length > options.holdAfter) {
      waiting = true
      await new Promise<void>((resolve) => {
        release = resolve
      })
    }
    try {
      await route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([JSON.stringify(answers.get(event))])}\n\n`,
      })
    } catch {
      /* Expected when this request was aborted. */
    }
    waiting = false
  })
  return { calls, isWaiting: () => waiting, release: () => release?.() }
}
async function send(page: Page, text: string) {
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('textbox', { name: 'Deine Nachricht', exact: true })
    .fill(text)
  await dialog.getByRole('button', { name: 'Senden', exact: true }).click()
}

// Network mocks use page.route, which a controlling service worker bypasses.
test.use({ serviceWorkers: 'block' })
test('Chat fragt einmal nach Freigabe, beantwortet Folgefragen, speichert echten Look erst auf Aktion und sichert Verlauf', async ({
  page,
}) => {
  await page.goto('/')
  await importData(page)
  const api = await provider(page),
    dialog = await open(page, false)
  expect(api.calls).toHaveLength(0)
  await expect(
    dialog.getByRole('heading', {
      name: 'Was möchtest du heute tragen?',
      exact: true,
    }),
  ).toBeInViewport()
  const welcomeBox = await dialog
    .getByRole('heading', {
      name: 'Was möchtest du heute tragen?',
      exact: true,
    })
    .boundingBox()
  const headerBox = await dialog.locator('.sheet-header').boundingBox()
  expect(welcomeBox!.y).toBeGreaterThanOrEqual(
    headerBox!.y + headerBox!.height - 1,
  )
  expect(
    await page.evaluate(
      ({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.chat-welcome'),
      {
        x: welcomeBox!.x + welcomeBox!.width / 2,
        y: welcomeBox!.y + welcomeBox!.height / 2,
      },
    ),
  ).toBe(true)
  await expect(
    dialog.getByRole('button', { name: 'Senden', exact: true }),
  ).toHaveCount(0)
  await dialog
    .getByRole('button', { name: 'Kostenlosen Chat aktivieren', exact: true })
    .click()
  expect(api.calls).toHaveLength(0)
  await send(page, 'Was kann ich heute anziehen?')
  await expect(
    dialog.getByRole('article', {
      name: 'Antwort deines Stylisten',
      exact: true,
    }),
  ).toHaveCount(1)
  expect(api.calls[0].data[0]).toBe('Qwen3-VL-8B-Instruct')
  // Garment photos travel as one labelled collage; notes help the stylist.
  expect((api.calls[0].data[2] as string).length).toBeGreaterThan(3000)
  expect(api.calls[0].data[1]).toContain('PRIVATE-NOTE')
  expect(api.calls[0].data[1]).toContain('attached image shows photos')
  expect(api.calls[0].data[1]).not.toContain('data:image')
  await send(page, 'Und etwas eleganter?')
  await expect(
    dialog.getByRole('article', {
      name: 'Antwort deines Stylisten',
      exact: true,
    }),
  ).toHaveCount(2)
  expect(api.calls[1].reference.conversation).toHaveLength(2)
  expect(api.calls[1].reference.conversation[0].text).toBe(
    'Was kann ich heute anziehen?',
  )
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  const before = await exportData(page)
  expect(before.version).toBe(8)
  expect(before.chat.messages).toHaveLength(4)
  expect(before.outfits).toHaveLength(0)
  await open(page)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Look speichern', exact: true })
    .first()
    .click()
  await expect(
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Look speichern', exact: true })
      .first(),
  ).toBeDisabled()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Schliessen', exact: true })
    .click()
  const after = await exportData(page)
  expect(after.outfits).toHaveLength(1)
  expect(after.calendar).toHaveLength(0)
  expect(after.garments).toEqual(before.garments)
  await page.reload()
  await open(page)
  await expect(
    page.getByRole('dialog').getByRole('button', {
      name: 'Kostenlosen Chat aktivieren',
      exact: true,
    }),
  ).not.toBeVisible()
  await expect(
    page
      .getByRole('dialog')
      .getByRole('article', { name: 'Antwort deines Stylisten', exact: true }),
  ).toHaveCount(2)
})

for (const kind of ['limit', 'invalid'] as const)
  test(`Fehler ${kind} erhält Frage und Verlauf ohne automatische Wiederholung`, async ({
    page,
  }) => {
    await page.goto('/')
    await importData(page)
    const api = await provider(page, {
      error: kind === 'limit',
      invalid: kind === 'invalid',
    })
    const dialog = await open(page)
    await send(page, 'Was passt zum Hemd?')
    await expect(dialog.getByRole('alert')).toBeVisible()
    if (kind === 'limit')
      await expect(dialog.getByRole('alert')).toContainText('Nutzungslimit')
    await expect(
      dialog.getByRole('textbox', { name: 'Deine Nachricht', exact: true }),
    ).toHaveValue('Was passt zum Hemd?')
    expect(api.calls).toHaveLength(1)
    await expect(
      dialog.getByRole('article', {
        name: 'Antwort deines Stylisten',
        exact: true,
      }),
    ).toHaveCount(0)
    await dialog
      .getByRole('button', { name: 'Schliessen', exact: true })
      .click()
    const backup = await exportData(page)
    expect(backup.chat?.messages ?? []).toHaveLength(0)
  })

for (const action of [
  'abbrechen',
  'schliessen',
  'löschen',
  'widerrufen',
] as const)
  test(`Späte Antwort nach ${action} kann keinen Verlauf wiederherstellen`, async ({
    page,
  }) => {
    await page.goto('/')
    await importData(page)
    const api = await provider(page, { holdAfter: 1 }),
      dialog = await open(page)
    await send(page, 'Ein Look bitte')
    await expect(
      dialog.getByRole('article', {
        name: 'Antwort deines Stylisten',
        exact: true,
      }),
    ).toHaveCount(1)
    await send(page, 'Und etwas eleganter?')
    await expect.poll(api.isWaiting).toBe(true)
    if (action === 'abbrechen')
      await dialog
        .getByRole('button', { name: 'Antwort abbrechen', exact: true })
        .click()
    if (action === 'schliessen')
      await dialog
        .getByRole('button', { name: 'Schliessen', exact: true })
        .click()
    if (action === 'löschen') {
      await dialog
        .getByRole('button', { name: 'Neues Gespräch', exact: true })
        .click()
      await dialog
        .getByRole('button', { name: 'Gespräch löschen', exact: true })
        .click()
    }
    if (action === 'widerrufen') {
      await dialog
        .getByText('Dein Kontext & Chat-Einstellungen', { exact: true })
        .click()
      await dialog
        .getByRole('button', { name: 'Online-Chat ausschalten', exact: true })
        .click()
    }
    api.release()
    if (action === 'schliessen') await open(page)
    await expect(
      dialog.getByRole('button', { name: 'Antwort abbrechen', exact: true }),
    ).not.toBeVisible()
    await expect(
      dialog.getByRole('article', {
        name: 'Antwort deines Stylisten',
        exact: true,
      }),
    ).toHaveCount(action === 'löschen' ? 0 : 1)
    if (action === 'widerrufen')
      await expect(
        dialog.getByRole('button', { name: 'Senden', exact: true }),
      ).toHaveCount(0)
    await dialog
      .getByRole('button', { name: 'Schliessen', exact: true })
      .click()
    const backup = await exportData(page)
    expect(backup.chat.messages).toHaveLength(action === 'löschen' ? 0 : 2)
  })

test('Gespräch wird auf zweitem Gerät wiederhergestellt, Online-Freigabe wird nicht übertragen', async ({
  page,
  newDevice,
}) => {
  await page.goto('/')
  await importData(page)
  await provider(page)
  const dialog = await open(page)
  await send(page, 'Ein Look bitte')
  await expect(
    dialog.getByRole('article', {
      name: 'Antwort deines Stylisten',
      exact: true,
    }),
  ).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  const backup = await exportData(page)
  const context = await newDevice(),
    other = await context.newPage()
  await other.goto('/')
  await importData(other, backup)
  const restored = await open(other, false)
  await expect(
    restored.getByRole('article', {
      name: 'Antwort deines Stylisten',
      exact: true,
    }),
  ).toHaveCount(1)
  await expect(
    restored.getByRole('button', {
      name: 'Kostenlosen Chat aktivieren',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    restored.getByRole('button', { name: 'Senden', exact: true }),
  ).toHaveCount(0)
  await restored
    .getByRole('button', { name: 'Neues Gespräch', exact: true })
    .click()
  await restored
    .getByRole('button', { name: 'Gespräch löschen', exact: true })
    .click()
  await expect(
    restored.getByRole('article', {
      name: 'Antwort deines Stylisten',
      exact: true,
    }),
  ).toHaveCount(0)
  await context.close()
})

async function speechStub(page: Page) {
  await page.addInitScript(() => {
    let instance: Fake | null = null,
      late: ((event: { results: { transcript: string }[][] }) => void) | null =
        null
    const counts = { starts: 0, aborts: 0, spoken: '' }
    class Fake {
      lang = ''
      continuous = false
      interimResults = false
      onresult: typeof late = null
      onerror: ((e: { error: string }) => void) | null = null
      onend: (() => void) | null = null
      start() {
        instance = this
        counts.starts++
      }
      stop() {
        this.onend?.()
      }
      abort() {
        counts.aborts++
      }
    }
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: Fake,
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: () => {},
        speak: (u: { text: string }) => {
          counts.spoken = u.text
        },
      },
    })
    Object.assign(window, {
      __speechCounts: counts,
      __speechResult: (text: string) => {
        late = instance?.onresult ?? null
        instance?.onresult?.({ results: [[{ transcript: text }]] })
      },
      __speechError: () => instance?.onerror?.({ error: 'not-allowed' }),
      __lateResult: () =>
        late?.({ results: [[{ transcript: 'NICHT ÜBERNEHMEN' }]] }),
    })
  })
}

test('Diktieren füllt nur einen bearbeitbaren Entwurf, Senden ist bewusst, Vorlesen nutzt Browserstimme', async ({
  page,
}) => {
  await speechStub(page)
  await page.goto('/')
  await importData(page)
  const api = await provider(page),
    dialog = await open(page)
  await dialog
    .getByRole('button', { name: 'Nachricht diktieren', exact: true })
    .click()
  await page.evaluate(() => {
    ;(
      window as unknown as { __speechResult: (text: string) => void }
    ).__speechResult('Was passt zum blauen Hemd?')
  })
  expect(api.calls).toHaveLength(0)
  await dialog
    .getByRole('button', { name: 'Diktieren beenden', exact: true })
    .click()
  await expect(
    dialog.getByRole('textbox', { name: 'Deine Nachricht', exact: true }),
  ).toHaveValue('Was passt zum blauen Hemd?')
  await dialog
    .getByRole('textbox', { name: 'Deine Nachricht', exact: true })
    .fill('Was passt zu meinem Hemd im Alltag?')
  await page.evaluate(() => {
    ;(window as unknown as { __lateResult: () => void }).__lateResult()
  })
  await expect(
    dialog.getByRole('textbox', { name: 'Deine Nachricht', exact: true }),
  ).toHaveValue('Was passt zu meinem Hemd im Alltag?')
  await dialog.getByRole('button', { name: 'Senden', exact: true }).click()
  await expect(
    dialog.getByRole('article', {
      name: 'Antwort deines Stylisten',
      exact: true,
    }),
  ).toHaveCount(1)
  await dialog
    .getByRole('button', { name: 'Antwort vorlesen', exact: true })
    .click()
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __speechCounts: { spoken: string } })
          .__speechCounts.spoken,
    ),
  ).toContain('blaues Hemd')
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await page.evaluate(() => {
    ;(window as unknown as { __lateResult: () => void }).__lateResult()
  })
  await open(page)
  await expect(
    dialog.getByRole('textbox', { name: 'Deine Nachricht', exact: true }),
  ).toHaveValue('')
})

test('Mikrofon-Ablehnung lässt Tippen und Senden möglich', async ({ page }) => {
  await speechStub(page)
  await page.goto('/')
  await importData(page)
  await provider(page)
  const dialog = await open(page)
  await dialog
    .getByRole('button', { name: 'Nachricht diktieren', exact: true })
    .click()
  await page.evaluate(() => {
    ;(window as unknown as { __speechError: () => void }).__speechError()
  })
  await expect(dialog.getByRole('alert')).toContainText(
    'Mikrofon nicht freigegeben',
  )
  await send(page, 'Ein Look bitte')
  await expect(
    dialog.getByRole('article', {
      name: 'Antwort deines Stylisten',
      exact: true,
    }),
  ).toHaveCount(1)
})

for (const width of [320, 390])
  test(`Chat bei ${width}px ohne Überlauf und mit erreichbaren Touch-Zielen`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await importData(page)
    await provider(page)
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true)
    const dialog = await open(page)
    await send(page, 'Ein Look bitte')
    await expect(
      dialog.getByRole('article', {
        name: 'Antwort deines Stylisten',
        exact: true,
      }),
    ).toHaveCount(1)
    expect(
      await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true)
    const authorBox = await dialog
      .getByRole('article', { name: 'Antwort deines Stylisten', exact: true })
      .locator('.chat-author')
      .boundingBox()
    const headerBox = await dialog.locator('.sheet-header').boundingBox()
    expect(authorBox!.y).toBeGreaterThanOrEqual(
      headerBox!.y + headerBox!.height - 1,
    )
    const button = dialog.getByRole('button', { name: 'Senden', exact: true })
    const box = await button.boundingBox()
    expect(Number(box!.height.toFixed(3))).toBeGreaterThanOrEqual(44)
    await dialog.evaluate((node) =>
      node.scrollTo({ top: node.scrollHeight, behavior: 'instant' }),
    )
    await expect(
      dialog.getByRole('button', { name: 'Schliessen', exact: true }),
    ).toBeInViewport()
    await page.screenshot({
      path: info.outputPath(`chat-${width}.png`),
      fullPage: true,
    })
    await dialog
      .getByRole('button', { name: 'Schliessen', exact: true })
      .click()
    await expect(
      page.getByRole('button', {
        name: 'Mit deinem Stylisten sprechen',
        exact: true,
      }),
    ).toBeFocused()
  })
