// Лиды (8.2): один человек — один контакт, его заявки (а позже заказы и подписка) — события.
// Склейка: по почте, без почты — по телефону. Автотеги ставит сайт по источнику, свои — персонал.
// Согласие на рассылку — отдельно от согласия на обработку: только оно пускает контакт в Mautic.
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import type { ContentLocale } from '../../../shared/locales'
import type { LeadMarketing } from '../../../shared/leads'

export const leads = pgTable(
  'leads',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    // Ключ склейки. В нижнем регистре
    email: text('email').unique(),
    // Телефон как его ввели — для показа и звонка
    phone: text('phone'),
    // Только цифры — запасной ключ склейки и поиск возможных дублей
    phoneKey: text('phone_key'),
    // Язык писем: язык версии сайта, с которой пришло последнее обращение
    locale: text('locale').$type<ContentLocale>().notNull(),
    // no — не давал, pending — ждём подтверждения по письму (подписка), yes — согласен
    marketing: text('marketing').$type<LeadMarketing>().notNull().default('no'),
    // Когда и где дал согласие на рассылку или отписался — доказательство (8.2)
    marketingAt: timestamp('marketing_at', { withTimezone: true }),
    marketingSource: text('marketing_source'),
    lastEventAt: timestamp('last_event_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('leads_phone_key').on(t.phoneKey),
    index('leads_last_event').on(t.lastEventAt),
    check('leads_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
    check('leads_marketing', sql`${t.marketing} in ('no', 'pending', 'yes')`),
    check('leads_contact', sql`${t.email} is not null or ${t.phoneKey} is not null`),
  ],
)

// Теги лида. auto — поставил сайт по источнику («бронь стола», «мероприятие: Ночь музеев»),
// их не убрать: они показывают, откуда пришёл человек. Свои — персонал. Уедут в Mautic как есть.
export const leadTags = pgTable(
  'lead_tags',
  {
    leadId: integer('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
    auto: boolean('auto').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.leadId, t.tag] }), index('lead_tags_tag').on(t.tag)],
)

export const leadsRelations = relations(leads, ({ many }) => ({
  tags: many(leadTags),
}))

export const leadTagsRelations = relations(leadTags, ({ one }) => ({
  lead: one(leads, { fields: [leadTags.leadId], references: [leads.id] }),
}))

export type LeadRow = typeof leads.$inferSelect
