// Контакты и часы для сайта: GET /api/site/contacts?locale=ru — страница «Контакты» и подвал
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  return await loadSiteContacts(locale)
})
