// Сохранить карточку заказа: PUT /api/admin/orders/:id { status, trackingNo, staffNote, note }.
// Право «Заказы магазина» — правит. Отмена возвращает остаток товаров
import { orderSaveSchema, type AdminOrder } from '#shared/orders'

export default defineEventHandler(async (event): Promise<AdminOrder> => {
  const user = await requireAccess(event, 'orders', 'edit')
  const id = idParam(event)
  await saveOrder(id, await readBodyWith(event, orderSaveSchema), user.id)
  return await loadOrder(id)
})
