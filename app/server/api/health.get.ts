// Проверка, что приложение живо и база отвечает: GET /api/health
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  try {
    await useDb().execute(sql`select 1`)
    return { ok: true, db: 'ok' }
  } catch (error) {
    setResponseStatus(event, 503)
    return { ok: false, db: 'unavailable', error: (error as Error).message }
  }
})
