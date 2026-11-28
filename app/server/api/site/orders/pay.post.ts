// «Оплатить» / «Оплатить ещё раз» на «Заказ принят»: POST /api/site/orders/pay { id: publicId } →
// { payUrl } — новая попытка оплаты (прошлый платёж закрывается), или { paid: true }, если
// прошлую попытку уже оплатили. Заказ по публичному id, не по номеру: чужой не оплатить и не открыть.
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { orders } from '../../../db/schema'

const bodySchema = z.object({ id: z.uuid() })

export default defineEventHandler(async (event) => {
  if (!sumupConfigured()) {
    throw createError({ statusCode: 404, message: 'Онлайн-оплата сейчас не принимается' })
  }
  if (!allowFormSubmit('pay', getRequestIP(event, { xForwardedFor: true }) ?? 'unknown')) {
    throw createError({
      statusCode: 429,
      message: 'Слишком много попыток подряд — попробуйте через несколько минут',
    })
  }
  const { id } = validateWith(bodySchema)(await readBody(event))
  const o = await useDb().query.orders.findFirst({
    where: eq(orders.publicId, id),
    columns: { id: true, status: true },
  })
  if (!o) throw createError({ statusCode: 404, message: 'Заказ не найден' })
  if (o.status === 'cancelled') {
    throw createError({ statusCode: 409, message: 'Заказ отменён — оформите его заново' })
  }
  if (o.status !== 'awaiting_payment') return { paid: true, payUrl: null }
  try {
    return { paid: false, payUrl: await startPayment(o.id) }
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode === 409) return { paid: true, payUrl: null }
    console.error(`Заказ № ${o.id}: не удалось создать платёж SumUp`, e)
    throw createError({
      statusCode: 502,
      message: 'Страница оплаты сейчас не открывается — попробуйте через минуту',
    })
  }
})
