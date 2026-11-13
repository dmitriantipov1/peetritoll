// Одно мероприятие: GET /api/site/events/item?locale=ru&slug=… Нет такого — 404
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale, slug } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  if (typeof slug !== 'string' || !slug)
    throw createError({ statusCode: 400, message: 'Нет адреса' })
  const item = await loadSiteEvent(locale, slug)
  if (!item) throw createError({ statusCode: 404, message: 'Мероприятие не найдено' })
  return item
})
