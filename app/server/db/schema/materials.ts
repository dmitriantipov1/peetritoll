// Материалы (5.7): новости, мероприятия и страницы — одна сущность с типом.
// Общее у всех: заголовок, адрес (слаг), обложка, текст, переводы, состояние, языки, дата выхода.
// У мероприятия сверху — дата и время, вид, место, цена для справки и запись: material_events.
//
// Состояние на сайте выводится, а не хранится отдельно (shared/materials.ts → materialStatus):
// «опубликовано» с датой выхода в будущем — «запланировано», выходит само, без задач по расписанию;
// мероприятие с отметкой «после даты — в архив» уходит в архив на следующий день после проведения.
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import type { ContentLocale } from '../../../shared/locales'
import type {
  EventKind,
  EventPlace,
  MaterialState,
  MaterialType,
  NewsTopic,
} from '../../../shared/materials'
import { users } from './users'
import { media } from './media'

export const materials = pgTable(
  'materials',
  {
    id: serial('id').primaryKey(),
    type: text('type').$type<MaterialType>().notNull(),
    state: text('state').$type<MaterialState>().notNull().default('draft'),
    // Дата выхода: у опубликованного — когда вышло или выйдет. Ставится при первой публикации,
    // если не задана заранее. У новости это и есть её дата на сайте
    publishAt: timestamp('publish_at', { withTimezone: true }),
    // Где показывать (8.5): в каких версиях сайта материал есть. Это не перевод:
    // выключенный язык — материала для этой аудитории нет совсем, даже если перевод есть
    locales: text('locales').array().$type<ContentLocale[]>().notNull(),
    // Тема новости — фильтр на странице «Новости» (13.11.2026); у остальных типов пусто
    topic: text('topic').$type<NewsTopic>(),
    coverId: uuid('cover_id').references(() => media.id, { onDelete: 'set null' }),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('materials_type_publish').on(t.type, t.publishAt),
    check('materials_type', sql`${t.type} in ('news', 'event', 'page')`),
    check('materials_state', sql`${t.state} in ('draft', 'published', 'archived')`),
    check(
      'materials_topic',
      sql`${t.topic} is null or ${t.topic} in ('restaurant', 'museum', 'events')`,
    ),
    check('materials_locales', sql`${t.locales} <@ array['et', 'en', 'ru']::text[]`),
  ],
)

export const materialTranslations = pgTable(
  'material_translations',
  {
    materialId: integer('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    locale: text('locale').$type<ContentLocale>().notNull(),
    title: text('title').notNull(),
    // Адрес на этом языке: /ru/news/sezonnoe-menyu и /et/news/hooaja-menuu (решение 08.11.2026)
    slug: text('slug').notNull(),
    // Коротко — для карточки в списке
    lead: text('lead'),
    // Текст страницы — HTML из редактора, очищенный на сервере (server/utils/rich-text.ts)
    body: text('body').notNull().default(''),
    // Мероприятие: цена для справки, «15 €, бокал глинтвейна включён»
    priceNote: text('price_note'),
  },
  (t) => [
    primaryKey({ columns: [t.materialId, t.locale] }),
    // Один адрес — один материал на языке, какого бы типа он ни был:
    // так страница не займёт адрес новости, и при смене типа ничего не столкнётся
    uniqueIndex('material_translations_locale_slug').on(t.locale, t.slug),
    check('material_translations_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
  ],
)

export const materialEvents = pgTable(
  'material_events',
  {
    materialId: integer('material_id')
      .primaryKey()
      .references(() => materials.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<EventKind>(),
    // Дата проведения, «2026-11-08»; время начала «18:00» — по Таллину
    date: date('date', { mode: 'string' }).notNull(),
    startTime: text('start_time'),
    place: text('place').$type<EventPlace>(),
    // Принимать запись на сайте; мест всего — пусто, если без ограничения
    registrationOpen: boolean('registration_open').notNull().default(false),
    capacity: integer('capacity'),
    // После даты проведения — в архив (на сайте «Предстоящие / Архив»)
    archiveAfter: boolean('archive_after').notNull().default(true),
  },
  (t) => [
    index('material_events_date').on(t.date),
    check('material_events_capacity', sql`${t.capacity} is null or ${t.capacity} > 0`),
  ],
)

export const materialsRelations = relations(materials, ({ one, many }) => ({
  translations: many(materialTranslations),
  event: one(materialEvents),
  cover: one(media, { fields: [materials.coverId], references: [media.id] }),
  updatedByUser: one(users, { fields: [materials.updatedBy], references: [users.id] }),
}))

export const materialTranslationsRelations = relations(materialTranslations, ({ one }) => ({
  material: one(materials, {
    fields: [materialTranslations.materialId],
    references: [materials.id],
  }),
}))

export const materialEventsRelations = relations(materialEvents, ({ one }) => ({
  material: one(materials, { fields: [materialEvents.materialId], references: [materials.id] }),
}))
