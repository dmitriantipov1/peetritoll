// «Музей»: GET /api/site/museum?locale=ru — показывается ли страница. Раздел «Музей»
// выключен или скрыт на языке — 404 (как у «Ресторана» и «Услуг»)
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  const { museum } = await readSections()
  if (!museum.enabled || !museum.locales[locale]) {
    throw createError({ statusCode: 404, message: 'Страница сейчас не показывается' })
  }
  return { ok: true }
})
