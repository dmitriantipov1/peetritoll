// «Заказ принят»: GET /api/site/orders/done?id=<publicId>. Только номер, сумма, почта и способ
// получения — то, что покупатель только что сам ввёл. По номеру заказа не открыть.
export default defineEventHandler(async (event) => {
  const { id } = getQuery(event)
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) {
    throw createError({ statusCode: 404, message: 'Заказ не найден' })
  }
  const order = await loadOrderDone(id)
  if (!order) throw createError({ statusCode: 404, message: 'Заказ не найден' })
  return order
})
