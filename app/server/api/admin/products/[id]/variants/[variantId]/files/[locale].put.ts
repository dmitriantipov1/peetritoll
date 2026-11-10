// Файл цифрового варианта на одном языке: PUT /api/admin/products/:id/variants/:variantId/files/:locale
// ?name=имя.pdf, тело запроса — сам файл (не multipart): пишем на диск потоком, до 500 МБ
import { contentLocales, type ContentLocale } from '#shared/locales'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'products', 'edit')
  const variantId = Number(getRouterParam(event, 'variantId'))
  const locale = getRouterParam(event, 'locale') as ContentLocale
  if (!Number.isInteger(variantId) || variantId <= 0 || !contentLocales.includes(locale)) {
    throw createError({ statusCode: 400, message: 'Неверный адрес' })
  }
  const row = await saveVariantFile(event, idParam(event), variantId, locale, user.id)
  return {
    id: row.id,
    filename: row.filename,
    size: row.size,
    mime: row.mime,
    uploadedAt: row.uploadedAt.toISOString(),
  }
})
