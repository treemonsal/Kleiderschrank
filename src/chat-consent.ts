export const CHAT_CONSENT_KEY = 'mystyle-chat-consent'
export function chatEnabled() {
  try {
    return localStorage.getItem(CHAT_CONSENT_KEY) === 'enabled-v1'
  } catch {
    return false
  }
}
export function setChatEnabled(enabled: boolean) {
  if (enabled) localStorage.setItem(CHAT_CONSENT_KEY, 'enabled-v1')
  else localStorage.removeItem(CHAT_CONSENT_KEY)
}
