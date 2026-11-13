// «Пиршества и застолья»: GET /api/site/banquet?locale=ru — каталог, сеты, настройки.
// Раздел «Запрос на банкет» выключен — 404
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  const banquet = await loadSiteBanquet(locale)
  if (!banquet) throw createError({ statusCode: 404, message: 'Страница сейчас не показывается' })
  return banquet
})
