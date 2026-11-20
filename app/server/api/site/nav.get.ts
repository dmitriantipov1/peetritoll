// Шапка сайта: GET /api/site/nav?locale=ru — какие разделы включены, чтобы в выпадающих списках
// «О нас» и «Услуги» (20.11.2026) не было ссылок на выключенные: новости, Pakri Express, аудиогид
// (он часть «Экскурсий и поездок»)
import { isContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const { locale } = getQuery(event)
  if (!isContentLocale(locale)) throw createError({ statusCode: 400, message: 'Неизвестный язык' })
  const sections = await readSections()
  const shown = (key: keyof typeof sections) =>
    sections[key].enabled && sections[key].locales[locale]
  return { news: shown('news'), services: shown('services'), pakri: shown('pakri') }
})
