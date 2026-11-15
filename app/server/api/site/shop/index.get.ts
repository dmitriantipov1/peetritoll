// Каталог магазина: GET /api/site/shop?locale=ru. Раздел «Магазин» выключен — 404
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  const shop = await loadSiteShop(locale)
  if (!shop) throw createError({ statusCode: 404, message: 'Магазин сейчас закрыт' })
  return shop
})
