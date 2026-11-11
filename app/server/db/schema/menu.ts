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
  uuid,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import type { ContentLocale } from '../../../shared/locales'
import { users } from './users'
import { media } from './media'

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
  // «На отдельной странице»: категории нет в основном меню, у неё своя страница, а в меню —
  // кнопка на неё. Так сделаны алкогольные напитки (решение заказчицы 12.11.2026)
  ownPage: boolean('own_page').notNull().default(false),
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
    // Фото блюда — загруженная картинка (media)
    photoId: uuid('photo_id').references(() => media.id, { onDelete: 'set null' }),
    // Старое: ссылка на фото со старого сайта, как в прототипе. Задача media:import-dish-photos
    // переносит их в media; когда перенесены везде — колонку убрать (6.2)
    photo: text('photo'),
    isVisible: boolean('is_visible').notNull().default(true),
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
// Каждая — кнопка в фильтре меню, кнопку можно временно скрыть: значок на блюде остаётся.

export const dietTags = pgTable('diet_tags', {
  id: serial('id').primaryKey(),
  // Код для фильтра и стилей: veg, vegan, gf, lf, spicy
  key: text('key').notNull().unique(),
  sort: integer('sort').notNull().default(0),
  // «Временно скрыть кнопку» в фильтре. «Острое» скрыто: в списке заказчицы его нет (11.11.2026)
  filterHidden: boolean('filter_hidden').notNull().default(false),
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

// ---------- Отметки (служебные значки) ----------
// «Новинка», «Детское»… — значок на карточке блюда. Справочник пополняется в админке.
// Отметку можно показать кнопкой в фильтре — подборкой: «Новинки», «Сезонное» (одна за раз).

export const dishLabels = pgTable('dish_labels', {
  id: serial('id').primaryKey(),
  // Код для стилей значка: new, kids; у добавленных в админке — из названия
  key: text('key').notNull().unique(),
  sort: integer('sort').notNull().default(0),
  // «Показывать кнопкой в фильтре»
  inFilter: boolean('in_filter').notNull().default(false),
  // «Временно скрыть кнопку»: настройка «в фильтре» сохраняется, кнопки пока нет
  filterHidden: boolean('filter_hidden').notNull().default(false),
  ...timestamps,
})

export const dishLabelTranslations = pgTable(
  'dish_label_translations',
  {
    labelId: integer('label_id')
      .notNull()
      .references(() => dishLabels.id, { onDelete: 'cascade' }),
    locale: locale(),
    name: text('name').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.labelId, t.locale] }),
    localeCheck('dish_label_translations_locale', t.locale),
  ],
)

export const dishDishLabels = pgTable(
  'dish_dish_labels',
  {
    dishId: integer('dish_id')
      .notNull()
      .references(() => dishes.id, { onDelete: 'cascade' }),
    labelId: integer('label_id')
      .notNull()
      .references(() => dishLabels.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.dishId, t.labelId] })],
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
  labels: many(dishDishLabels),
  updatedByUser: one(users, { fields: [dishes.updatedBy], references: [users.id] }),
  photoMedia: one(media, { fields: [dishes.photoId], references: [media.id] }),
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

export const dishLabelsRelations = relations(dishLabels, ({ many }) => ({
  translations: many(dishLabelTranslations),
  dishes: many(dishDishLabels),
}))

export const dishLabelTranslationsRelations = relations(dishLabelTranslations, ({ one }) => ({
  label: one(dishLabels, { fields: [dishLabelTranslations.labelId], references: [dishLabels.id] }),
}))

export const dishDishLabelsRelations = relations(dishDishLabels, ({ one }) => ({
  dish: one(dishes, { fields: [dishDishLabels.dishId], references: [dishes.id] }),
  label: one(dishLabels, { fields: [dishDishLabels.labelId], references: [dishLabels.id] }),
}))
