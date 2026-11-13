// Список новостей: GET /api/site/news?locale=ru. Раздел «Новости» выключен — 404
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  const list = await loadSiteNewsList(locale)
  if (!list) throw createError({ statusCode: 404, message: 'Новости сейчас не показываются' })
  return list
})
