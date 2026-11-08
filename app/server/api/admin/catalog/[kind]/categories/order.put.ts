// Порядок категорий каталога: PUT /api/admin/catalog/banquet|group/categories/order { ids }
import { orderInputSchema } from '#shared/menu'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  const kind = catalogKindParam(event)
  const { ids } = await readBodyWith(event, orderInputSchema)
  await orderCatalogCategories(kind, ids)
  return { ok: true }
})
