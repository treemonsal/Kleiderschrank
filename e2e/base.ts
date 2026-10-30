import {
  test as playwrightTest,
  type BrowserContext,
  type BrowserContextOptions,
} from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
export { expect } from '@playwright/test'
export type { Page, Locator, BrowserContext } from '@playwright/test'

type NewDevice = (options?: BrowserContextOptions) => Promise<BrowserContext>

/**
 * WebKit has no Touch constructor, so tests could not synthesise a swipe.
 * The app never checks for these classes; it only reads the touch lists.
 */
function touchShim() {
  try {
    new Touch({ identifier: 0, target: document })
    return
  } catch {
    // Replace below.
  }
  type Init = TouchEventInit & Record<string, unknown>
  class ShimTouch {
    constructor(init: TouchInit) {
      Object.assign(this, {
        pageX: init.clientX,
        pageY: init.clientY,
        screenX: init.clientX,
        screenY: init.clientY,
        ...init,
      })
    }
  }
  class ShimTouchEvent extends UIEvent {
    constructor(type: string, init: Init = {}) {
      super(type, init)
      for (const key of ['touches', 'targetTouches', 'changedTouches'])
        Object.defineProperty(this, key, { value: init[key] ?? [] })
    }
  }
  for (const [name, value] of [
    ['Touch', ShimTouch],
    ['TouchEvent', ShimTouchEvent],
  ] as const)
    Object.defineProperty(window, name, {
      value,
      configurable: true,
      writable: true,
    })
}

/**
 * WebKit refuses to keep photos (Blobs) in IndexedDB in an ephemeral session,
 * exactly like Safari's private browsing. Playwright's normal contexts are
 * ephemeral, so on WebKit every context gets its own profile on disk instead.
 * Chromium keeps the regular contexts.
 */
export const test = playwrightTest.extend<{ newDevice: NewDevice }>({
  newDevice: async (
    { browser, browserName, playwright, launchOptions, headless },
    use,
  ) => {
    const opened: BrowserContext[] = []
    const folders: string[] = []
    await use(async (options = {}) => {
      if (browserName !== 'webkit') return browser.newContext(options)
      const folder = await mkdtemp(join(tmpdir(), 'mystyle-webkit-'))
      folders.push(folder)
      const context = await playwright.webkit.launchPersistentContext(folder, {
        ...launchOptions,
        headless,
        ...options,
      })
      // A persistent profile opens with a blank page; tests open their own.
      for (const page of context.pages()) await page.close()
      await context.addInitScript(touchShim)
      opened.push(context)
      return context
    })
    for (const context of opened) await context.close().catch(() => {})
    for (const folder of folders)
      await rm(folder, { recursive: true, force: true }).catch(() => {})
  },
  context: async (
    {
      browserName,
      newDevice,
      context: _unused,
      baseURL,
      contextOptions,
      deviceScaleFactor,
      hasTouch,
      isMobile,
      locale,
      offline,
      permissions,
      geolocation,
      serviceWorkers,
      timezoneId,
      userAgent,
      viewport,
      colorScheme,
    },
    use,
  ) => {
    if (browserName !== 'webkit') return use(_unused)
    await use(
      await newDevice({
        ...contextOptions,
        baseURL,
        deviceScaleFactor,
        hasTouch,
        isMobile,
        locale,
        offline,
        permissions,
        geolocation,
        serviceWorkers,
        timezoneId,
        userAgent,
        viewport,
        colorScheme,
      }),
    )
  },
})
