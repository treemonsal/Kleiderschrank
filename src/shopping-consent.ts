export const SHOPPING_CONSENT_KEY = 'mystyle-shopping-consent'
export const SHOPPING_CONSENT_CHANGED = 'mystyle-shopping-consent-changed'
export function shoppingEnabled() {
  try {
    return localStorage.getItem(SHOPPING_CONSENT_KEY) === 'enabled-v1'
  } catch {
    return false
  }
}
export function setShoppingEnabled(enabled: boolean) {
  if (enabled) localStorage.setItem(SHOPPING_CONSENT_KEY, 'enabled-v1')
  else localStorage.removeItem(SHOPPING_CONSENT_KEY)
  window.dispatchEvent(new Event(SHOPPING_CONSENT_CHANGED))
}
