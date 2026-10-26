import { test, expect, type Page, type BrowserContext } from './fixtures'
import { shoppingFixture } from '../tests/fixtures/shopping'
const host = 'https://prithivmlmods-qwen3-vl-outpost.hf.space'
test.use({ timezoneId: 'Europe/Zurich' })
async function seed(page: Page) {
  await page.goto('/')
  const now = await page.evaluate(() => Date.now()),
    data = shoppingFixture(now)
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'shopping.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 7,
        ...data,
        weather: null,
        chat: null,
      }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Journal', exact: true }).click()
  await page
    .getByRole('button', { name: 'Mit KI günstig shoppen', exact: true })
    .click()
}
function reply(reference: { garments: { label: string; name: string }[] }) {
  const refs = ['Blaues Hemd', 'Dunkle Jeans', 'Weisse Sneaker'].map(
    (name) => reference.garments.find((item) => item.name === name)!.label,
  )
  return {
    ideas: [
      {
        name: 'Beiges Overshirt',
        category: 'Jacken',
        color: 'Beige',
        style: 'Minimalistisch',
        why: 'Ergänzt dein blaues Hemd und die dunkle Jeans mit deiner bevorzugten ruhigen Farbpalette.',
        with: refs,
      },
      {
        name: 'Beiger Stoffgürtel',
        category: 'Accessoires',
        color: 'Beige',
        style: 'Minimalistisch',
        why: 'Ein dezenter Akzent zu deinem Hemd und den hellen Sneakern.',
        with: refs,
      },
    ],
  }
}
async function provider(
  context: BrowserContext,
  kind: 'ok' | 'price' | 'limit' = 'ok',
  gate?: Promise<void>,
) {
  const requests: {
    budget: { hardMaximumPerItem: number; preferBelow: number }
    assortment: string
    garments: { label: string; name: string }[]
  }[] = []
  await context.route('https://*.hf.space/**', async (route) => {
    const url = route.request().url()
    if (url === host + '/gradio_api/call/run_router') {
      const payload = route.request().postDataJSON().data
      expect(payload[0]).toBe('Qwen3-VL-8B-Instruct')
      expect(payload[1]).not.toContain('PRIVATE-')
      expect(payload[2].length).toBeLessThan(2000)
      requests.push(JSON.parse(payload[1].split('REFERENCE DATA:\n')[1]))
      if (gate) await gate
      return (
        kind === 'limit'
          ? route.fulfill({ status: 429, body: 'quota' })
          : route.fulfill({ json: { event_id: 'c'.repeat(32) } })
      ).catch(() => {})
    }
    if (url === host + '/gradio_api/call/run_router/' + 'c'.repeat(32)) {
      const answer = reply(requests.at(-1)!)
      if (kind === 'price')
        Object.assign(answer.ideas[0], {
          price: 150,
          url: 'https://invented.invalid/item',
        })
      return route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([JSON.stringify(answer)])}\n\n`,
      })
    }
    throw new Error('Unexpected shopping request ' + url)
  })
  return requests
}
const consent = (page: Page) =>
  page.getByRole('checkbox', {
    name: 'Ich erlaube die Online-Shopping-Beratung mit diesen Stil- und Kleidungsangaben.',
    exact: true,
  })
const start = (page: Page) =>
  page.getByRole('button', { name: 'Passende Kaufideen finden', exact: true })

test('Neue Nutzer sehen Fortschritt und erhalten keine verfrühte Shopping-Aufforderung oder Anfrage', async ({
  page,
  context,
}) => {
  const requests = await provider(context)
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Mit KI günstig shoppen', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Journal', exact: true }).click()
  const card = page.getByRole('region', {
    name: 'Persönliche Shopping-Beratung',
    exact: true,
  })
  await card
    .getByText('Wann wird Shopping freigeschaltet?', { exact: true })
    .click()
  await expect(card.getByText(/0 von 7 bestätigten Tragetagen/)).toBeVisible()
  await expect(card.getByText(/0 von 3 unterschiedlichen Looks/)).toBeVisible()
  expect(requests).toEqual([])
})

test('Persönliche Kaufideen starten erst nach Freigabe, passen zu echten Stücken und öffnen Schweizer Preisfilter mit gespeichertem Budget', async ({
  page,
  context,
}) => {
  const requests = await provider(context)
  await seed(page)
  expect(requests).toEqual([])
  await expect(start(page)).toBeDisabled()
  const budget = page.getByLabel('Höchstens pro Stück', { exact: true })
  expect(
    await budget
      .locator('option')
      .evaluateAll((options) =>
        options.map((option) => Number((option as HTMLOptionElement).value)),
      ),
  ).toEqual([25, 50, 75, 100])
  await budget.selectOption('75')
  await expect(budget).toHaveValue('75')
  await page.getByLabel('Sortiment', { exact: true }).selectOption('women')
  await consent(page).check()
  await start(page).click()
  const ideas = page.locator('.shopping-idea')
  await expect(ideas).toHaveCount(2)
  expect(requests).toHaveLength(1)
  expect(requests[0].budget).toMatchObject({
    hardMaximumPerItem: 75,
    preferBelow: 50,
  })
  expect(requests[0].assortment).toBe('women')
  for (const link of await ideas.getByRole('link').all()) {
    const url = new URL((await link.getAttribute('href'))!)
    expect(url.origin).toBe('https://www.zalando.ch')
    expect(url.pathname).toBe('/damen/')
    expect(Number(url.searchParams.get('price_to'))).toBeLessThanOrEqual(75)
    expect(await link.getAttribute('rel')).toContain('noopener')
  }
  await expect(
    ideas.first().getByRole('link', {
      name: 'Bis 50 CHF bei Zalando suchen',
      exact: false,
    }),
  ).toBeVisible()
  await expect(
    ideas.nth(1).getByRole('link', {
      name: 'Bis 25 CHF bei Zalando suchen',
      exact: false,
    }),
  ).toBeVisible()
  await expect(
    ideas.first().getByText('Blaues Hemd', { exact: true }),
  ).toBeVisible()
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.querySelector('dialog')!.scrollWidth <=
            document.querySelector('dialog')!.clientWidth + 1,
      ),
    ).toBe(true)
  }
  await context.route('https://www.zalando.ch/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>Kontrollierte Shop-Navigation</title><h1>Shopsuche</h1>',
    }),
  )
  const [shop] = await Promise.all([
    context.waitForEvent('page'),
    ideas
      .first()
      .getByRole('link', {
        name: 'Bis 50 CHF bei Zalando suchen',
        exact: false,
      })
      .click(),
  ])
  await shop.waitForLoadState('domcontentloaded')
  expect(new URL(shop.url()).searchParams.get('price_to')).toBe('50')
  await shop.close()
  await ideas
    .first()
    .getByRole('heading', { name: 'Beiges Overshirt', exact: true })
    .scrollIntoViewIfNeeded()
  await page.screenshot({ path: '/tmp/mystyle-shopping-dialog.png' })
  await page.reload()
  await page.getByRole('button', { name: 'Journal', exact: true }).click()
  await page
    .getByRole('button', { name: 'Mit KI günstig shoppen', exact: true })
    .click()
  await expect(
    page.getByLabel('Höchstens pro Stück', { exact: true }),
  ).toHaveValue('75')
  await expect(page.getByLabel('Sortiment', { exact: true })).toHaveValue(
    'women',
  )
  await expect(consent(page)).toBeChecked()
  expect(requests).toHaveLength(1)
})

for (const kind of ['price', 'limit'] as const)
  test(`Fehler ${kind} zeigt keine erfundenen Angebote und wiederholt Anfragen nicht automatisch`, async ({
    page,
    context,
  }) => {
    const requests = await provider(context, kind)
    await seed(page)
    await consent(page).check()
    await start(page).click()
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
      kind === 'price'
        ? 'keine prüfbaren Kaufideen'
        : 'Shopping-Beratung: Nutzungslimit des Dienstes erreicht.',
    )
    await expect(page.locator('.shopping-idea a')).toHaveCount(0)
    await expect(
      page.getByLabel('Höchstens pro Stück', { exact: true }),
    ).toHaveValue('50')
    expect(requests).toHaveLength(1)
  })

test('Fensterübergreifender Widerruf stoppt wartende Beratung; späte Antworten erzeugen keine Shopping-Links', async ({
  page,
  context,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  try {
    const requests = await provider(context, 'ok', gate)
    await seed(page)
    await consent(page).check()
    await start(page).click()
    await expect(
      page.getByRole('button', {
        name: 'Shopping-Beratung abbrechen',
        exact: true,
      }),
    ).toBeVisible()
    const other = await context.newPage()
    await other.goto('/')
    await other.getByRole('button', { name: 'Journal', exact: true }).click()
    await other
      .getByRole('button', { name: 'Mit KI günstig shoppen', exact: true })
      .click()
    await consent(other).uncheck()
    await expect(consent(page)).not.toBeChecked()
    release()
    await expect(start(page)).toBeDisabled()
    await expect(page.locator('.shopping-idea')).toHaveCount(0)
    expect(requests).toHaveLength(1)
  } finally {
    release()
  }
})

test('Eine Änderung am Bestand verwirft wartende Kaufideen und erhält das Budget', async ({
  page,
  context,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  try {
    await provider(context, 'ok', gate)
    await seed(page)
    await consent(page).check()
    await start(page).click()
    await expect(
      page.getByRole('button', {
        name: 'Shopping-Beratung abbrechen',
        exact: true,
      }),
    ).toBeVisible()
    const other = await context.newPage()
    await other.goto('/')
    await other.getByRole('button', { name: 'Garderobe', exact: true }).click()
    await other
      .getByRole('button', { name: 'Blaues Hemd öffnen', exact: true })
      .click()
    await other
      .getByRole('button', { name: 'In die Wäsche legen', exact: true })
      .click()
    await expect(
      page.getByText(
        'Dein Stil, Bestand oder Budget wurde geändert. Starte die Beratung erneut.',
        { exact: true },
      ),
    ).toBeVisible()
    release()
    await expect(page.locator('.shopping-idea')).toHaveCount(0)
    await expect(
      page.getByLabel('Höchstens pro Stück', { exact: true }),
    ).toHaveValue('50')
  } finally {
    release()
  }
})

test('Ein niedrigeres Budget entfernt alte Suchlinks sofort; neue Beratung übernimmt die neue Preisgrenze', async ({
  page,
  context,
}) => {
  const requests = await provider(context)
  await seed(page)
  await consent(page).check()
  await start(page).click()
  await expect(page.locator('.shopping-idea')).toHaveCount(2)
  await page
    .getByLabel('Höchstens pro Stück', { exact: true })
    .selectOption('25')
  await expect(page.locator('.shopping-idea')).toHaveCount(0)
  await expect(
    page.getByLabel('Höchstens pro Stück', { exact: true }),
  ).toHaveValue('25')
  await start(page).click()
  await expect(page.locator('.shopping-idea')).toHaveCount(2)
  expect(requests).toHaveLength(2)
  expect(requests[1].budget.hardMaximumPerItem).toBe(25)
  for (const link of await page.locator('.shopping-idea a').all())
    expect(
      new URL((await link.getAttribute('href'))!).searchParams.get('price_to'),
    ).toBe('25')
})
