import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { FakeDrive } from '../tests/fixtures/fake-drive'

// Network mocks use page.route, which a controlling service worker bypasses.
test.use({ serviceWorkers: 'block' })

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers':
    'authorization, content-type, x-upload-content-type',
  'access-control-allow-methods': 'GET, POST, PATCH, PUT, DELETE',
  'access-control-expose-headers': 'location',
}

const signIns: URL[] = []
/** A device (browser profile) wired to Google sign-in and a shared Drive. */
async function device(context: BrowserContext, drive: FakeDrive) {
  await context.addInitScript(() => {
    ;(
      window as unknown as { __MYSTYLE_GOOGLE_CLIENT_ID__: string }
    ).__MYSTYLE_GOOGLE_CLIENT_ID__ = 'test-client.apps.googleusercontent.com'
  })
  await context.route('https://accounts.google.com/**', (route) => {
    const url = new URL(route.request().url())
    signIns.push(url)
    const back = new URL(url.searchParams.get('redirect_uri')!)
    back.hash = new URLSearchParams({
      access_token: drive.token,
      token_type: 'Bearer',
      expires_in: '3600',
      scope: 'https://www.googleapis.com/auth/drive.appdata openid email',
      state: url.searchParams.get('state')!,
    }).toString()
    return route.fulfill({ status: 302, headers: { location: back.href } })
  })
  await context.route('https://openidconnect.googleapis.com/**', (route) =>
    route.fulfill({
      headers: cors,
      json: { sub: 'konto-1', email: 'tim@example.com' },
    }),
  )
  await context.route('https://www.googleapis.com/**', async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: cors })
    const response = drive.handle(
      request.method(),
      request.url(),
      request.headers(),
      new Uint8Array(request.postDataBuffer() ?? []),
    )
    return route.fulfill({
      status: response.status,
      headers: { ...cors, ...response.headers },
      body:
        typeof response.body === 'string'
          ? response.body
          : Buffer.from(response.body),
    })
  })
  const page = await context.newPage()
  await page.goto('/')
  return page
}

async function addPiece(page: Page, name: string, category: string) {
  await page.getByRole('button', { name: 'Garderobe', exact: true }).click()
  await page
    .getByRole('button', { name: 'Stück hinzufügen', exact: true })
    .first()
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Name', { exact: false }).fill(name)
  await dialog
    .getByRole('combobox', { name: 'Kategorie', exact: true })
    .selectOption(category)
  await dialog.getByRole('button', { name: 'In die Garderobe legen' }).click()
  await expect(dialog).not.toBeVisible()
}

async function signIn(page: Page) {
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Mit Google anmelden', exact: true })
    .click()
  await expect(page.locator('.toast')).toContainText(
    'Angemeldet als tim@example.com',
  )
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await expect(page.getByText(/Zuletzt abgeglichen/)).toBeVisible()
}

test('Ohne eingerichtete Google-Anmeldung zeigt die App keinen Anmeldeknopf', async ({
  page,
}) => {
  await page.addInitScript(() => {
    ;(
      window as unknown as { __MYSTYLE_GOOGLE_CLIENT_ID__: string }
    ).__MYSTYLE_GOOGLE_CLIENT_ID__ = ''
  })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'Sicherung' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Mit Google anmelden' }),
  ).toHaveCount(0)
})

test('Zwei Geräte mit demselben Google-Konto teilen Stücke und Löschungen', async ({
  browser,
}, info) => {
  const drive = new FakeDrive()
  const options = {
    ...info.project.use,
    serviceWorkers: 'block' as const,
  }
  const phone = await browser.newContext(options)
  const laptop = await browser.newContext(options)
  try {
    const a = await device(phone, drive)
    await addPiece(a, 'Blaues Hemd', 'Oberteile')
    await addPiece(a, 'Graue Hose', 'Hosen')
    await signIn(a)
    expect(a.url()).not.toContain('access_token')
    expect(drive.byName('mystyle-sync.json')).toBeDefined()

    const b = await device(laptop, drive)
    await signIn(b)
    await b.getByRole('button', { name: 'Garderobe', exact: true }).click()
    await expect(
      b.getByRole('button', { name: 'Blaues Hemd öffnen', exact: true }),
    ).toBeVisible()
    await b
      .getByRole('button', { name: 'Graue Hose öffnen', exact: true })
      .click()
    await b.getByRole('button', { name: 'Stück löschen', exact: true }).click()
    await b
      .getByRole('button', { name: 'Endgültig löschen', exact: true })
      .click()
    // Local changes are uploaded a few seconds later on their own.
    await expect
      .poll(
        () =>
          new TextDecoder().decode(drive.byName('mystyle-sync.json')!.bytes),
        { timeout: 15000 },
      )
      .not.toContain('Graue Hose')

    await a
      .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
      .click()
    await a
      .getByRole('button', { name: 'Jetzt abgleichen', exact: true })
      .click()
    await a.getByRole('button', { name: 'Garderobe', exact: true }).click()
    await expect(
      a.getByRole('button', { name: 'Graue Hose öffnen', exact: true }),
    ).toHaveCount(0)
    await expect(
      a.getByRole('button', { name: 'Blaues Hemd öffnen', exact: true }),
    ).toBeVisible()

    // Signing out keeps everything on the device.
    await a
      .getByRole('button', { name: 'Einstellungen öffnen', exact: true })
      .click()
    await a.getByRole('button', { name: 'Abmelden', exact: true }).click()
    await expect(
      a.getByRole('button', { name: 'Mit Google anmelden', exact: true }),
    ).toBeVisible()
    await a.getByRole('button', { name: 'Garderobe', exact: true }).click()
    await expect(
      a.getByRole('button', { name: 'Blaues Hemd öffnen', exact: true }),
    ).toBeVisible()
  } finally {
    await phone.close()
    await laptop.close()
  }
})

test('Eine abgelaufene Anmeldung wird beim App-Start mit einer Weiterleitung erneuert', async ({
  browser,
}, info) => {
  const drive = new FakeDrive()
  const context = await browser.newContext({
    ...info.project.use,
    serviceWorkers: 'block',
  })
  try {
    await context.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.setItem(
        'mystyle-google-sync',
        JSON.stringify({
          accessToken: 'alt',
          expiresAt: Date.now() - 1000,
          email: 'tim@example.com',
          sub: 'konto-1',
        }),
      )
    })
    const page = await device(context, drive)
    await expect(page.locator('.toast')).toContainText(
      'Angemeldet als tim@example.com',
    )
    expect(signIns.at(-1)?.searchParams.get('login_hint')).toBe(
      'tim@example.com',
    )
    await expect.poll(() => !!drive.byName('mystyle-sync.json')).toBe(true)
  } finally {
    await context.close()
  }
})
