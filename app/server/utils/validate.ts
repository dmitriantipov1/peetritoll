// Проверка тела запроса схемой zod. Ошибка — 400 с понятным текстом первой проблемы
// в message и списком всех в data.issues (форма может подсветить поля).
//
// Про тексты ошибок во всём сервере: человеческий текст — в message, а не в statusMessage.
// statusMessage уходит в строку статуса HTTP, где кириллица не передаётся и портится.
// В браузере текст читает apiErrorMessage (app/utils/api-error.ts).
import type { H3Event } from 'h3'
import type { z } from 'zod'

/** Тело запроса, проверенное схемой. Не readValidatedBody: тот заворачивает ошибку в свою. */
export async function readBodyWith<T extends z.ZodType>(event: H3Event, schema: T) {
  return validateWith(schema)(await readBody(event))
}

export function validateWith<T extends z.ZodType>(schema: T) {
  return (body: unknown): z.infer<T> => {
    const result = schema.safeParse(body)
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }))
      throw createError({
        statusCode: 400,
        message: issues[0]?.message ?? 'Неверные данные',
        data: { issues },
      })
    }
    return result.data
  }
}
