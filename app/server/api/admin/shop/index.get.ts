// Магазин в админке: GET /api/admin/shop → { products, categories, settings, shopEnabled }
import type { AdminShop } from '#shared/shop'

export default defineEventHandler(async (event): Promise<AdminShop> => {
  await requireAccess(event, 'products', 'view')
  return await loadAdminShop()
})
