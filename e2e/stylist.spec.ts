import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const host = 'https://prithivmlmods-qwen3-vl-outpost.hf.space'
const stamp = '2026-01-01T00:00:00.000Z'
const pieces = (
  ['Oberteile', 'Hosen', 'Schuhe', 'Oberteile', 'Oberteile'] as const
).map((category, index) => ({
  id: `stylist-${index}`,
  name: [
    'Weisses Hemd',
    'Dunkle Hose',
    'Sneaker',
    'Blaues Hemd',
    'Nicht senden',
  ][index],
  category,
  color: index === 3 ? 'Blau' : 'Weiss',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  inLaundry: index === 4,
  createdAt: stamp,
  updatedAt: stamp,
}))
const answer = {
  choice: 'L2',
  reason:
    'Das ausgewählte Hemd ergänzt die dunkle Hose und die ruhigen Schuhe.',
  tips: ['Das Hemd locker einstecken.'],
  caveat: 'Die Passform am Körper bleibt offen.',
}

async function importPieces(page: Page, withPhotos = true) {
  const photo = `data:image/png;base64,${(await readFile('public/icon-192.png')).toString('base64')}`
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'stylist.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 4,
        garments: pieces.map((item) => ({
          ...item,
          ...(withPhotos ? { photo } : {}),
        })),
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
  await expect(
    page.getByRole('region', { name: 'Online-Stylist' }),
  ).toBeVisible()
}
async function activate(page: Page) {
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page
    .getByRole('checkbox', { name: /Ich erlaube, neue Kleidungsfotos/ })
    .check()
  await page
    .getByRole('button', { name: 'Kostenlose KI aktivieren', exact: true })
    .click()
  await expect(
    page.getByText('Kostenlose KI aktiviert.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Heute', exact: true }).click()
}
type Context = {
  garments: { label: string; name: string; photo: boolean }[]
  looks: { choice: string; garments: string[] }[]
  request: string
}
async function mock(page: Page, mode = 'ok', hold?: Promise<void>) {
  const sent: { data: unknown[]; context: Context }[] = []
  let finished = () => {}
  const replied = new Promise<void>((resolve) => {
    finished = resolve
  })
  await page.route('https://*.hf.space/**', async (route) => {
    const request = route.request(),
      url = request.url()
    expect(request.headers().authorization).toBeUndefined()
    if (url.endsWith('/gradio_api/info'))
      return route.fulfill({
        json: { named_endpoints: { '/run_router': {}, '/image': {} } },
      })
    if (url === host + '/gradio_api/call/run_router') {
      const data = request.postDataJSON().data as unknown[]
      expect(data[0]).toBe('Qwen3-VL-8B-Instruct')
      expect(Buffer.from(data[2] as string, 'base64').subarray(0, 3)).toEqual(
        Buffer.from([255, 216, 255]),
      )
      sent.push({
        data,
        context: JSON.parse((data[1] as string).split('REFERENCE DATA:\n')[1]),
      })
      if (mode === 'limit')
        return route.fulfill({ status: 429, body: 'quota exceeded' })
      if (mode === 'unavailable')
        return route.fulfill({ status: 503, body: 'Unavailable' })
      return route.fulfill({ json: { event_id: 'c'.repeat(32) } })
    }
    if (url === host + '/gradio_api/call/run_router/' + 'c'.repeat(32)) {
      await hold
      try {
        await route.fulfill({
          contentType: 'text/event-stream',
          body:
            'event: complete\ndata: ' +
            JSON.stringify([
              JSON.stringify({
                ...answer,
                choice: mode === 'invalid' ? 'L9' : 'L2',
              }),
            ]) +
            '\n\n',
        })
      } finally {
        finished()
      }
      return
    }
    throw Error('Unexpected provider call: ' + url)
  })
  return { sent, replied }
}
async function mainNames(page: Page) {
  return page
    .getByRole('region', { name: 'Dein Tageslook' })
    .locator(':scope > .outfit-pieces .outfit-piece')
    .evaluateAll((nodes) =>
      nodes
        .map((node) => node.getAttribute('aria-label')!.replace(/ öffnen$/, ''))
        .sort(),
    )
}

test('Online-Beratung sendet erst auf Aktion ausgewählte Fotos, übernimmt echte IDs und erhält Foto/Backup', async ({
  page,
}) => {
  const { sent } = await mock(page)
  await page.goto('/')
  await importPieces(page)
  const stylist = page.getByRole('region', { name: 'Online-Stylist' })
  await expect(
    stylist.getByRole('button', {
      name: 'Looks online vergleichen',
      exact: true,
    }),
  ).toBeDisabled()
  expect(sent).toHaveLength(0)
  await activate(page)
  expect(sent).toHaveLength(0)
  await stylist
    .getByLabel('Dein Wunsch (optional)')
    .fill('Etwas eleganter fürs Büro')
  await stylist
    .getByRole('button', { name: 'Looks online vergleichen', exact: true })
    .click()
  await expect(stylist.getByText(answer.reason)).toBeVisible()
  expect(sent).toHaveLength(1)
  expect(sent[0].context.request).toBe('Etwas eleganter fürs Büro')
  expect(sent[0].context.garments).toHaveLength(4)
  expect(JSON.stringify(sent[0].context)).not.toContain('Nicht senden')
  expect(JSON.stringify(sent[0].context)).not.toContain('latitude')
  const expected = sent[0].context.looks[1].garments
    .map(
      (label) =>
        sent[0].context.garments.find((item) => item.label === label)!.name,
    )
    .sort()
  await stylist
    .getByRole('button', { name: 'Für heute übernehmen', exact: true })
    .click()
  await expect.poll(() => mainNames(page)).toEqual(expected)
  await page.reload()
  await expect.poll(() => mainNames(page)).toEqual(expected)
  expect(sent).toHaveLength(1)
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: /Sicherung exportieren/ }).click()
  const download = await downloading
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(backup.preferences.dailySelection.garmentIds).toHaveLength(3)
  const original = `data:image/png;base64,${(await readFile('public/icon-192.png')).toString('base64')}`
  expect(
    backup.garments.every((item: { photo: string }) => item.photo === original),
  ).toBe(true)
})

