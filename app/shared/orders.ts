// Заказы магазина (7.3): правила получения и доставки, данные формы оформления, статусы.
// Оплата — SumUp Hosted Checkout (5.3, 28.11.2026): заказ сохраняется «ждёт оплаты», покупатель
// платит на странице SumUp. Без ключей SumUp оплату согласуют вручную.
import { z } from 'zod'
import { contentLocales, type ContentLocale } from './locales'
import type { ShopSettings, VariantKind } from './shop'

// ---------- Получение ----------

/** pickup — самовывоз в Палдиски, parcel — почтомат по Эстонии, eu — почтой в ЕС,
 *  none — в заказе только цифровое, получать нечего */
export const deliveryMethods = ['pickup', 'parcel', 'eu', 'none'] as const
export type DeliveryMethod = (typeof deliveryMethods)[number]

export const deliveryMethodNames: Record<DeliveryMethod, string> = {
  pickup: 'Самовывоз из таверны',
  parcel: 'Почтомат по Эстонии',
  eu: 'Почтой в страны ЕС',
  none: 'Не нужна — только цифровое',
}

export const carriers = ['Omniva', 'Smartpost', 'DPD'] as const

/** Страны ЕС, кроме Эстонии (по Эстонии — почтомат) */
export const euCountries = [
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
] as const

/** Строка корзины, как её видят правила: что это и как его можно получить */
export interface OrderRuleLine {
  kind: VariantKind
  /** Только самовывоз (антиквариат, картины) */
  pickupOnly: boolean
  priceCents: number
  qty: number
}

/**
 * Какие способы получения можно выбрать (7.3):
 * только цифровое — получать нечего; есть «только самовывоз» — весь заказ забирают в таверне;
 * иначе — самовывоз, почтомат или почта в ЕС.
 */
export function deliveryChoices(lines: OrderRuleLine[]): DeliveryMethod[] {
  const physical = lines.filter((l) => l.kind === 'physical')
  if (!physical.length) return ['none']
  if (physical.some((l) => l.pickupOnly)) return ['pickup']
  return ['pickup', 'parcel', 'eu']
}

/** Цена доставки — из настроек магазина. Считается на физическую часть заказа целиком */
export function deliveryCents(method: DeliveryMethod, settings: ShopSettings): number {
  if (method === 'parcel') return settings.deliveryEstoniaCents
  if (method === 'eu') return settings.deliveryEuCents
  return 0
}

export function orderTotals(
  lines: OrderRuleLine[],
  method: DeliveryMethod,
  settings: ShopSettings,
) {
  const goodsCents = lines.reduce((s, l) => s + l.priceCents * l.qty, 0)
  const delivery = deliveryCents(method, settings)
  return { goodsCents, deliveryCents: delivery, totalCents: goodsCents + delivery }
}

// ---------- Форма оформления ----------

export const MAX_LINE_QTY = 20

export const orderInputSchema = z
  .object({
    locale: z.enum(contentLocales),
    name: z.string().trim().min(1, 'Укажите имя').max(100, 'Имя слишком длинное'),
    // E-mail обязателен: на него — подтверждение и ссылки на цифровое
    email: z.string().trim().toLowerCase().max(200).pipe(z.email('Проверьте e-mail')),
    // Телефон обязателен (28.11.2026): уточнить заказ, договориться о самовывозе, служба доставки
    phone: z
      .string()
      .trim()
      .min(1, 'Укажите телефон')
      .max(40, 'Телефон слишком длинный')
      .regex(/^[+\d\s()-]*$/, 'В телефоне — только цифры, пробелы, +, -, скобки'),
    comment: z
      .string()
      .trim()
      .max(2000, 'Комментарий слишком длинный')
      .transform((v) => v || null)
      .nullable()
      .default(null),
    lines: z
      .array(
        z.object({
          variantId: z.number().int().positive(),
          qty: z.number().int().min(1).max(MAX_LINE_QTY),
          // Цена, которую видел покупатель: изменилась — переспросим, а не продадим молча дороже
          priceCents: z.number().int().min(0),
        }),
      )
      .min(1, 'Корзина пуста')
      .max(50),
    delivery: z.enum(deliveryMethods),
    carrier: z.enum(carriers).nullable().default(null),
    parcelPoint: z.string().trim().max(200).nullable().default(null),
    country: z.enum(euCountries).nullable().default(null),
    postcode: z.string().trim().max(20).nullable().default(null),
    address: z.string().trim().max(300).nullable().default(null),
    marketingOptIn: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (new Set(v.lines.map((l) => l.variantId)).size !== v.lines.length) {
      ctx.addIssue({ code: 'custom', path: ['lines'], message: 'Товар в корзине дважды' })
    }
    if (v.delivery === 'parcel') {
      if (!v.carrier)
        ctx.addIssue({ code: 'custom', path: ['carrier'], message: 'Выберите службу' })
      if (!v.parcelPoint)
        ctx.addIssue({ code: 'custom', path: ['parcelPoint'], message: 'Укажите почтомат' })
    }
    if (v.delivery === 'eu') {
      if (!v.country)
        ctx.addIssue({ code: 'custom', path: ['country'], message: 'Выберите страну' })
      if (!v.postcode)
        ctx.addIssue({ code: 'custom', path: ['postcode'], message: 'Укажите индекс' })
      if (!v.address) ctx.addIssue({ code: 'custom', path: ['address'], message: 'Укажите адрес' })
    }
  })
export type OrderInput = z.infer<typeof orderInputSchema>

/** Куда отправить: почтомат или адрес в ЕС. У самовывоза и цифрового — пусто */
export type OrderShipTo =
  | { method: 'parcel'; carrier: (typeof carriers)[number]; point: string }
  | { method: 'eu'; country: (typeof euCountries)[number]; postcode: string; address: string }
  | null

