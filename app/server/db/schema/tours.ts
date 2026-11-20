// Экскурсионные программы — «Наши экскурсионные программы» на странице «Экскурсии и поездки»
// (20.11.2026, тексты заказчицы). Ведутся в админке: цены, гиды и языки меняются.
// Типы и проверка — shared/tours.ts. Порядок на сайте — поле sort (перетаскиванием в админке).
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
  uuid,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import type { ContentLocale } from '../../../shared/locales'
import type { TourLanguage, TourPriceUnit } from '../../../shared/tours'
import { users } from './users'
import { media } from './media'

export const tours = pgTable(
  'tours',
  {
    id: serial('id').primaryKey(),
    sort: integer('sort').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    // Цена в центах: за группу целиком или с человека
    priceCents: integer('price_cents').notNull(),
    priceUnit: text('price_unit').$type<TourPriceUnit>().notNull().default('group'),
    // «Группа от 12 человек»; null — без ограничения
    minPeople: integer('min_people'),
    // Имя гида как на сайте — одно на все языки; пусто — строки «Гид» нет
    guide: text('guide').notNull().default(''),
    // На каких языках проводится
    languages: text('languages').array().$type<TourLanguage[]>().notNull().default(sql`'{}'::text[]`),
    photoId: uuid('photo_id').references(() => media.id, { onDelete: 'set null' }),
    // Картинка из public/images — у программ, заведённых до загрузки фото (как legacy у блюд)
    legacyPhoto: text('legacy_photo'),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('tours_sort').on(t.sort),
    check('tours_price_positive', sql`${t.priceCents} >= 0`),
    check('tours_price_unit', sql`${t.priceUnit} in ('group', 'person')`),
    check('tours_min_people', sql`${t.minPeople} is null or ${t.minPeople} >= 1`),
  ],
)

export const tourTranslations = pgTable(
  'tour_translations',
  {
    tourId: integer('tour_id')
      .notNull()
      .references(() => tours.id, { onDelete: 'cascade' }),
    locale: text('locale').$type<ContentLocale>().notNull(),
    title: text('title').notNull(),
    text: text('text'),
    // «20 минут», «1,5–2 часа»
    duration: text('duration'),
    // «по предварительному заказу · для групп и индивидуальных гостей»
    terms: text('terms'),
  },
  (t) => [
    primaryKey({ columns: [t.tourId, t.locale] }),
    check('tour_translations_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
  ],
)

export const toursRelations = relations(tours, ({ many, one }) => ({
  translations: many(tourTranslations),
  photo: one(media, { fields: [tours.photoId], references: [media.id] }),
}))

export const tourTranslationsRelations = relations(tourTranslations, ({ one }) => ({
  tour: one(tours, { fields: [tourTranslations.tourId], references: [tours.id] }),
}))
