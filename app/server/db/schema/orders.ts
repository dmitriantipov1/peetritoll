// Заказы магазина (7.3): заказ, его строки снимком (название и цена на момент покупки —
// товар потом могут переименовать или снять) и история. Типы и правила — shared/orders.ts.
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  boolean,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import type { ContentLocale } from '../../../shared/locales'
import type {
  DeliveryMethod,
  OrderHistoryKind,
  OrderShipTo,
  OrderStatus,
} from '../../../shared/orders'
import type { VariantKind } from '../../../shared/shop'
import { users } from './users'
import { leads } from './leads'
import { products, productVariants } from './shop'

export const orders = pgTable(
  'orders',
  {
    // Он же номер заказа «№ 2001» — счёт с 2001, чтобы не путать с заявками (миграция)
    id: serial('id').primaryKey(),
    // Ссылка на «Заказ принят» без номера в адресе: по номеру чужой заказ не открыть
    publicId: uuid('public_id').notNull().defaultRandom().unique(),
    status: text('status').$type<OrderStatus>().notNull().default('awaiting_payment'),
    // Язык версии сайта — на нём письма покупателю
    locale: text('locale').$type<ContentLocale>().notNull(),

    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    comment: text('comment'),
    staffNote: text('staff_note'),

    delivery: text('delivery').$type<DeliveryMethod>().notNull(),
    shipTo: jsonb('ship_to').$type<OrderShipTo>(),
    trackingNo: text('tracking_no'),

    goodsCents: integer('goods_cents').notNull(),
    deliveryCents: integer('delivery_cents').notNull(),
    totalCents: integer('total_cents').notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    // Оплата SumUp (5.3): текущий платёж (у каждой попытки свой), сколько попыток было
    // и код транзакции оплаченного. Без ключей SumUp — пусто, оплату отмечают руками
    sumupCheckoutId: text('sumup_checkout_id'),
    paymentAttempts: integer('payment_attempts').notNull().default(0),
    transactionCode: text('transaction_code'),
    // Когда начата последняя попытка: через час без оплаты заказ отменяется (orders:expire)
    paymentStartedAt: timestamp('payment_started_at', { withTimezone: true }),

    // Согласие с условиями и политикой (8.1) — когда и по какой версии политики
    consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
    policyVersion: text('policy_version').notNull(),
    marketingOptIn: boolean('marketing_opt_in').notNull().default(false),

    leadId: integer('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('orders_created').on(t.createdAt),
    index('orders_status').on(t.status),
    index('orders_sumup_checkout').on(t.sumupCheckoutId),
    check('orders_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
    check(
      'orders_status_check',
      sql`${t.status} in ('awaiting_payment', 'paid', 'packing', 'ready', 'shipped', 'done', 'cancelled')`,
    ),
    check('orders_delivery', sql`${t.delivery} in ('pickup', 'parcel', 'eu', 'none')`),
  ],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    // Ссылки на товар — для админки и возврата остатка; снимок ниже живёт и без них
    productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    // «Печатная книга», «PDF»; у единственного варианта — пусто
    label: text('label').notNull().default(''),
    kind: text('kind').$type<VariantKind>().notNull(),
    pickupOnly: boolean('pickup_only').notNull().default(false),
    priceCents: integer('price_cents').notNull(),
    qty: integer('qty').notNull(),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [
    index('order_items_order').on(t.orderId),
    check('order_items_qty', sql`${t.qty} > 0`),
    check('order_items_kind', sql`${t.kind} in ('physical', 'digital')`),
  ],
)

export const orderHistory = pgTable(
  'order_history',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<OrderHistoryKind>().notNull(),
    // status — «было → стало»; notified — канал и адрес
    note: text('note'),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('order_history_order_at').on(t.orderId, t.at),
    check('order_history_kind', sql`${t.kind} in ('created', 'status', 'notified')`),
  ],
)

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
  history: many(orderHistory),
}))
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}))
export const orderHistoryRelations = relations(orderHistory, ({ one }) => ({
  order: one(orders, { fields: [orderHistory.orderId], references: [orders.id] }),
}))

export type OrderRow = typeof orders.$inferSelect
