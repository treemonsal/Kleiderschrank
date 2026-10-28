import type { Page } from '@playwright/test'

/**
 * Today only shows a week strip (no arrows). Steps one day by tapping the
 * neighbour in the strip, or swipes on the day card when it lies outside
 * the visible week.
 */
export async function stepDay(page: Page, offset: -1 | 1) {
  const before = await page.locator('.daily-look').getAttribute('data-day')
  const tapped = await page
    .locator('.home-week-strip')
    .evaluate((strip, offset) => {
      const buttons = [...strip.querySelectorAll('button')]
      const index = buttons.findIndex(
        (button) => button.getAttribute('aria-pressed') === 'true',
      )
      const target = buttons[index + offset]
      if (!target) return false
      target.click()
      return true
    }, offset)
  if (!tapped)
    await page.locator('.home-day-browser').evaluate((node, offset) => {
      const point = (x: number) =>
        new Touch({ identifier: 1, target: node, clientX: x, clientY: 300 })
      const end = 195 - offset * 120
      node.dispatchEvent(
        new TouchEvent('touchstart', { bubbles: true, touches: [point(195)] }),
      )
      node.dispatchEvent(
        new TouchEvent('touchmove', { bubbles: true, touches: [point(end)] }),
      )
      node.dispatchEvent(
        new TouchEvent('touchend', {
          bubbles: true,
          touches: [],
          changedTouches: [point(end)],
        }),
      )
    }, offset)
  await page.waitForFunction(
    (before) =>
      document.querySelector('.daily-look')?.getAttribute('data-day') !==
      before,
    before,
  )
}

/** Selects a day in the Journal calendar, paging months as needed. */
export async function pickJournalDay(page: Page, day: string) {
  const calendar = page.getByRole('region', { name: 'Outfit-Kalender' })
  for (let step = 0; step < 36; step++) {
    const cell = calendar.locator(`.calendar-grid button[data-day="${day}"]`)
    if (await cell.count()) {
      await cell.click()
      return
    }
    const first = await calendar
      .locator('.calendar-grid button[data-day]')
      .first()
      .getAttribute('data-day')
    await calendar
      .getByRole('button', {
        name: day < first! ? 'Vorheriger Monat' : 'Nächster Monat',
        exact: true,
      })
      .click()
  }
  throw new Error(`Tag ${day} nicht gefunden`)
}
