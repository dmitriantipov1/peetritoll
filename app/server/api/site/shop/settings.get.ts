// Цены доставки для оформления заказа: GET /api/site/shop/settings?locale=ru. Магазин закрыт — 404.
// onlinePayment — включена ли оплата SumUp (ключи заданы): от неё текст про оплату и кнопка
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  const { shop } = await readSections()
  if (!shop.enabled || !shop.locales[locale])
    throw createError({ statusCode: 404, message: 'Магазин сейчас закрыт' })
  return { ...(await readShopSettings()), onlinePayment: sumupConfigured() }
})
