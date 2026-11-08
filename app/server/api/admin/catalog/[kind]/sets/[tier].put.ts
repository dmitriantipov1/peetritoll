// Сет банкета: PUT /api/admin/catalog/banquet/sets/basic|middle|premium { names, dishIds }.
// Сеты есть только у банкетного меню.
import { banquetSetInputSchema } from '#shared/catalog'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  if (catalogKindParam(event) !== 'banquet') {
    throw createError({ statusCode: 404, message: 'Сеты есть только у банкетного меню' })
  }
  const tier = tierParam(event)
  const input = await readBodyWith(event, banquetSetInputSchema)
  await saveBanquetSet(tier, input)
  return { ok: true }
})
