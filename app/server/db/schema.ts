// Схема базы. Каждая таблица описывается здесь, миграции генерирует drizzle-kit:
//   npm run db:generate  — SQL-миграция из изменений схемы (папка server/db/migrations)
//   npm run db:migrate   — применить миграции к базе
//
// Импорты — относительные: схему читает и drizzle-kit, вне Nuxt, алиасов он не знает.
import { boolean, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import type { Permissions, Role } from '../../shared/access'

// Сотрудники, которые входят в админку (5.2). Роли и разделы — shared/access.ts.
// Учётную запись не удаляют, а отключают (isActive): имя остаётся в истории заявок.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  // Храним в нижнем регистре: вход не должен зависеть от того, как набрали почту
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  // Пусто, пока сотрудник не задал пароль по ссылке из письма-приглашения
  passwordHash: text('password_hash'),
  // Роль — строка, а не enum базы: набор ролей ещё уточняется, менять enum в PostgreSQL неудобно
  role: text('role').$type<Role>().notNull(),
  // Права по разделам — только у сотрудника; админу и владельцу доступно всё (shared/access.ts)
  permissions: jsonb('permissions').$type<Permissions>().notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  // Когда пароль меняли в последний раз: сессии, открытые раньше, перестают действовать
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type UserRow = typeof users.$inferSelect
