// Основное меню ресторана (7.1 в требованиях): категории, блюда, порции с ценами,
// отметки для гостей (вегетарианское, без лактозы…). Дневное, банкетное и групповое
// меню — отдельные, придут своими срезами.
//
// Тексты — в таблицах «*_translations», по строке на язык (shared/locales.ts).
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
import { users } from './users'

// Колонка языка: только et, en, ru — проверяет сама база
const locale = () => text('locale').$type<ContentLocale>().notNull()
const localeCheck = (name: string, column: { name: string }) =>
  check(name, sql`${sql.identifier(column.name)} in ('et', 'en', 'ru')`)

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

// ---------- Категории ----------

export const menuCategories = pgTable('menu_categories', {
  id: serial('id').primaryKey(),
  // Якорь в адресе: /et/menu#soups. Один на всех языках, как и адреса страниц (5.1)
  slug: text('slug').notNull().unique(),
  sort: integer('sort').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
  ...timestamps,
})

export const menuCategoryTranslations = pgTable(
  'menu_category_translations',
  {
    categoryId: integer('category_id')
      .notNull()
      .references(() => menuCategories.id, { onDelete: 'cascade' }),
    locale: locale(),
    name: text('name').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.locale] }),
    localeCheck('menu_category_translations_locale', t.locale),
  ],
)

// ---------- Блюда ----------

export const dishes = pgTable(
  'dishes',
  {
    id: serial('id').primaryKey(),
    // Категорию с блюдами удалить нельзя — сначала перенести или удалить блюда
    categoryId: integer('category_id')
      .notNull()
      .references(() => menuCategories.id, { onDelete: 'restrict' }),
    sort: integer('sort').notNull().default(0),
    // Адрес фото. Пока — ссылки на старый сайт, как в прототипе; загрузка — слоем «Фото»
    photo: text('photo'),
    isVisible: boolean('is_visible').notNull().default(true),
    // Служебные отметки из админки прототипа: «Новинка», «Детское»
    isNew: boolean('is_new').notNull().default(false),
    isKids: boolean('is_kids').notNull().default(false),
    // Кто менял последним — «изменено 12.04.2026, Ольга Петрова» в карточке блюда
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('dishes_category_sort').on(t.categoryId, t.sort)],
)

export const dishTranslations = pgTable(
  'dish_translations',
  {
    dishId: integer('dish_id')
      .notNull()
      .references(() => dishes.id, { onDelete: 'cascade' }),
    locale: locale(),
    name: text('name').notNull(),
    description: text('description'),
  },
  (t) => [
    primaryKey({ columns: [t.dishId, t.locale] }),
    localeCheck('dish_translations_locale', t.locale),
  ],
)

// ---------- Порции и цены ----------
// У каждого блюда хотя бы одна порция. Одна цена — одна порция без подписи;
// у супов две: «Маленькая порция», «Большая порция».

export const dishPortions = pgTable(
  'dish_portions',
  {
    id: serial('id').primaryKey(),
    dishId: integer('dish_id')
      .notNull()
      .references(() => dishes.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull().default(0),
    // В центах: 5,60 € → 560. Деньги не храним дробными числами — копятся ошибки округления
    priceCents: integer('price_cents').notNull(),
  },
  (t) => [
    index('dish_portions_dish').on(t.dishId),
    check('dish_portions_price_positive', sql`${t.priceCents} >= 0`),
  ],
)

export const dishPortionTranslations = pgTable(
  'dish_portion_translations',
  {
    portionId: integer('portion_id')
      .notNull()
      .references(() => dishPortions.id, { onDelete: 'cascade' }),
    locale: locale(),
    label: text('label').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.portionId, t.locale] }),
    localeCheck('dish_portion_translations_locale', t.locale),
  ],
)

// ---------- Отметки для гостей ----------
// Справочник ведётся в «Настройках» (7.1): вегетарианское, веганское, без глютена…

export const dietTags = pgTable('diet_tags', {
  id: serial('id').primaryKey(),
  // Код для фильтра и стилей: veg, vegan, gf, lf, spicy
  key: text('key').notNull().unique(),
  sort: integer('sort').notNull().default(0),
  ...timestamps,
})

export const dietTagTranslations = pgTable(
  'diet_tag_translations',
  {
    tagId: integer('tag_id')
      .notNull()
      .references(() => dietTags.id, { onDelete: 'cascade' }),
    locale: locale(),
    name: text('name').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tagId, t.locale] }),
    localeCheck('diet_tag_translations_locale', t.locale),
  ],
)

export const dishDietTags = pgTable(
  'dish_diet_tags',
  {
    dishId: integer('dish_id')
      .notNull()
      .references(() => dishes.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => dietTags.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.dishId, t.tagId] })],
)

// ---------- Связи для запросов с вложенными данными (db.query…findMany({ with })) ----------

export const menuCategoriesRelations = relations(menuCategories, ({ many }) => ({
  translations: many(menuCategoryTranslations),
  dishes: many(dishes),
}))

export const menuCategoryTranslationsRelations = relations(menuCategoryTranslations, ({ one }) => ({
  category: one(menuCategories, {
    fields: [menuCategoryTranslations.categoryId],
    references: [menuCategories.id],
  }),
}))

export const dishesRelations = relations(dishes, ({ one, many }) => ({
  category: one(menuCategories, { fields: [dishes.categoryId], references: [menuCategories.id] }),
  translations: many(dishTranslations),
  portions: many(dishPortions),
  dietTags: many(dishDietTags),
  updatedByUser: one(users, { fields: [dishes.updatedBy], references: [users.id] }),
}))

export const dishTranslationsRelations = relations(dishTranslations, ({ one }) => ({
  dish: one(dishes, { fields: [dishTranslations.dishId], references: [dishes.id] }),
}))

export const dishPortionsRelations = relations(dishPortions, ({ one, many }) => ({
  dish: one(dishes, { fields: [dishPortions.dishId], references: [dishes.id] }),
  translations: many(dishPortionTranslations),
}))

export const dishPortionTranslationsRelations = relations(dishPortionTranslations, ({ one }) => ({
  portion: one(dishPortions, {
    fields: [dishPortionTranslations.portionId],
    references: [dishPortions.id],
  }),
}))

export const dietTagsRelations = relations(dietTags, ({ many }) => ({
  translations: many(dietTagTranslations),
  dishes: many(dishDietTags),
}))

export const dietTagTranslationsRelations = relations(dietTagTranslations, ({ one }) => ({
  tag: one(dietTags, { fields: [dietTagTranslations.tagId], references: [dietTags.id] }),
}))

export const dishDietTagsRelations = relations(dishDietTags, ({ one }) => ({
  dish: one(dishes, { fields: [dishDietTags.dishId], references: [dishes.id] }),
  tag: one(dietTags, { fields: [dishDietTags.tagId], references: [dietTags.id] }),
}))
