// Настройки сайта «ключ → значение»: дневное меню (lunch), позже контакты, часы,
// выключатели разделов (срез «Контакты, часы работы, настройки сайта»).
// Значение — JSON; его форму описывает и проверяет схема zod в shared/ для каждого ключа.
import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})
