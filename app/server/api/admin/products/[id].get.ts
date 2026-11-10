// Карточка товара: GET /api/admin/products/:id
import type { AdminProduct } from '#shared/shop'

export default defineEventHandler(async (event): Promise<AdminProduct> => {
  await requireAccess(event, 'products', 'view')
  return await loadAdminProduct(idParam(event))
})
