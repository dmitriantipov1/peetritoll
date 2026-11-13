// Подписка на рассылку с сайта (8.2, double opt-in): гость вводит почту — заводим запись
// и шлём письмо со ссылкой; подписка включается только после подтверждения по ссылке.
// Неподтверждённые записи — не лиды: чужой адрес, введённый по ошибке, в базу контактов не попадает.
// Подтверждённая запись — доказательство согласия: адрес, когда, с какой версией политики.
import { check, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { ContentLocale } from '../../../shared/locales'
import { leads } from './leads'

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: serial('id').primaryKey(),
    // В нижнем регистре
    email: text('email').notNull(),
    // Версия сайта, с которой подписались, — язык писем
    locale: text('locale').$type<ContentLocale>().notNull(),
    // SHA-256 от случайной части ссылки, в hex; саму ссылку видит только гость в письме
    tokenHash: text('token_hash').notNull().unique(),
    // Версия политики конфиденциальности, с которой гость согласился (8.1)
    policyVersion: text('policy_version').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    // Контакт, у которого после подтверждения включилась рассылка
    leadId: integer('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('subscriptions_email').on(t.email),
    check('subscriptions_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
  ],
)

export type SubscriptionRow = typeof subscriptions.$inferSelect
