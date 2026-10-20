import { test, expect, type Page } from '@playwright/test'

const stamp = '2026-01-01T00:00:00.000Z'
async function seed(page: Page, existing = false) {
  await page.route('https://**', (route) => route.abort())
  await page.goto('/')
  await page.getByRole('button', { name: 'Mehr', exact: true }).click()
  await page.getByLabel('Sicherungsdatei', { exact: true }).setInputFiles({
    name: 'interview-draft.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'MyStyle',
        version: 6,
        garments: [],
        outfits: [],
        feedback: [],
        calendar: [],
        weather: null,
        chat: null,
        preferences: {
          id: 'personal',
          styles: [],
          colors: [],
          updatedAt: stamp,
          styleProfile: {
            version: 1,
            status: 'completed',
            colorMood: 'balanced',
            variety: 'balanced',
            usualOccasion: 'Alltag',
            avoidColors: [],
          },
          styleInterview: {
            version: 1,
            status: 'in-progress',
            updatedAt: stamp,
            answers: {
              focus: 'Klar & elegant',
              ...(existing ? { avoid: 'Keine kratzigen Stoffe' } : {}),
            },
            skipped: ['fit', 'day', 'temperature', 'patterns', 'accessories'],
          },
        },
      }),
    ),
  })
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Sicherung importieren', exact: true })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}
async function open(page: Page) {
  await page
    .getByRole('button', { name: 'Mit deinem Stylisten sprechen', exact: true })
    .click()
  const panel = page.getByRole('region', { name: 'Freiwilliges Stilgespräch' })
  await panel
    .getByRole('button', { name: 'Stilgespräch fortsetzen', exact: true })
    .click()
  return panel
}