export function shipToOf(input: OrderInput): OrderShipTo {
  if (input.delivery === 'parcel') {
    return { method: 'parcel', carrier: input.carrier!, point: input.parcelPoint! }
  }
  if (input.delivery === 'eu') {
    return {
      method: 'eu',
      country: input.country!,
      postcode: input.postcode!,
      address: input.address!,
    }
  }
  return null
}

// ---------- Статусы ----------

/** awaiting_payment — оформлен, оплаты ещё нет;
 *  paid — оплачен; packing — собирается; ready — готов к выдаче; shipped — отправлен;
 *  done — выполнен; cancelled — отменён */
export const orderStatuses = [
  'awaiting_payment',
  'paid',
  'packing',
  'ready',
  'shipped',
  'done',
  'cancelled',
] as const
export type OrderStatus = (typeof orderStatuses)[number]

export const orderStatusNames: Record<OrderStatus, string> = {
  awaiting_payment: 'Ждёт оплаты',
  paid: 'Оплачен',
  packing: 'Собирается',
  ready: 'Готов к выдаче',
  shipped: 'Отправлен',
  done: 'Выполнен',
  cancelled: 'Отменён',
}

export type OrderHistoryKind = 'created' | 'status' | 'notified'

// ---------- Письма покупателю ----------

/** accepted — принят (без онлайн-оплаты); paid — оплачен; ready — готов к выдаче; shipped — отправлен;
 *  cancelled — отменён персоналом. Тексты — server/utils/order-letters.ts */
export type BuyerLetter = 'accepted' | 'paid' | 'ready' | 'shipped' | 'cancelled'

/** При смене статуса персоналом на эти — письмо покупателю (галочка в карточке заказа) */
export const BUYER_LETTER_STATUSES: readonly OrderStatus[] = [
  'paid',
  'ready',
  'shipped',
  'cancelled',
]

// ---------- Оплата SumUp ----------

/** Сколько минут ждём оплату с начала попытки; потом заказ отменяется и остаток возвращается.
 *  Страница оплаты SumUp сама живёт 30 минут */
export const PAYMENT_TIMEOUT_MIN = 60

/**
 * Номер платежа в SumUp: заказ, попытка и случайный хвост — «PT-2001-1-k3f9».
 * SumUp не принимает номер дважды (409), а номера заказов могут повториться: после
 * восстановления базы из копии или сброса счётчика. Хвост делает номер уникальным всегда
 */
export function paymentReference(orderId: number, attempt: number, salt: string): string {
  return `PT-${orderId}-${attempt}-${salt}`
}

// ---------- Ответы сайта ----------

/** «Цена изменилась», «закончился» — что вернуть покупателю, чтобы он поправил корзину */
export interface OrderProblem {
  variantId: number
  reason: 'gone' | 'price' | 'stock'
  priceCents?: number
  stock?: number
}

/** Страница «Заказ принят»: только то, что покупатель и так знает */
export interface SiteOrderDone {
  id: number
  status: OrderStatus
  delivery: DeliveryMethod
  hasDigital: boolean
  email: string
  totalCents: number
  /** Не оплачен, и онлайн-оплата включена — показать «Оплатить» */
  canPay: boolean
}

// ---------- Админка ----------

/** Отменённый заказ не возвращаем: остаток уже вернулся на полку, его могли купить */
export const FINAL_STATUSES: readonly OrderStatus[] = ['cancelled']

export interface AdminOrderRow {
  id: number
  status: OrderStatus
  createdAt: string
  name: string
  email: string
  phone: string | null
  /** «Байки из-за барной стойки · Рейд Палдиски (Цифровая копия)» */
  items: string
  hasDigital: boolean
  hasPhysical: boolean
  delivery: DeliveryMethod
  totalCents: number
  trackingNo: string | null
}

export interface AdminOrderItem {
  id: number
  productId: number | null
  name: string
  label: string
  kind: VariantKind
  pickupOnly: boolean
  priceCents: number
  qty: number
}

export interface AdminOrderHistoryItem {
  id: number
  kind: OrderHistoryKind
  note: string | null
  userName: string | null
  at: string
}

export interface AdminOrder extends AdminOrderRow {
  locale: ContentLocale
  comment: string | null
  staffNote: string | null
  shipTo: OrderShipTo
  goodsCents: number
  deliveryCents: number
  paidAt: string | null
  /** SumUp: номер текущего платежа, попыток, код транзакции оплаченного */
  sumupCheckoutId: string | null
  paymentAttempts: number
  transactionCode: string | null
  consentAt: string
  policyVersion: string
  marketingOptIn: boolean
  orderItems: AdminOrderItem[]
  history: AdminOrderHistoryItem[]
  lead: { id: number; name: string; events: number; since: string; tags: string[] } | null
}

export const orderSaveSchema = z.object({
  status: z.enum(orderStatuses),
  trackingNo: z
    .string()
    .trim()
    .max(100)
    .transform((v) => v || null)
    .nullable()
    .default(null),
  staffNote: z
    .string()
    .trim()
    .max(4000)
    .transform((v) => v || null)
    .nullable()
    .default(null),
  // Пояснение к смене статуса — в историю
  note: z.string().trim().max(300).default(''),
  // Сообщить покупателю о смене статуса (если для нового статуса есть письмо)
  notifyBuyer: z.boolean().default(true),
})
export type OrderSave = z.input<typeof orderSaveSchema>

/** Куда можно перевести заказ из этого статуса: из отменённого — никуда */
export function orderStatusChoices(from: OrderStatus): OrderStatus[] {
  return FINAL_STATUSES.includes(from) ? [from] : [...orderStatuses]
}
