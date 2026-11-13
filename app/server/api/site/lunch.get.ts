// Меню дня для сайта: GET /api/site/lunch?locale=ru. Раздел выключен — 404
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  const lunch = await loadSiteLunch(locale)
  if (!lunch) throw createError({ statusCode: 404, message: 'Меню дня сейчас не показывается' })
  return lunch
})