test('Ohne Fotos wird die Beratung als angabenbasiert bezeichnet', async ({
  page,
}) => {
  const { sent } = await mock(page)
  await page.goto('/')
  await importPieces(page, false)
  await activate(page)
  const stylist = page.getByRole('region', { name: 'Online-Stylist' })
  await expect(
    stylist.getByText(/Ohne Fotos ist keine visuelle Einschätzung möglich/),
  ).toBeVisible()
  await stylist
    .getByRole('button', { name: 'Looks online vergleichen', exact: true })
    .click()
  await expect(stylist.getByText(answer.reason)).toBeVisible()
  expect(sent[0].context.garments.every((item) => item.photo === false)).toBe(
    true,
  )
})

test('Online-Stylist vergleicht unter Outfits und speichert die Empfehlung nur einmal', async ({
  page,
}) => {
  await mock(page)
  await page.goto('/')
  await importPieces(page)
  await activate(page)
  await page.getByRole('button', { name: 'Outfits', exact: true }).click()
  await page
    .getByRole('button', { name: 'Outfits zusammenstellen', exact: true })
    .click()
  const stylist = page.getByRole('region', { name: 'Online-Stylist' })
  await stylist
    .getByRole('button', { name: 'Looks online vergleichen', exact: true })
    .click()
  await expect(stylist.getByText(answer.reason)).toBeVisible()
  await stylist
    .getByRole('button', { name: 'Empfohlenen Look speichern', exact: true })
    .click()
  await expect(
    stylist.getByRole('button', { name: 'Gespeichert', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: 'Gespeichert (1)', exact: true })
    .click()
  await expect(page.locator('.outfit-card')).toHaveCount(1)
})

for (const [mode, message] of [
  ['limit', 'Nutzungslimit des Dienstes erreicht'],
  ['unavailable', 'Dienst vorübergehend nicht verfügbar'],
  ['invalid', 'Die Antwort des Dienstes konnte nicht verwendet werden'],
]) {
  test(`Fehler ${mode} erhält den bisherigen Tageslook ohne automatische Wiederholung`, async ({
    page,
  }) => {
    const { sent } = await mock(page, mode)
    await page.goto('/')
    await importPieces(page)
    await activate(page)
    const before = await mainNames(page)
    const stylist = page.getByRole('region', { name: 'Online-Stylist' })
    await stylist
      .getByRole('button', { name: 'Looks online vergleichen', exact: true })
      .click()
    await expect(stylist.getByRole('alert')).toContainText(message)
    expect(await mainNames(page)).toEqual(before)
    expect(sent).toHaveLength(1)
    await expect(
      stylist.getByRole('button', {
        name: 'Für heute übernehmen',
        exact: true,
      }),
    ).toHaveCount(0)
  })
}

for (const action of ['abbrechen', 'anderer Look', 'Freigabe zurückziehen']) {
  test(`Späte KI-Antwort wird nach ${action} nicht übernommen`, async ({
    page,
    context,
  }) => {
    let release = () => {}
    const hold = new Promise<void>((resolve) => {
      release = resolve
    })
    const { sent, replied } = await mock(page, 'ok', hold)
    await page.goto('/')
    await importPieces(page)
    await activate(page)
    const stylist = page.getByRole('region', { name: 'Online-Stylist' })
    await stylist
      .getByRole('button', { name: 'Looks online vergleichen', exact: true })
      .click()
    await expect.poll(() => sent.length).toBe(1)
    if (action === 'abbrechen')
      await stylist
        .getByRole('button', { name: 'Beratung abbrechen', exact: true })
        .click()
    if (action === 'anderer Look')
      await page
        .getByRole('button', { name: 'Anderer Look', exact: true })
        .click()
    if (action === 'Freigabe zurückziehen') {
      const other = await context.newPage()
      await other.goto('/')
      await other.evaluate(() => localStorage.removeItem('mystyle-photo-ai'))
      await expect(stylist.getByRole('alert')).toContainText(
        'Freigabe wurde zurückgezogen',
      )
      await other.close()
    }
    release()
    await replied
    await expect(
      stylist.getByRole('button', { name: 'Beratung abbrechen', exact: true }),
    ).toHaveCount(0)
    await expect(stylist.getByText(answer.reason)).toHaveCount(0)
    await expect(
      stylist.getByRole('button', {
        name: 'Für heute übernehmen',
        exact: true,
      }),
    ).toHaveCount(0)
  })
}

for (const width of [375, 390, 430]) {
  test(`Online-Beratung mit Ergebnis bleibt bei ${width}px ohne Überlauf bedienbar`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await mock(page)
    await page.goto('/')
    await importPieces(page)
    await activate(page)
    const stylist = page.getByRole('region', { name: 'Online-Stylist' })
    await stylist
      .getByRole('button', { name: 'Looks online vergleichen', exact: true })
      .click()
    await expect(stylist.getByText(answer.reason)).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    const button = stylist.getByRole('button', {
      name: 'Für heute übernehmen',
      exact: true,
    })
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await stylist.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `test-results/stylist-${width}.png`,
      fullPage: true,
    })
  })
}
