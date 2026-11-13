// Страница-материал для сайта: GET /api/site/page?locale=ru&slug=privacy. Нет или не опубликована — 404
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale, slug } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  if (typeof slug !== 'string' || !slug) throw createError({ statusCode: 404 })
  const page = await loadSitePage(locale, slug)
  if (!page) throw createError({ statusCode: 404, message: 'Страница не найдена' })
  return page
})
