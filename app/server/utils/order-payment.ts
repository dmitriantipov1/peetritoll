// Оплата заказа через SumUp (5.3, решения 28.11.2026). Доступно в серверном коде без импорта.
//
// Ход: заказ сохранён «ждёт оплаты» → startPayment создаёт платёж SumUp и отдаёт адрес его страницы →
// покупатель платит и возвращается на «Заказ принят» → та спрашивает SumUp (syncPayment) →
// «Оплачен», письмо и Telegram персоналу. То же делает уведомление SumUp (webhook), если
// покупатель закрыл вкладку, не дождавшись возврата. Статусу из запроса не верим —
// всегда переспрашиваем SumUp своим ключом.
//
// Не оплачен за час — expireUnpaidOrders отменяет заказ и возвращает остаток на полку.
import { randomBytes } from 'node:crypto'
import { and, eq, gt, isNotNull, sql } from 'drizzle-orm'
import { orderHistory, orderItems, orders, productVariants } from '../db/schema'
import { orderStatusNames, PAYMENT_TIMEOUT_MIN, paymentReference } from '#shared/orders'

type Tx = Parameters<Parameters<ReturnType<typeof useDb>['transaction']>[0]>[0]

/** Вернуть остаток на полку — при отмене заказа (вручную или по сроку) */
export async function restockOrder(tx: Tx, orderId: number) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId))
  for (const i of items) {
    if (!i.variantId) continue
    // Остаток не считаем (null) — возвращать нечего
    await tx
      .update(productVariants)
      .set({ stock: sql`${productVariants.stock} + ${i.qty}` })
      .where(and(eq(productVariants.id, i.variantId), isNotNull(productVariants.stock)))
  }
}

/**
 * Новая попытка оплаты: закрыть прошлый платёж (по нему уже не заплатить) и создать новый.
 * Возвращает адрес страницы SumUp. Заказ уже не «ждёт оплаты» — ошибка.
 */
export async function startPayment(orderId: number): Promise<string> {
  // Прошлую попытку могли оплатить, а заказ ещё не отмечен — сначала спросим SumUp,
  // иначе новый платёж заменит оплаченный и оплата потеряется
  if ((await syncPayment(orderId)) === 'PAID') {
    throw createError({ statusCode: 409, message: 'Заказ уже оплачен' })
  }
  // Номер попытки — атомарно, вместе с проверкой статуса: две вкладки не возьмут один номер.
  // Время попытки — сразу, а не после ответа SumUp: не создался платёж — заказ всё равно
  // отменится через час и не будет держать товар
  const [o] = await useDb()
    .update(orders)
    .set({ paymentAttempts: sql`${orders.paymentAttempts} + 1`, paymentStartedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.status, 'awaiting_payment')))
    .returning()
  if (!o) throw createError({ statusCode: 409, message: 'Заказ уже оплачен или отменён' })

  if (o.sumupCheckoutId) await closeSumupCheckout(o.sumupCheckoutId)

  const checkout = await createSumupCheckout({
    reference: paymentReference(o.id, o.paymentAttempts, randomBytes(3).toString('hex')),
    amountCents: o.totalCents,
    description: `Peetri Toll, заказ № ${o.id}`,
    redirectUrl: `${siteUrl()}/${o.locale}/order-done?id=${o.publicId}`,
    returnUrl: `${siteUrl()}/api/site/orders/sumup`,
  })
  if (!checkout.hosted_checkout_url) {
    throw createError({ statusCode: 502, message: 'SumUp не вернул страницу оплаты' })
  }
  await useDb().update(orders).set({ sumupCheckoutId: checkout.id }).where(eq(orders.id, o.id))
  return checkout.hosted_checkout_url
}

/**
 * Спросить SumUp о текущем платеже заказа. Оплачен — заказ «Оплачен» (один раз, под блокировкой:
 * возврат покупателя и уведомление SumUp могут прийти одновременно) и уведомление персоналу.
 * Возвращает статус платежа или null, если платежа нет или SumUp не ответил.
 */
