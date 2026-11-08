// Загруженные картинки (общий механизм 0.3): фото блюд, позже — галерея, товары, афиши.
// Файлы — на диске (NUXT_UPLOADS_DIR), в базе — где лежат и какие размеры есть.
// Обработка и раздача — server/utils/media.ts, адреса — shared/media.ts.
import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Папка внутри хранилища: 2026/11/<id>. В ней файлы по ширине: 320.webp, 800.webp, 1600.webp
  folder: text('folder').notNull().unique(),
  // Размер самой большой сохранённой версии
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  // Какие ширины сохранены: маленькую картинку не растягиваем, лишних версий нет
  sizes: integer('sizes').array().notNull(),
  // Для админки: под каким именем файл загрузили или откуда скачали
  source: text('source'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type MediaRow = typeof media.$inferSelect
