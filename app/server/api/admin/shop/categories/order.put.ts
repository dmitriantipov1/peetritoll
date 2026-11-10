// Порядок категорий магазина: PUT /api/admin/shop/categories/order { ids }
import { orderInputSchema } from '#shared/shop'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'products', 'edit')
  const { ids } = await readBodyWith(event, orderInputSchema)
  await orderShopCategories(ids)
  return { ok: true }
})
