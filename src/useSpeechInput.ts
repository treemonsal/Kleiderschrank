import { useEffect, useRef, useState } from 'react'

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>
      }) => void)
    | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechWindow = {
  SpeechRecognition?: new () => Recognition
  webkitSpeechRecognition?: new () => Recognition
}
export function useSpeechInput(onText: (text: string) => void) {
  const api = window as unknown as SpeechWindow
  const Constructor = api.SpeechRecognition ?? api.webkitSpeechRecognition
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognition = useRef<Recognition | null>(null)
  const active = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  const callback = useRef(onText)
  callback.current = onText
  function cancel() {
    window.clearTimeout(timer.current)
    active.current++
    const current = recognition.current
    recognition.current = null
    if (current) {
      current.onresult = null
      current.onend = null
      current.onerror = null
      current.abort()
    }
    setListening(false)
  }
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel()
    }
    document.addEventListener('visibilitychange', hidden)
    return () => {
      document.removeEventListener('visibilitychange', hidden)
      active.current++
      window.clearTimeout(timer.current)
      recognition.current?.abort()
    }
  }, [])
  function start(base: string) {
    if (!Constructor) return
    cancel()
    setError('')
    const token = ++active.current
    const next = new Constructor()
    recognition.current = next
    next.lang = 'de-DE'
    next.continuous = false
    next.interimResults = true
    next.onresult = (event) => {
      if (token !== active.current) return
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim()
      callback.current([base.trim(), text].filter(Boolean).join(' '))
    }
    next.onerror = (event) => {
      if (token !== active.current) return
      cancel()
      if (event.error !== 'aborted')
        setError(
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'Mikrofon nicht freigegeben. Du kannst deine Frage tippen oder die Diktierfunktion deiner Tastatur verwenden.'
            : 'Die Spracheingabe ist gerade nicht verfügbar. Deine Frage bleibt zum Bearbeiten erhalten.',
        )
    }
    next.onend = () => {
      if (token === active.current) {
        active.current++
        recognition.current = null
        window.clearTimeout(timer.current)
        setListening(false)
      }
    }
    try {
      next.start()
      setListening(true)
      timer.current = window.setTimeout(() => {
        if (token === active.current) cancel()
      }, 30000)
    } catch {
      setError(
        'Die Spracheingabe konnte nicht starten. Bitte tippe deine Frage.',
      )
      setListening(false)
    }
  }
  return {
    supported: !!Constructor,
    listening,
    error,
    start,
    cancel,
    finish: () => recognition.current?.stop(),
  }
}

let readingSequence = 0
export function stopReading() {
  readingSequence++
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* Browser voice service unavailable. */
  }
}
export function readAnswer(
  text: string,
  onEnd?: () => void,
  onError?: () => void,
) {
  if (
    !window.speechSynthesis ||
    typeof SpeechSynthesisUtterance === 'undefined'
  )
    return false
  try {
    stopReading()
    const token = readingSequence
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'de-DE'
    utterance.onend = () => {
      if (token === readingSequence) onEnd?.()
    }
    utterance.onerror = () => {
      if (token === readingSequence) {
        onEnd?.()
        onError?.()
      }
    }
    window.speechSynthesis.speak(utterance)
    return true
  } catch {
    return false
  }
}
