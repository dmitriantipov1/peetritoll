// Каталоги для калькуляторов: банкетное и групповое меню (7.1). Свои блюда и цены за порцию,
// с основным меню не связаны. Устроены одинаково, различаются полем kind.
// Сеты банкета — внизу файла; настройки калькуляторов — в settings (banquet, group).
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
import type { BanquetTier, CatalogKind } from '../../../shared/catalog'
import { users } from './users'

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

export const catalogCategories = pgTable(
  'catalog_categories',
  {
    id: serial('id').primaryKey(),
    kind: text('kind').$type<CatalogKind>().notNull(),
    sort: integer('sort').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('catalog_categories_kind_sort').on(t.kind, t.sort),
    check('catalog_categories_kind', sql`${t.kind} in ('banquet', 'group')`),
  ],
)

export const catalogCategoryTranslations = pgTable(
  'catalog_category_translations',
  {
    categoryId: integer('category_id')
      .notNull()
      .references(() => catalogCategories.id, { onDelete: 'cascade' }),
    locale: text('locale').$type<ContentLocale>().notNull(),
    name: text('name').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.locale] }),
    check('catalog_category_translations_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
  ],
)

export const catalogDishes = pgTable(
  'catalog_dishes',
  {
    id: serial('id').primaryKey(),
    // Категорию с блюдами удалить нельзя — сначала перенести или удалить блюда
    categoryId: integer('category_id')
      .notNull()
      .references(() => catalogCategories.id, { onDelete: 'restrict' }),
    sort: integer('sort').notNull().default(0),
    priceCents: integer('price_cents').notNull(),
    // Прежняя цена и когда поменяли — «цена изменена 31.10: было 14,50 €» в админке.
    // Заявки хранят цены снимком (7.1), так что смена цены их не трогает
    previousPriceCents: integer('previous_price_cents'),
    priceChangedAt: timestamp('price_changed_at', { withTimezone: true }),
    // «Можно заказать»: выключено — блюда нет в калькуляторе на сайте
    isAvailable: boolean('is_available').notNull().default(true),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index('catalog_dishes_category_sort').on(t.categoryId, t.sort),
    check('catalog_dishes_price_positive', sql`${t.priceCents} >= 0`),
  ],
)

export const catalogDishTranslations = pgTable(
  'catalog_dish_translations',
  {
    dishId: integer('dish_id')
      .notNull()
      .references(() => catalogDishes.id, { onDelete: 'cascade' }),
    locale: text('locale').$type<ContentLocale>().notNull(),
    name: text('name').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.dishId, t.locale] }),
    check('catalog_dish_translations_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
  ],
)

export const catalogCategoriesRelations = relations(catalogCategories, ({ many }) => ({
  translations: many(catalogCategoryTranslations),
  dishes: many(catalogDishes),
}))

export const catalogCategoryTranslationsRelations = relations(
  catalogCategoryTranslations,
  ({ one }) => ({
    category: one(catalogCategories, {
      fields: [catalogCategoryTranslations.categoryId],
      references: [catalogCategories.id],
    }),
  }),
)

export const catalogDishesRelations = relations(catalogDishes, ({ one, many }) => ({
  category: one(catalogCategories, {
    fields: [catalogDishes.categoryId],
    references: [catalogCategories.id],
  }),
  translations: many(catalogDishTranslations),
}))

export const catalogDishTranslationsRelations = relations(catalogDishTranslations, ({ one }) => ({
  dish: one(catalogDishes, {
    fields: [catalogDishTranslations.dishId],
    references: [catalogDishes.id],
  }),
}))

// ---------- Сеты банкета (7.1) ----------
// Три ступени — базовый, средний, премиум. У ступени название («Таможенный») и состав из блюд
// банкетного каталога; цена сета не хранится — считается из цен блюд, чтобы не устаревала.
// Сет без блюд на сайте не показываем.

export const banquetSetTranslations = pgTable(
  'banquet_set_translations',
  {
    tier: text('tier').$type<BanquetTier>().notNull(),
    locale: text('locale').$type<ContentLocale>().notNull(),
    name: text('name').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tier, t.locale] }),
    check('banquet_set_translations_tier', sql`${t.tier} in ('basic', 'middle', 'premium')`),
    check('banquet_set_translations_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
  ],
)

export const banquetSetDishes = pgTable(
  'banquet_set_dishes',
  {
    tier: text('tier').$type<BanquetTier>().notNull(),
    // Удалили блюдо из каталога — оно уходит и из сетов
    dishId: integer('dish_id')
      .notNull()
      .references(() => catalogDishes.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.tier, t.dishId] }),
    check('banquet_set_dishes_tier', sql`${t.tier} in ('basic', 'middle', 'premium')`),
  ],
)
