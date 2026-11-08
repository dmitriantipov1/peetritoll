// Текст ошибки от нашего API для показа человеку.
// Сервер кладёт его в message (server/utils/validate.ts), $fetch отдаёт тело ответа в data.
export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { message?: unknown } })?.data
  return typeof data?.message === 'string' && data.message ? data.message : fallback
}

/** Список проблем по полям из ошибки проверки: { 'portions': '…', 'photo': '…' } */
export function apiErrorIssues(error: unknown): Record<string, string> {
  const issues = (error as { data?: { data?: { issues?: { path: string; message: string }[] } } })
    ?.data?.data?.issues
  return Object.fromEntries((issues ?? []).map((i) => [i.path, i.message]))
}
