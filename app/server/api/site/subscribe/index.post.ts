// Подписка на рассылку: POST /api/site/subscribe → { ok: true } (8.2, double opt-in).
// Гостю уходит письмо со ссылкой; подписка — после подтверждения. Ответ одинаковый для любого
// адреса. Защита от спама — как у форм: ловушка website и лимит отправок с адреса.
import { subscribeInputSchema } from '#shared/subscriptions'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (typeof body?.website === 'string' && body.website) return { ok: true }

  if (!allowFormSubmit(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown')) {
    throw createError({
      statusCode: 429,
      message: 'Слишком много попыток подряд — попробуйте через несколько минут',
    })
  }

  const { email, locale } = validateWith(subscribeInputSchema)(body)
  await requestSubscription(email, locale)
  return { ok: true }
})
