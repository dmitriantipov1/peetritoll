// Заказ с сайта: POST /api/site/orders → { id, publicId }. Оплаты пока нет — заказ «ждёт оплаты».
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
  if (typeof body?.website === 'string' && body.website) return { id: 0, publicId: '' }

  if (!allowFormSubmit(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown')) {
    throw createError({
      statusCode: 429,
      message: 'Слишком много заказов подряд — попробуйте через несколько минут',
    })
  }
  validateWith(formSchema)(body)
  return await createOrder(validateWith(orderInputSchema)(body))
})
