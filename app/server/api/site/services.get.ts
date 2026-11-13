// «Экскурсии и поездки» (услуги): GET /api/site/services?locale=ru — какие связанные разделы
// включены: Pakri Express (по умолчанию выключен — ждём условия, 7.2), банкет, магазин.
// Раздел «Экскурсии и поездки» выключен или скрыт на языке — 404
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  const sections = await readSections()
  const shown = (key: keyof typeof sections) =>
    sections[key].enabled && sections[key].locales[locale]
  if (!shown('services')) {
    throw createError({ statusCode: 404, message: 'Страница сейчас не показывается' })
  }
  return { pakri: shown('pakri'), banquet: shown('banquet'), shop: shown('shop') }
})
