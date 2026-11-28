// Заказ с сайта: POST /api/site/orders → { id, publicId, payUrl }. Заказ сохраняется «ждёт оплаты»;
// с онлайн-оплатой (ключи SumUp заданы) сразу создаём платёж — payUrl, страница оплаты SumUp,
// куда браузер уводит покупателя. SumUp не ответил — payUrl нет, заказ сохранён: на «Заказ принят»
// есть «Оплатить». Без ключей payUrl нет — оплату согласуют вручную.
// Согласие с условиями и политикой обязательно (8.1). Защита от спама — как у заявок:
// поле-ловушка website и не больше 10 отправок за 10 минут с одного адреса.
// Корзина устарела (цена, остаток, товар снят) — 409 и список расхождений в data.problems.
import { z } from 'zod'
import { orderInputSchema } from '#shared/orders'

const formSchema = z.object({
  consent: z.literal(true, 'Нужно согласие с условиями продажи и политикой'),
  website: z.string().max(0).optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (typeof body?.website === 'string' && body.website)
    return { id: 0, publicId: '', payUrl: null }

  if (!allowFormSubmit('order', getRequestIP(event, { xForwardedFor: true }) ?? 'unknown')) {
    throw createError({
      statusCode: 429,
      message: 'Слишком много заказов подряд — попробуйте через несколько минут',
    })
  }
  validateWith(formSchema)(body)
  const order = await createOrder(validateWith(orderInputSchema)(body))

  let payUrl: string | null = null
  if (sumupConfigured()) {
    try {
      payUrl = await startPayment(order.id)
    } catch (e) {
      console.error(`Заказ № ${order.id}: не удалось создать платёж SumUp`, e)
    }
  }
  return { ...order, payUrl }
})
