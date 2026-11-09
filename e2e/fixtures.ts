import { test as base } from './base'
export { expect } from './base'
export type { Page, Locator, BrowserContext } from './base'

/**
 * Existing provider tests simulate a single AI service. They opt out of the
 * automatic backup providers so no real network request is made; dedicated
 * fallback tests use the plain Playwright `test` instead.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      ;(
        window as unknown as Record<string, boolean>
      ).__MYSTYLE_NO_AI_FALLBACK__ = true
    })
    await use(context)
  },
})
