// Групповое меню для сайта: GET /api/site/group?locale=ru. Раздел выключен — 404
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  const group = await loadSiteGroup(locale)
  if (!group)
    throw createError({ statusCode: 404, message: 'Групповое меню сейчас не показывается' })
  return group
})
