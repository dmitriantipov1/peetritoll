// Разделы главной из базы (магазин, мероприятия): GET /api/site/home?locale=ru
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  return await loadHome(locale)
})
