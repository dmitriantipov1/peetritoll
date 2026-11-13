// Страница «Ресторан»: GET /api/site/restaurant?locale=ru — галерея и включённые разделы.
// Раздел «Ресторан» выключен — 404
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  const restaurant = await loadSiteRestaurant(locale)
  if (!restaurant)
    throw createError({ statusCode: 404, message: 'Страница сейчас не показывается' })
  return restaurant
})
