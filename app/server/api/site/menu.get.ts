// Основное меню для сайта: GET /api/site/menu?locale=ru. Раздел выключен — 404
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  const menu = await loadSiteMenu(locale)
  if (!menu) throw createError({ statusCode: 404, message: 'Меню сейчас не показывается' })
  return menu
})
