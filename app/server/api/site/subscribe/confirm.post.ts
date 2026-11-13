// Подтверждение подписки: POST /api/site/subscribe/confirm { token } → { result }.
// Только POST по нажатию кнопки: почтовые сканеры открывают ссылки из писем сами,
// и подтверждение простым открытием ссылки включало бы рассылку без человека.
import { subscribeConfirmSchema } from '#shared/subscriptions'

export default defineEventHandler(async (event) => {
  const { token } = await readBodyWith(event, subscribeConfirmSchema)
  return { result: await confirmSubscription(token) }
})
