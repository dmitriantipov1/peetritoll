// Товар: GET /api/site/shop/item?locale=ru&slug=… Нет такого в продаже — 404
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale, slug } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  if (typeof slug !== 'string' || !slug)
    throw createError({ statusCode: 400, message: 'Нет адреса' })
  const product = await loadSiteProduct(locale, slug)
  if (!product) throw createError({ statusCode: 404, message: 'Товар не найден' })
  return product
})
