// Заказы магазина (7.3): оформление с сайта, уведомления персоналу, «Заказ принят».
// Доступно в серверном коде без импорта. Правила — shared/orders.ts.
//
// Заказ сохраняется «ждёт оплаты», оплата — server/utils/order-payment.ts (SumUp, 5.3).
// Цены и наличие сервер проверяет сам — корзина в браузере могла устареть. Остаток списываем
// сразу при оформлении, под блокировкой строки: два покупателя одну вещь не купят (7.3).
import { count, desc, eq, inArray, sql } from 'drizzle-orm'
import {
  orderHistory,
  orderItems,
  orders,
  productVariants,
  products,
  users,
  type OrderRow,
} from '../db/schema'
import { pickTranslation } from '#shared/locales'
import { formatPrice } from '#shared/money'
import { PRIVACY_POLICY_VERSION } from '#shared/requests'
import { defaultNotifications, notificationsSchema } from '#shared/site-settings'
import {
  deliveryChoices,
  deliveryMethodNames,
  orderStatusChoices,
  orderStatusNames,
  orderTotals,
  type AdminOrder,
  type AdminOrderRow,
  shipToOf,
  type OrderInput,
  type OrderProblem,
  type OrderSave as OrderSaveInput,
  type OrderRuleLine,
  type SiteOrderDone,
} from '#shared/orders'

