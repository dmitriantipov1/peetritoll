// Карточка заказа: GET /api/admin/orders/:id — состав, получение, история
import type { AdminOrder } from '#shared/orders'

export default defineEventHandler(async (event): Promise<AdminOrder> => {
  await requireAccess(event, 'orders', 'view')
  return await loadOrder(idParam(event))
})