export async function syncPayment(orderId: number) {
  const o = await useDb().query.orders.findFirst({ where: eq(orders.id, orderId) })
  if (!o?.sumupCheckoutId || o.status !== 'awaiting_payment' || !sumupConfigured()) return null

  let checkout: SumupCheckout
  try {
    checkout = await getSumupCheckout(o.sumupCheckoutId)
  } catch (e) {
    console.error(`Заказ № ${o.id}: SumUp не ответил на проверку платежа`, e)
    return null
  }
  if (checkout.status !== 'PAID') return checkout.status

  const becamePaid = await useDb().transaction(async (tx) => {
    const [cur] = await tx.select().from(orders).where(eq(orders.id, o.id)).for('update').limit(1)
    // Уже отмечен (вторым запросом или вручную) или покупатель платил по старой попытке
    if (cur?.status !== 'awaiting_payment' || cur.sumupCheckoutId !== checkout.id) return false
    const code = paidTransactionCode(checkout)
    await tx
      .update(orders)
      .set({ status: 'paid', paidAt: new Date(), transactionCode: code })
      .where(eq(orders.id, o.id))
    await tx.insert(orderHistory).values({
      orderId: o.id,
      kind: 'status',
      note: `${orderStatusNames.awaiting_payment} → ${orderStatusNames.paid}. SumUp${code ? `, транзакция ${code}` : ''}`,
    })
    return true
  })
  if (becamePaid) await notifyNewOrder(o.id)
  return 'PAID' as const
}

/** Уведомление SumUp: по номеру платежа найти заказ и переспросить статус */
export async function syncPaymentByCheckout(checkoutId: string) {
  const o = await useDb().query.orders.findFirst({
    where: eq(orders.sumupCheckoutId, checkoutId),
    columns: { id: true },
  })
  if (o) await syncPayment(o.id)
}

/**
 * Отменить заказы, не оплаченные за PAYMENT_TIMEOUT_MIN с начала последней попытки.
 * Перед отменой — последняя проверка и закрытие платежа: оплата в последнюю минуту не теряется,
 * а по закрытому платежу уже не заплатить. Попытка, у которой платёж не создался (SumUp
 * не ответил), тоже считается. Заказы без попыток оплаты (оформлены без ключей SumUp,
 * оплату согласуют вручную) не трогаем.
 */
export async function expireUnpaidOrders(now = new Date()): Promise<number> {
  if (!sumupConfigured()) return 0
  const deadline = new Date(now.getTime() - PAYMENT_TIMEOUT_MIN * 60_000)
  const stale = await useDb()
    .select({ id: orders.id, checkoutId: orders.sumupCheckoutId })
    .from(orders)
    .where(
      and(
        eq(orders.status, 'awaiting_payment'),
        gt(orders.paymentAttempts, 0),
        // Времени попытки нет у заказов, заведённых до 28.11.2026, — тогда от оформления
        sql`coalesce(${orders.paymentStartedAt}, ${orders.createdAt}) < ${deadline.toISOString()}::timestamptz`,
      ),
    )
  let cancelled = 0
  for (const s of stale) {
    if (s.checkoutId) {
      if ((await syncPayment(s.id)) === 'PAID') continue
      await closeSumupCheckout(s.checkoutId)
      // Закрыли — спросим ещё раз: вдруг заплатили между проверкой и закрытием
      if ((await syncPayment(s.id)) === 'PAID') continue
    }
    const done = await useDb().transaction(async (tx) => {
      const [cur] = await tx.select().from(orders).where(eq(orders.id, s.id)).for('update').limit(1)
      // Пока проверяли, покупатель начал новую попытку или персонал поменял статус
      if (
        cur?.status !== 'awaiting_payment' ||
        cur.sumupCheckoutId !== s.checkoutId ||
        (cur.paymentStartedAt ?? cur.createdAt) >= deadline
      )
        return false
      await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, s.id))
      await tx.insert(orderHistory).values({
        orderId: s.id,
        kind: 'status',
        note: `${orderStatusNames.awaiting_payment} → ${orderStatusNames.cancelled}. Не оплачен за ${PAYMENT_TIMEOUT_MIN} мин — остаток вернулся`,
      })
      await restockOrder(tx, s.id)
      return true
    })
    if (done) cancelled++
  }
  return cancelled
}
