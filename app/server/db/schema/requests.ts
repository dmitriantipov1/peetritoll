// Заявки (7.1, 7.2, 8.1): бронь стола, банкет, группа, предзаказ обеда, экскурсия, запись
// на мероприятие — одна таблица на все виды. Общее (визит, гость, согласия) — колонками,
// своё у каждого вида — в details, расчёт с ценами — снимком в calc. Типы — shared/requests.ts.
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import type { ContentLocale } from '../../../shared/locales'
import type {
  RequestCalc,
  RequestChange,
  RequestDetails,
  RequestHistoryKind,
  RequestOriginal,
  RequestSource,
  RequestStatus,
  RequestType,
} from '../../../shared/requests'
import { users } from './users'
import { leads } from './leads'

export const requests = pgTable(
  'requests',
  {
    // Он же номер заявки «№ 1001» — счёт начинается с 1001 (миграция 0012)
    id: serial('id').primaryKey(),
    type: text('type').$type<RequestType>().notNull(),
    status: text('status').$type<RequestStatus>().notNull().default('new'),
    // site — форма на сайте, admin — внесли в админке (звонок, визит)
    source: text('source').$type<RequestSource>().notNull(),
    // Язык версии сайта, с которой пришла заявка, — на нём отвечаем гостю
    locale: text('locale').$type<ContentLocale>().notNull(),

    // Визит. Время — «ЧЧ:ММ» по Таллину; у экскурсии и мероприятия может не быть
    visitDate: date('visit_date', { mode: 'string' }),
    visitTime: text('visit_time'),
    guests: integer('guests'),

    // Гость
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    comment: text('comment'),
    // Заметка для персонала — гость её не видит
    staffNote: text('staff_note'),

    // Своё у каждого вида: повод, агентство, тема экскурсии, мероприятие…
    details: jsonb('details').$type<RequestDetails>().notNull(),
    // Расчёт банкета, группы, обеда: блюда и цены снимком на момент отправки (7.1)
    calc: jsonb('calc').$type<RequestCalc>(),
    // Дата, время и гостей как пришли — чтобы показать «в заявке было 18:30»
    original: jsonb('original').$type<RequestOriginal>().notNull(),

    // Согласие на обработку (8.1): когда и по какой версии политики. У внесённых вручную — нет
    consentAt: timestamp('consent_at', { withTimezone: true }),
    policyVersion: text('policy_version'),
    // Галочка «согласен на рассылку» в форме — отдельно от согласия на обработку (8.2)
    marketingOptIn: boolean('marketing_opt_in').notNull().default(false),

    // Контакт в лидах (8.2): одна запись на человека, заявки — его события
    leadId: integer('lead_id').references(() => leads.id, { onDelete: 'set null' }),

    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('requests_status_created').on(t.status, t.createdAt),
    index('requests_type_created').on(t.type, t.createdAt),
    index('requests_visit_date').on(t.visitDate),
    index('requests_lead').on(t.leadId),
    check(
      'requests_type',
      sql`${t.type} in ('table', 'banquet', 'group', 'lunch', 'tour', 'event')`,
    ),
    check('requests_status', sql`${t.status} in ('new', 'in_progress', 'confirmed', 'cancelled')`),
    check('requests_source', sql`${t.source} in ('site', 'admin')`),
    check('requests_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
    check('requests_guests_positive', sql`${t.guests} is null or ${t.guests} > 0`),
    // С сайта заявка без согласия не принимается (8.1)
    check(
      'requests_site_consent',
      sql`${t.source} <> 'site' or (${t.consentAt} is not null and ${t.policyVersion} is not null)`,
    ),
  ],
)

// История заявки: поступила, статус, что изменили, ушло уведомление. Только добавляется.
export const requestHistory = pgTable(
  'request_history',
  {
    id: serial('id').primaryKey(),
    requestId: integer('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<RequestHistoryKind>().notNull(),
    // status — { from, to }; changed — список полей «было → стало»
    changes: jsonb('changes').$type<RequestChange[]>().notNull().default([]),
    // Пояснение: «по звонку гостя», адрес письма, канал уведомления
    note: text('note'),
    // Кто сделал. Пусто — сайт или сама система
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('request_history_request_at').on(t.requestId, t.at),
    check('request_history_kind', sql`${t.kind} in ('created', 'status', 'changed', 'notified')`),
  ],
)

export const requestsRelations = relations(requests, ({ many }) => ({
  history: many(requestHistory),
}))

export const requestHistoryRelations = relations(requestHistory, ({ one }) => ({
  request: one(requests, { fields: [requestHistory.requestId], references: [requests.id] }),
  user: one(users, { fields: [requestHistory.userId], references: [users.id] }),
}))

export type RequestRow = typeof requests.$inferSelect
export type RequestHistoryRow = typeof requestHistory.$inferSelect
