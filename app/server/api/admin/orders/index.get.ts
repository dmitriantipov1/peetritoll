// Список заказов: GET /api/admin/orders. Право «Заказы магазина» — смотрит
import type { AdminOrderRow } from '#shared/orders'

export default defineEventHandler(async (event): Promise<AdminOrderRow[]> => {
  await requireAccess(event, 'orders', 'view')
  return await loadOrderList()
})
