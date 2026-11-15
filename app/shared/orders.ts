// Заказы магазина (7.3): правила получения и доставки, данные формы оформления, статусы.
// Пока без оплаты (решение 15.11.2026): заказ сохраняется со статусом «ждёт оплаты»,
// позже между «Оформить» и «Спасибо» встанет страница оплаты SumUp.
import { z } from 'zod'
import { contentLocales } from './locales'
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
    phone: z
      .string()
      .trim()
      .max(40, 'Телефон слишком длинный')
      .regex(/^[+\d\s()-]*$/, 'В телефоне — только цифры, пробелы, +, -, скобки')
      .transform((v) => v || null)
      .nullable()
      .default(null),
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

/** awaiting_payment — оформлен, оплаты ещё нет (пока SumUp не подключён — все заказы такие);
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
}
