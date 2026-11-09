import { db, saveOutfit } from './db'
import { DEFAULT_PREFERENCES } from './outfit-model'
import { localDay } from './calendar'
import { weatherFresh } from './weather'
import { UserFacingError } from './constraints'
import {
  MAX_CHAT_MESSAGES,
  MAX_CHAT_INPUT,
  buildChatContext,
  chatRevision,
  parseChatReply,
  validateChatLook,
  type ChatData,
  type ChatMessage,
} from './chat-model'

export async function readChatData(database = db): Promise<ChatData> {
  return database.transaction('r', database.tables, async () => ({
    garments: await database.garments.toArray(),
    preferences:
      (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES,
    feedback: await database.feedback.toArray(),
    outfits: await database.outfits.toArray(),
    calendar: await database.calendar.toArray(),
    weather: await database.weather.get('local'),
    chat: await database.chat.get('stylist'),
  }))
}
export async function appendChatTurn(
  question: string,
  result: unknown,
  expected: string,
  signal: AbortSignal,
  database = db,
) {
  return database.transaction('rw', database.tables, async () => {
    signal.throwIfAborted()
    const data = await readChatData(database)
    if (
      chatRevision(data) !== expected ||
      !question.trim() ||
      question.length > MAX_CHAT_INPUT
    )
      throw new UserFacingError(
        'Dein Gespräch, Tag oder Kleiderschrank wurde inzwischen geändert. Bitte sende deine Frage erneut.',
      )
    const reply = parseChatReply(result, buildChatContext(data, question))
    const createdAt = new Date(
      Math.max(Date.now(), Date.parse(data.chat?.updatedAt ?? '') + 1 || 0),
    ).toISOString()
    const messages: ChatMessage[] = [
      ...(data.chat?.messages ?? []),
      {
        id: crypto.randomUUID(),
        role: 'user',
        text: question.trim(),
        createdAt,
      },
      { id: crypto.randomUUID(), role: 'assistant', ...reply, createdAt },
    ]
    signal.throwIfAborted()
    await database.chat.put({
      id: 'stylist',
      revision: crypto.randomUUID(),
      updatedAt: createdAt,
      messages: messages.slice(-MAX_CHAT_MESSAGES),
    })
    signal.throwIfAborted()
  })
}
export async function clearChat(database = db) {
  await database.transaction('rw', database.chat, async () => {
    const current = await database.chat.get('stylist')
    await database.chat.put({
      id: 'stylist',
      revision: crypto.randomUUID(),
      updatedAt: new Date(
        Math.max(Date.now(), Date.parse(current?.updatedAt ?? '') + 1 || 0),
      ).toISOString(),
      messages: [],
    })
  })
}
export async function saveChatLook(messageId: string, database = db) {
  return database.transaction('rw', database.tables, async () => {
    const data = await readChatData(database)
    const message = data.chat?.messages.find(
      (message) => message.id === messageId,
    )
    const day = localDay()
    const weather =
      data.preferences.useWeather !== false &&
      data.weather &&
      weatherFresh(data.weather.report)
        ? data.weather.report.days.find((item) => item.day === day)
        : undefined
    if (
      !message?.look ||
      !validateChatLook(
        message.look.garmentIds,
        message.look.options,
        data.garments,
        data.feedback,
        weather,
      )
    )
      throw new UserFacingError(
        'Dieser Look ist inzwischen nicht mehr verfügbar. Frage nach einer neuen Kombination.',
      )
    return saveOutfit(message.look.garmentIds, message.look.options, database)
  })
}