export async function createOrder(input: OrderInput): Promise<{ id: number; publicId: string }> {
  const { shop } = await readSections()
  if (!shop.enabled || !shop.locales[input.locale]) {
    throw createError({ statusCode: 404, message: 'Магазин сейчас закрыт' })
  }
  const settings = await readShopSettings()
  const ids = input.lines.map((l) => l.variantId)
  const now = new Date()

  const order = await useDb().transaction(async (tx) => {
    // Блокируем варианты до конца транзакции: второй заказ на ту же вещь подождёт и увидит остаток 0
    const locked = await tx
      .select()
      .from(productVariants)
      .where(inArray(productVariants.id, ids))
      .orderBy(productVariants.id)
      .for('update')
    const productIds = [...new Set(locked.map((v) => v.productId))]
    const productRows = productIds.length
      ? await tx.query.products.findMany({
          where: inArray(products.id, productIds),
          with: { translations: true, category: true },
        })
      : []
    const variantTr = ids.length
      ? await tx.query.productVariantTranslations.findMany({
          where: (t, { inArray }) => inArray(t.variantId, ids),
        })
      : []

    const problems: OrderProblem[] = []
    const lines: (OrderRuleLine & {
      variantId: number
      productId: number
      name: string
      label: string
      stock: number | null
    })[] = []
    for (const line of input.lines) {
      const v = locked.find((x) => x.id === line.variantId)
      const p = v && productRows.find((x) => x.id === v.productId)
      const onSale =
        v?.isAvailable &&
        p?.state === 'published' &&
        p.locales.includes(input.locale) &&
        p.category.isVisible
      if (!v || !p || !onSale) {
        problems.push({ variantId: line.variantId, reason: 'gone' })
        continue
      }
      if (v.stock !== null && v.stock < line.qty) {
        problems.push({ variantId: v.id, reason: 'stock', stock: v.stock })
        continue
      }
      if (v.priceCents !== line.priceCents) {
        problems.push({ variantId: v.id, reason: 'price', priceCents: v.priceCents })
        continue
      }
      lines.push({
        variantId: v.id,
        productId: p.id,
        name: pickTranslation(p.translations, input.locale)?.name ?? '',
        label:
          pickTranslation(
            variantTr.filter((t) => t.variantId === v.id),
            input.locale,
          )?.label ?? '',
        kind: v.kind,
        pickupOnly: v.kind === 'physical' && v.delivery === 'pickup',
        priceCents: v.priceCents,
        qty: line.qty,
        stock: v.stock,
      })
    }
    if (problems.length) {
      throw createError({
        statusCode: 409,
        message: 'Корзина изменилась: проверьте цены и наличие',
        data: { problems },
      })
    }
    if (!deliveryChoices(lines).includes(input.delivery)) {
      throw createError({
        statusCode: 400,
        message: 'Такой способ получения для этого заказа нельзя',
      })
    }

    for (const l of lines) {
      if (l.stock === null) continue
      await tx
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} - ${l.qty}` })
        .where(eq(productVariants.id, l.variantId))
    }

    const totals = orderTotals(lines, input.delivery, settings)
    const [row] = await tx
      .insert(orders)
      .values({
        locale: input.locale,
        name: input.name,
        email: input.email,
        phone: input.phone,
        comment: input.comment,
        delivery: input.delivery,
        shipTo: shipToOf(input),
        ...totals,
        consentAt: now,
        policyVersion: PRIVACY_POLICY_VERSION,
        marketingOptIn: input.marketingOptIn,
        createdAt: now,
      })
      .returning()
    await tx.insert(orderItems).values(
      lines.map((l, i) => ({
        orderId: row!.id,
        productId: l.productId,
        variantId: l.variantId,
        name: l.name,
        label: l.label,
        kind: l.kind,
        pickupOnly: l.pickupOnly,
        priceCents: l.priceCents,
        qty: l.qty,
        sort: i,
      })),
    )
    await tx.insert(orderHistory).values({ orderId: row!.id, kind: 'created', at: now })
    // Контакт в лидах (8.2) — в той же транзакции, автотег «магазин»
    const leadId = await upsertLead(tx, {
      name: row!.name,
      email: row!.email,
      phone: row!.phone,
      locale: row!.locale,
      at: now,
      optIn: row!.marketingOptIn,
      source: `заказ № ${row!.id}`,
      tag: 'магазин',
    })
    await tx.update(orders).set({ leadId }).where(eq(orders.id, row!.id))
    return row!
  })

  // Письмо и Telegram — после сохранения: сбой отправки заказ не теряет. С онлайн-оплатой —
  // только когда оплачен (syncPayment): брошенные на странице оплаты заказы персонал не беспокоят
  if (!sumupConfigured()) await notifyNewOrder(order.id)
  return { id: order.id, publicId: order.publicId }
}

// ---------- Уведомления ----------

const localeNames = { et: 'эстонская', en: 'английская', ru: 'русская' } as const

function countryName(code: string) {
  try {
    return new Intl.DisplayNames('ru', { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

function shipLine(row: OrderRow): string {
  const s = row.shipTo
  if (s?.method === 'parcel') return `${deliveryMethodNames.parcel}: ${s.carrier}, ${s.point}`
  if (s?.method === 'eu')
    return `${deliveryMethodNames.eu}: ${countryName(s.country)}, ${s.postcode}, ${s.address}`
  return deliveryMethodNames[row.delivery]
}

type ItemRow = typeof orderItems.$inferSelect

function itemLine(i: ItemRow) {
  const what = i.label ? `${i.name} (${i.label})` : i.name
  return `${what} — ${i.qty} × ${formatPrice(i.priceCents)} = ${formatPrice(i.qty * i.priceCents)}`
}

function mailText(row: OrderRow, items: ItemRow[], link: string): string {
  return [
    `Заказ № ${row.id} — с сайта, ${localeNames[row.locale]} версия`,
    row.status === 'paid'
      ? `Статус: ${orderStatusNames.paid} через SumUp${row.transactionCode ? `, транзакция ${row.transactionCode}` : ''}.`
      : `Статус: ${orderStatusNames[row.status]}. Онлайн-оплаты не было — счёт или оплату согласуйте с покупателем.`,
    '',
    'Состав:',
    ...items.map((i) => `  ${itemLine(i)}`),
    `Товары: ${formatPrice(row.goodsCents)}`,
    `Доставка: ${row.delivery === 'none' ? 'не нужна' : formatPrice(row.deliveryCents)}`,
    `Итого: ${formatPrice(row.totalCents)}`,
    '',
    `Получение: ${shipLine(row)}`,
    '',
    `Покупатель: ${row.name}`,
    `E-mail: ${row.email}`,
    `Телефон: ${row.phone ?? 'не указан'}`,
    `Рассылка: ${row.marketingOptIn ? 'согласен(на)' : 'нет'}`,
    row.comment ? `\nКомментарий:\n${row.comment}` : '',
    '',
    `Открыть в админке: ${link}`,
    'Ответ на это письмо уйдёт покупателю.',
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}

function telegramText(row: OrderRow, items: ItemRow[], link: string): string {
  const e = escapeTelegram
  return [
    `<b>Заказ № ${row.id}</b> · ${e(formatPrice(row.totalCents))} · ${e(orderStatusNames[row.status].toLowerCase())}`,
    `${e(row.name)} · ${e(row.email)}${row.phone ? ` · ${e(row.phone)}` : ''}`,
    ...items.map((i) => e(itemLine(i))),
    e(shipLine(row)),
    `<a href="${e(link)}">Открыть в админке</a>`,
  ].join('\n')
}

async function logNotified(orderId: number, note: string) {
  await useDb().insert(orderHistory).values({ orderId, kind: 'notified', note })
}

/** Письмо на «почту для заявок» и сообщение в Telegram. Ошибки не бросает — пишет в историю */
export async function notifyNewOrder(id: number) {
  const row = await useDb().query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: { orderBy: (i, { asc }) => [asc(i.sort)] } },
  })
  if (!row) return
  const link = `${siteUrl()}/admin/orders/${row.id}`
  const paid = row.status === 'paid' ? ', оплачен' : ''
  const subject = `Заказ № ${row.id} — ${row.name}, ${formatPrice(row.totalCents)}${paid}`

  const { email: to } = await readSetting(
    'notifications',
    notificationsSchema,
    defaultNotifications,
  )
  if (!to) {
    await logNotified(id, 'Письмо не отправлено: в настройках сайта нет почты для заявок')
  } else if (!mailConfigured()) {
    await logNotified(id, 'Письмо не отправлено: почта на сервере не настроена')
  } else {
    try {
      await sendMail({ to, subject, text: mailText(row, row.items, link), replyTo: row.email })
      await logNotified(id, `Письмо на ${to}`)
    } catch (e) {
      console.error(`Заказ № ${id}: письмо не ушло`, e)
      await logNotified(id, `Письмо на ${to} не ушло: ${(e as Error).message}`)
    }
  }

  if (telegramConfigured()) {
    try {
      await sendTelegram(telegramText(row, row.items, link))
      await logNotified(id, 'Сообщение в Telegram')
    } catch (e) {
      console.error(`Заказ № ${id}: Telegram не ушёл`, e)
      await logNotified(id, `Telegram не ушёл: ${(e as Error).message}`)
    }
  }
}

// ---------- «Заказ принят» ----------

export async function loadOrderDone(publicId: string): Promise<SiteOrderDone | null> {
  const row = await useDb().query.orders.findFirst({
    where: eq(orders.publicId, publicId),
    with: { items: true },
  })
  if (!row) return null
  return {
    id: row.id,
    status: row.status,
    delivery: row.delivery,
    hasDigital: row.items.some((i) => i.kind === 'digital'),
    email: row.email,
    totalCents: row.totalCents,
    canPay: row.status === 'awaiting_payment' && sumupConfigured(),
  }
}

// ---------- Админка ----------

function itemsText(items: { name: string; label: string; qty: number }[]) {
  return items
    .map((i) => `${i.name}${i.label ? ` (${i.label})` : ''}${i.qty > 1 ? ` × ${i.qty}` : ''}`)
    .join(' · ')
}

type OrderWithItems = OrderRow & { items: (typeof orderItems.$inferSelect)[] }

function toRow(o: OrderWithItems): AdminOrderRow {
  return {
    id: o.id,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    name: o.name,
    email: o.email,
    phone: o.phone,
    items: itemsText([...o.items].sort((a, b) => a.sort - b.sort)),
    hasDigital: o.items.some((i) => i.kind === 'digital'),
    hasPhysical: o.items.some((i) => i.kind === 'physical'),
    delivery: o.delivery,
    totalCents: o.totalCents,
    trackingNo: o.trackingNo,
  }
}

export async function loadOrderList(): Promise<AdminOrderRow[]> {
  const rows = await useDb().query.orders.findMany({
    with: { items: true },
    orderBy: [desc(orders.createdAt), desc(orders.id)],
  })
  return rows.map(toRow)
}

export async function loadOrder(id: number): Promise<AdminOrder> {
  const o = await useDb().query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      items: { orderBy: (i, { asc }) => [asc(i.sort)] },
      history: { orderBy: (h, { desc }) => [desc(h.at), desc(h.id)] },
    },
  })
  if (!o) throw createError({ statusCode: 404, message: 'Заказ не найден' })
  const userIds = [...new Set(o.history.map((h) => h.userId).filter((x): x is number => !!x))]
  const names = userIds.length
    ? await useDb()
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, userIds))
    : []
  return {
    ...toRow(o),
    locale: o.locale,
    comment: o.comment,
    staffNote: o.staffNote,
    shipTo: o.shipTo,
    goodsCents: o.goodsCents,
    deliveryCents: o.deliveryCents,
    paidAt: o.paidAt?.toISOString() ?? null,
    sumupCheckoutId: o.sumupCheckoutId,
    paymentAttempts: o.paymentAttempts,
    transactionCode: o.transactionCode,
    consentAt: o.consentAt.toISOString(),
    policyVersion: o.policyVersion,
    marketingOptIn: o.marketingOptIn,
    orderItems: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      label: i.label,
      kind: i.kind,
      pickupOnly: i.pickupOnly,
      priceCents: i.priceCents,
      qty: i.qty,
    })),
    history: o.history.map((h) => ({
      id: h.id,
      kind: h.kind,
      note: h.note,
      userName: names.find((u) => u.id === h.userId)?.name ?? null,
      at: h.at.toISOString(),
    })),
    lead: await leadForRequest(o.leadId),
  }
}

/**
 * Сохранить карточку заказа: статус, трек-номер, заметка. Смена статуса — в историю.
 * «Оплачен» ставит время оплаты (пока оплату отмечают руками). Отмена возвращает остаток
 * на полку — поэтому из «Отменён» обратно не переводим: вещь уже могли купить.
 */
export async function saveOrder(id: number, input: OrderSaveInput, userId: number) {
  const checkoutToClose = await useDb().transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, id)).for('update').limit(1)
    if (!o) throw createError({ statusCode: 404, message: 'Заказ не найден' })
    if (!orderStatusChoices(o.status).includes(input.status)) {
      throw createError({
        statusCode: 400,
        message: 'Отменённый заказ не вернуть — оформите новый',
      })
    }
    const changed = o.status !== input.status
    const becamePaid =
      changed && input.status !== 'cancelled' && input.status !== 'awaiting_payment'
    await tx
      .update(orders)
      .set({
        status: input.status,
        trackingNo: input.trackingNo,
        staffNote: input.staffNote,
        updatedBy: userId,
        ...(becamePaid && !o.paidAt ? { paidAt: new Date() } : {}),
      })
      .where(eq(orders.id, id))
    if (changed) {
      const label = `${orderStatusNames[o.status]} → ${orderStatusNames[input.status]}`
      await tx.insert(orderHistory).values({
        orderId: id,
        kind: 'status',
        note: input.note ? `${label}. ${input.note}` : label,
        userId,
      })
    }
    if (changed && input.status === 'cancelled') await restockOrder(tx, id)
    // Отменили или отметили оплату вручную — открытый платёж SumUp закрыть: по нему уже не платят
    return changed && o.status === 'awaiting_payment' ? o.sumupCheckoutId : null
  })
  if (checkoutToClose && sumupConfigured()) await closeSumupCheckout(checkoutToClose)
}

/** Сколько заказов ждут действия персонала: ждут оплаты или оплачены и не собраны */
export async function countNewOrders(): Promise<number> {
  const [row] = await useDb()
    .select({ n: count() })
    .from(orders)
    .where(inArray(orders.status, ['awaiting_payment', 'paid']))
  return row?.n ?? 0
}
