// Уведомление SumUp о платеже (webhook, return_url платежа): { event_type: 'CHECKOUT_STATUS_CHANGED',
// id: <номер платежа> }. Подписи у уведомления нет — статусу в нём не верим, переспрашиваем SumUp
// своим ключом (syncPayment). Отвечаем быстро и всегда 2xx: иначе SumUp повторяет
// через 1 мин, 5 мин, 20 мин, 2 ч. Локально уведомления не доходят — «Заказ принят» спрашивает сама.
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null)
  const id = typeof body?.id === 'string' ? body.id : ''
  if (body?.event_type === 'CHECKOUT_STATUS_CHANGED' && /^[\w-]{1,64}$/.test(id)) {
    await syncPaymentByCheckout(id).catch((e) =>
      console.error(`Уведомление SumUp о платеже ${id} не обработано`, e),
    )
  }
  setResponseStatus(event, 204)
  return null
})
