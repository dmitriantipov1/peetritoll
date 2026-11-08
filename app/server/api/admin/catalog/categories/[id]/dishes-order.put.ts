// Порядок блюд в категории каталога: PUT /api/admin/catalog/categories/:id/dishes-order { ids }
import { orderInputSchema } from '#shared/menu'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  const { ids } = await readBodyWith(event, orderInputSchema)
  await orderCatalogDishes(idParam(event), ids)
  return { ok: true }
})
