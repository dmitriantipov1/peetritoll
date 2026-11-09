// Сотрудники админки. Общие правила схемы — в index.ts.
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import type { Permissions, Role } from '../../../shared/access'

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

// Одноразовые ссылки «задать пароль» (5.2): приглашение нового сотрудника и новый пароль.
// В базе — только хэш ссылки: по утёкшей базе войти нельзя. Сама ссылка показывается
// один раз — тому, кто её выдал (пока почты нет, её передают сотруднику сами).
// Новая ссылка гасит прежние неиспользованные ссылки того же человека.
export const passwordLinks = pgTable(
  'password_links',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // SHA-256 от случайной части ссылки, в hex
    tokenHash: text('token_hash').notNull().unique(),
    // invite — первый пароль, reset — новый вместо прежнего
    kind: text('kind').$type<'invite' | 'reset'>().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    // Когда по ссылке задали пароль или её погасили новой — после этого она не действует
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('password_links_user_idx').on(t.userId)],
)

export type PasswordLinkRow = typeof passwordLinks.$inferSelect
