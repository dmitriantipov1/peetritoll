// Групповое меню — «Трапезы групп» (7.1, ответы заказчицы 12.11.2026): готовые комплексные
// обеды для экскурсионных групп. Заменили каталог блюд группы с калькулятором (миграция 0016).
// Настройки (минимум человек, срок заказа) — в settings, ключ group.
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

export const groupMenus = pgTable(
  'group_menus',
  {
    id: serial('id').primaryKey(),
    // «Меню № 3»: по номеру обед называют по телефону, по нему же порядок на сайте.
    // Не уникален в базе — повтор не даёт сохранить сервер, а поменять номера местами можно
    number: integer('number').notNull(),
    // Цена с человека, в центах
    priceCents: integer('price_cents').notNull(),
    isVisible: boolean('is_visible').notNull().default(true),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('group_menus_number').on(t.number),
    check('group_menus_price_positive', sql`${t.priceCents} >= 0`),
  ],
)

export const groupMenuTranslations = pgTable(
  'group_menu_translations',
  {
    menuId: integer('menu_id')
      .notNull()
      .references(() => groupMenus.id, { onDelete: 'cascade' }),
    locale: text('locale').$type<ContentLocale>().notNull(),
    name: text('name').notNull(),
    // Состав — по строке на блюдо
    items: text('items'),
  },
  (t) => [
    primaryKey({ columns: [t.menuId, t.locale] }),
    check('group_menu_translations_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
  ],
)

export const groupMenusRelations = relations(groupMenus, ({ many }) => ({
  translations: many(groupMenuTranslations),
}))

export const groupMenuTranslationsRelations = relations(groupMenuTranslations, ({ one }) => ({
  menu: one(groupMenus, { fields: [groupMenuTranslations.menuId], references: [groupMenus.id] }),
}))
