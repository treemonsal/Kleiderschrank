import type { Style } from './model'
import type { Preferences } from './outfit-model'

export const STYLE_QUESTIONS = [
  {
    id: 'focus',
    title: 'Welche Seite deines Stils möchtest du stärker zeigen?',
    hint: 'Diese Richtung bekommt bei neuen Kombinationen etwas mehr Gewicht.',
    choices: [
      'Lässig & reduziert',
      'Klar & elegant',
      'Sportlich & entspannt',
      'Markant & experimentell',
    ],
  },
  {
    id: 'fit',
    title: 'In welchen Schnitten fühlst du dich wohl?',
    hint: 'Das hilft bei Stylingtipps. Die tatsächliche Passform deiner Stücke bleibt ungeprüft.',
    choices: [
      'Eher körpernah',
      'Gerade & entspannt',
      'Weit & locker',
      'Je nach Anlass',
    ],
  },
  {
    id: 'day',
    title: 'Wie sieht ein typischer Tag bei dir aus?',
    hint: 'Dein Outfit soll zu deinem Alltag passen.',
    choices: [
      'Viel zu Fuss & unterwegs',
      'Meist drinnen am Schreibtisch',
      'Drinnen & draussen im Wechsel',
      'Jeder Tag ist anders',
    ],
  },
  {
    id: 'temperature',
    title: 'Wie empfindest du Temperaturen?',
    hint: 'Ein Hinweis für die Beratung. Wärme und Schutz lassen sich aus Kleidungsangaben nicht sicher ableiten.',
    choices: [
      'Ich friere schnell',
      'Mir wird schnell warm',
      'Meist ausgeglichen',
    ],
  },
  {
    id: 'patterns',
    title: 'Wie viel Muster darf es sein?',
    hint: 'Der Chat berücksichtigt das, soweit deine Angaben oder Fotos es erlauben.',
    choices: [
      'Lieber unifarben',
      'Dezente Muster',
      'Auch auffällige Muster',
      'Ganz offen',
    ],
  },
  {
    id: 'accessories',
    title: 'Wie möchtest du Accessoires einsetzen?',
    hint: 'Deine Antwort stellt auch die Accessoire-Option für neue Outfitvorschläge ein. Du kannst sie dort jederzeit ändern.',
    choices: [
      'Lieber ohne Extras',
      'Ein Akzent, wenn es passt',
      'Gern ein Accessoire',
    ],
  },
  {
    id: 'avoid',
    title: 'Was ziehst du ungern an?',
    hint: 'Zum Beispiel kratzige Stoffe, hohe Schuhe oder auffällige Logos. Schreib nur, was für deine Beratung wichtig ist.',
    placeholder: 'Das möchte ich eher vermeiden …',
  },
  {
    id: 'inspiration',
    title: 'Was inspiriert deinen Stil?',
    hint: 'Zum Beispiel eine Marke, eine Person oder eine Stimmung. Ein paar Worte reichen; es werden keine Profile oder Links aufgerufen.',
    placeholder: 'Daran orientiere ich mich gern …',
  },
] as const

export type StyleQuestionId = (typeof STYLE_QUESTIONS)[number]['id']
export interface StyleInterview {
  version: 1
  status: 'in-progress' | 'completed' | 'dismissed'
  answers: Partial<Record<StyleQuestionId, string>>
  skipped: StyleQuestionId[]
  updatedAt: string
}
export const MAX_STYLE_ANSWER = 240
export function parseStyleInterview(value: unknown): StyleInterview {
  const p = value as StyleInterview | null
  const invalid = () => new Error('Das vertiefte Stilprofil ist ungültig.')
  if (
    !p ||
    p.version !== 1 ||
    !['in-progress', 'completed', 'dismissed'].includes(p.status) ||
    !p.answers ||
    typeof p.answers !== 'object' ||
    Array.isArray(p.answers) ||
    !Array.isArray(p.skipped) ||
    p.skipped.length > STYLE_QUESTIONS.length ||
    typeof p.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(p.updatedAt)) ||
    new Date(p.updatedAt).toISOString() !== p.updatedAt
  )
    throw invalid()
  const ids = STYLE_QUESTIONS.map((q) => q.id)
  if (
    Object.keys(p.answers).some(
      (key) => !ids.includes(key as StyleQuestionId),
    ) ||
    p.skipped.some((key) => !ids.includes(key)) ||
    new Set(p.skipped).size !== p.skipped.length
  )
    throw invalid()
  const answers: StyleInterview['answers'] = {}
  for (const question of STYLE_QUESTIONS) {
    const answer = p.answers[question.id]
    if (answer === undefined) continue
    if (
      typeof answer !== 'string' ||
      !answer.trim() ||
      answer.length > MAX_STYLE_ANSWER ||
      p.skipped.includes(question.id) ||
      ('choices' in question &&
        !(question.choices as readonly string[]).includes(answer))
    )
      throw invalid()
    answers[question.id] = answer.trim()
  }
  if (
    p.status === 'dismissed' &&
    (Object.keys(answers).length || p.skipped.length)
  )
    throw invalid()
  return {
    version: 1,
    status: p.status,
    answers,
    skipped: [...p.skipped],
    updatedAt: p.updatedAt,
  }
}
export function nextStyleQuestion(interview?: StyleInterview) {
  return STYLE_QUESTIONS.find(
    (q) => !interview?.answers[q.id] && !interview?.skipped.includes(q.id),
  )
}
export function interviewNotice(preferences: Preferences): string | undefined {
  const interview = preferences.styleInterview
  if (interview?.status === 'in-progress') {
    const question = nextStyleQuestion(interview)
    return question
      ? `question:${question.id}:${interview.updatedAt}`
      : undefined
  }
  if (!interview && preferences.styleProfile?.status === 'completed')
    return 'invitation:style-interview-v1'
}
/** Only confirmed answers go to an explicitly started online consultation. */
export function interviewContext(preferences: Preferences) {
  const interview = preferences.styleInterview
  if (!interview || interview.status === 'dismissed') return undefined
  return STYLE_QUESTIONS.flatMap((question) => {
    const answer = interview.answers[question.id]
    return answer ? [{ question: question.title, answer }] : []
  })
}
export function interviewStyles(preferences: Preferences): readonly Style[] {
  const focus = preferences.styleInterview?.answers.focus
  const styles: Record<string, Style[]> = {
    'Lässig & reduziert': ['Casual', 'Minimalistisch'],
    'Klar & elegant': ['Elegant', 'Minimalistisch'],
    'Sportlich & entspannt': ['Sportlich'],
    'Markant & experimentell': ['Streetwear', 'Vintage'],
  }
  return focus ? (styles[focus] ?? []) : []
}
