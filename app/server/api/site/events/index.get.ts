// Мероприятия: GET /api/site/events?locale=ru — предстоящие и весь архив. Раздел выключен — 404
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  const events = await loadSiteEvents(locale)
  if (!events) throw createError({ statusCode: 404, message: 'Мероприятия сейчас не показываются' })
  return events
})
