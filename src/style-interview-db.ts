import { db } from './db'
import { DEFAULT_OUTFIT_OPTIONS, DEFAULT_PREFERENCES } from './outfit-model'
import { UserFacingError } from './constraints'
import {
  parseStyleInterview,
  type StyleInterview,
  type StyleQuestionId,
} from './style-interview'

export type InterviewChange =
  | { type: 'answer'; question: StyleQuestionId; answer: string | null }
  | { type: 'start' | 'complete' | 'dismiss' | 'reset' }

/** Compare the interview revision inside the same transaction; never replace newer answers. */
export async function updateStyleInterview(
  change: InterviewChange,
  expected: string | null,
  database = db,
) {
  return database.transaction('rw', database.preferences, async () => {
    const current =
      (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES
    if ((current.styleInterview?.updatedAt ?? null) !== expected)
      throw new UserFacingError(
        'Deine Antworten wurden inzwischen geändert. Schliesse das Stilgespräch und öffne es erneut.',
      )
    const updatedAt = new Date(
      Math.max(
        Date.now(),
        Date.parse(current.updatedAt) + 1,
        Date.parse(expected ?? '') + 1 || 0,
      ),
    ).toISOString()
    const interview: StyleInterview =
      change.type === 'dismiss' || change.type === 'reset'
        ? {
            version: 1,
            status: 'dismissed',
            answers: {},
            skipped: [],
            updatedAt,
          }
        : {
            version: 1,
            status: 'in-progress',
            answers: { ...current.styleInterview?.answers },
            skipped: [...(current.styleInterview?.skipped ?? [])],
            updatedAt,
          }
    if (change.type === 'complete') interview.status = 'completed'
    if (change.type === 'answer') {
      delete interview.answers[change.question]
      interview.skipped = interview.skipped.filter((q) => q !== change.question)
      if (change.answer === null) interview.skipped.push(change.question)
      else interview.answers[change.question] = change.answer
      // Editing a completed interview keeps its other confirmed answers in use.
      if (current.styleInterview?.status === 'completed')
        interview.status = 'completed'
    }
    const parsed = parseStyleInterview(interview)
    await database.preferences.put({
      ...current,
      styleInterview: parsed,
      dailySelection:
        change.type === 'answer' || change.type === 'reset'
          ? undefined
          : current.dailySelection,
      ...(change.type === 'answer' &&
      change.question === 'accessories' &&
      change.answer !== null
        ? {
            outfitOptions: {
              ...DEFAULT_OUTFIT_OPTIONS,
              ...current.outfitOptions,
              includeAccessory: change.answer !== 'Lieber ohne Extras',
            },
          }
        : {}),
      updatedAt,
    })
    return parsed
  })
}
