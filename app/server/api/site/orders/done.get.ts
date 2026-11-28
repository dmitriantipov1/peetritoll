// «Заказ принят»: GET /api/site/orders/done?id=<publicId>. Только номер, сумма, почта и способ
// получения — то, что покупатель только что сам ввёл. По номеру заказа не открыть.
// Сюда SumUp возвращает покупателя после оплаты — заодно спрашиваем SumUp, оплачен ли заказ
// (уведомление могло ещё не прийти, а локально не приходит совсем).
import { eq } from 'drizzle-orm'
import { orders } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) {
    throw createError({ statusCode: 404, message: 'Заказ не найден' })
  }
  const o = await useDb().query.orders.findFirst({
    where: eq(orders.publicId, id),
    columns: { id: true },
  })
  if (!o) throw createError({ statusCode: 404, message: 'Заказ не найден' })
  await syncPayment(o.id)
  return (await loadOrderDone(id))!
})