test('Unbestätigte Freitextantwort bleibt bei X, Escape und Hintergrund geschützt und wird nie still gespeichert', async ({
  page,
}) => {
  await seed(page)
  let panel = await open(page)
  const answer = panel.getByRole('textbox', {
    name: 'Deine Antwort (freiwillig)',
  })
  await answer.fill('Keine hohen Schuhe')
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(
    page.getByText('Ungespeicherte Änderungen verwerfen?'),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Weiter bearbeiten', exact: true })
    .click()
  await expect(answer).toHaveValue('Keine hohen Schuhe')
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Verwerfen', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Weiter bearbeiten', exact: true })
    .click()
  await page.mouse.click(2, 2)
  await expect(
    page.getByRole('button', { name: 'Verwerfen', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Verwerfen', exact: true }).click()
  panel = await open(page)
  await expect(
    panel.getByRole('textbox', { name: 'Deine Antwort (freiwillig)' }),
  ).toHaveValue('')
  await expect(
    panel.getByRole('heading', {
      name: 'Was ziehst du ungern an?',
      exact: true,
    }),
  ).toBeVisible()
})

test('Pausieren und Frage wechseln schützen Entwurf; unveränderte vorhandene Antwort braucht keine Verwerfwarnung', async ({
  page,
}) => {
  await seed(page)
  let panel = await open(page)
  const answer = panel.getByRole('textbox', {
    name: 'Deine Antwort (freiwillig)',
  })
  await answer.fill('Keine hohen Schuhe')
  await panel
    .getByRole('button', { name: 'Später weiter', exact: true })
    .click()
  await expect(
    panel.getByText(
      'Deine Antwort ist noch nicht gespeichert. Entwurf verwerfen?',
    ),
  ).toBeVisible()
  await panel
    .getByRole('button', { name: 'Weiter beantworten', exact: true })
    .click()
  await expect(answer).toHaveValue('Keine hohen Schuhe')
  await panel
    .getByText('Antworten & offene Fragen ansehen', { exact: true })
    .click()
  await panel
    .getByRole('button', {
      name: 'Welche Seite deines Stils möchtest du stärker zeigen? ändern',
      exact: true,
    })
    .click()
  await panel
    .getByRole('button', { name: 'Entwurf verwerfen', exact: true })
    .click()
  await expect(
    panel.getByRole('button', { name: 'Klar & elegant', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await panel
    .getByRole('button', { name: 'Später weiter', exact: true })
    .click()
  await expect(
    panel.getByRole('button', { name: 'Stilgespräch fortsetzen', exact: true }),
  ).toBeVisible()
  await expect(
    panel.getByRole('button', { name: 'Entwurf verwerfen', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  panel = await open(page)
  await expect(
    panel.getByRole('textbox', { name: 'Deine Antwort (freiwillig)' }),
  ).toHaveValue('')
})

test('Bearbeiteter Antwortentwurf bleibt bei Mehrfenster-Konflikt sichtbar und kann keine neuere Antwort überschreiben', async ({
  page,
  context,
}) => {
  await seed(page, true)
  const panel = await open(page)
  await panel
    .getByText('Antworten & offene Fragen ansehen', { exact: true })
    .click()
  await panel
    .getByRole('button', {
      name: 'Was ziehst du ungern an? ändern',
      exact: true,
    })
    .click()
  const answer = panel.getByRole('textbox', {
    name: 'Deine Antwort (freiwillig)',
  })
  await expect(answer).toHaveValue('Keine kratzigen Stoffe')
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await open(page)
  await panel
    .getByText('Antworten & offene Fragen ansehen', { exact: true })
    .click()
  await panel
    .getByRole('button', {
      name: 'Was ziehst du ungern an? ändern',
      exact: true,
    })
    .click()
  await answer.fill('Mein unbestätigter Entwurf')
  const other = await context.newPage()
  await other.route('https://**', (route) => route.abort())
  await other.goto('/')
  const second = await open(other)
  await second
    .getByText('Antworten & offene Fragen ansehen', { exact: true })
    .click()
  await second
    .getByRole('button', {
      name: 'Was ziehst du ungern an? ändern',
      exact: true,
    })
    .click()
  await second
    .getByRole('textbox', { name: 'Deine Antwort (freiwillig)' })
    .fill('Neuere bestätigte Antwort')
  await second
    .getByRole('button', { name: 'Antwort speichern', exact: true })
    .click()
  await expect(
    panel.getByRole('button', {
      name: 'Neu laden und Entwurf verwerfen',
      exact: true,
    }),
  ).toBeVisible()
  await expect(answer).toHaveValue('Mein unbestätigter Entwurf')
  await expect(
    panel.getByRole('button', { name: 'Antwort speichern', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Verwerfen', exact: true }),
  ).toBeVisible()
})

test('Eine fremde Antwort auf die aktuelle Frage verschiebt den lokalen Entwurf nicht unter die nächste Frage', async ({
  page,
  context,
}) => {
  await seed(page)
  const panel = await open(page)
  const answer = panel.getByRole('textbox', {
    name: 'Deine Antwort (freiwillig)',
  })
  await answer.fill('Mein Entwurf zur ungeliebten Kleidung')
  const other = await context.newPage()
  await other.route('https://**', (route) => route.abort())
  await other.goto('/')
  const second = await open(other)
  await second
    .getByRole('textbox', { name: 'Deine Antwort (freiwillig)' })
    .fill('Bestätigte Antwort im anderen Fenster')
  await second
    .getByRole('button', { name: 'Antwort speichern', exact: true })
    .click()
  await expect(
    panel.getByRole('button', {
      name: 'Neu laden und Entwurf verwerfen',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    panel.getByRole('heading', {
      name: 'Was ziehst du ungern an?',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    panel.getByRole('heading', {
      name: 'Was inspiriert deinen Stil?',
      exact: true,
    }),
  ).toHaveCount(0)
  await expect(answer).toHaveValue('Mein Entwurf zur ungeliebten Kleidung')
  await expect(
    panel.getByRole('button', { name: 'Antwort speichern', exact: true }),
  ).toBeDisabled()
  await panel
    .getByRole('button', {
      name: 'Neu laden und Entwurf verwerfen',
      exact: true,
    })
    .click()
  await expect(
    panel.getByRole('heading', {
      name: 'Was inspiriert deinen Stil?',
      exact: true,
    }),
  ).toBeVisible()
  await expect(answer).toHaveValue('')
})

test('Blockierter Schreibvorgang sperrt Schliessen und eine bereits offene lokale Verwerfen-Rückfrage', async ({
  page,
}) => {
  await seed(page)
  const panel = await open(page)
  await panel
    .getByRole('textbox', { name: 'Deine Antwort (freiwillig)' })
    .fill('Bewusst gespeicherte Antwort')
  await panel
    .getByRole('button', { name: 'Später weiter', exact: true })
    .click()
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('mystyle-private-wardrobe')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const database = request.result
          const transaction = database.transaction('preferences', 'readwrite')
          let hold = true
          ;(
            window as unknown as { releaseInterviewWrite: () => void }
          ).releaseInterviewWrite = () => {
            hold = false
          }
          transaction.oncomplete = () => database.close()
          const keepOpen = () => {
            transaction
              .objectStore('preferences')
              .get('review-lock').onsuccess = () => {
              if (hold) keepOpen()
            }
          }
          keepOpen()
          resolve()
        }
      }),
  )
  try {
    await panel
      .getByRole('button', { name: 'Antwort speichern', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Schliessen', exact: true }),
    ).toBeDisabled()
    await expect(
      panel.getByRole('button', { name: 'Entwurf verwerfen', exact: true }),
    ).toBeDisabled()
    await expect(
      panel.getByRole('button', { name: 'Weiter beantworten', exact: true }),
    ).toBeDisabled()
  } finally {
    await page.evaluate(() =>
      (
        window as unknown as { releaseInterviewWrite: () => void }
      ).releaseInterviewWrite(),
    )
  }
  await expect(
    panel.getByRole('heading', {
      name: 'Was inspiriert deinen Stil?',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    panel.getByRole('button', { name: 'Entwurf verwerfen', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Schliessen', exact: true }),
  ).toBeEnabled()
})
