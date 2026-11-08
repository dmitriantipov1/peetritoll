// Схема базы. Каждая таблица описывается здесь, миграции генерирует drizzle-kit:
//   npm run db:generate  — SQL-миграция из изменений схемы (папка server/db/migrations)
//   npm run db:migrate   — применить миграции к базе
import { pgTable, serial, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

// Сотрудники, которые входят в админку. Права на разделы — шаг 0.6 (5.2 в требованиях).
export const userRole = pgEnum('user_role', ['owner', 'staff'])

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('staff'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
