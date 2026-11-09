// Галерея на странице «Ресторан» (блок «В объективе „Петровской Таможни“»): фото по категориям.
// Порядок фото один на всю галерею — на сайте вкладка категории показывает её фото в том же порядке.
// Первое видимое фото — обложка блока. Картинки — в общей таблице media.
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

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}

export const galleryCategories = pgTable('gallery_categories', {
  id: serial('id').primaryKey(),
  sort: integer('sort').notNull().default(0),
  ...timestamps,
})

export const galleryCategoryTranslations = pgTable(
  'gallery_category_translations',
  {
    categoryId: integer('category_id')
      .notNull()
      .references(() => galleryCategories.id, { onDelete: 'cascade' }),
    locale: text('locale').$type<ContentLocale>().notNull(),
    name: text('name').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.locale] }),
    check('gallery_category_translations_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
  ],
)

export const galleryPhotos = pgTable(
  'gallery_photos',
  {
    id: serial('id').primaryKey(),
    // Категорию с фото удалить нельзя — сначала перенести или удалить фото
    categoryId: integer('category_id')
      .notNull()
      .references(() => galleryCategories.id, { onDelete: 'restrict' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('gallery_photos_sort').on(t.sort)],
)

// Подпись — она же описание картинки для незрячих и поисковиков (alt)
export const galleryPhotoTranslations = pgTable(
  'gallery_photo_translations',
  {
    photoId: integer('photo_id')
      .notNull()
      .references(() => galleryPhotos.id, { onDelete: 'cascade' }),
    locale: text('locale').$type<ContentLocale>().notNull(),
    caption: text('caption').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.photoId, t.locale] }),
    check('gallery_photo_translations_locale', sql`${t.locale} in ('et', 'en', 'ru')`),
  ],
)

export const galleryCategoriesRelations = relations(galleryCategories, ({ many }) => ({
  translations: many(galleryCategoryTranslations),
  photos: many(galleryPhotos),
}))

export const galleryCategoryTranslationsRelations = relations(
  galleryCategoryTranslations,
  ({ one }) => ({
    category: one(galleryCategories, {
      fields: [galleryCategoryTranslations.categoryId],
      references: [galleryCategories.id],
    }),
  }),
)

export const galleryPhotosRelations = relations(galleryPhotos, ({ one, many }) => ({
  category: one(galleryCategories, {
    fields: [galleryPhotos.categoryId],
    references: [galleryCategories.id],
  }),
  media: one(media, { fields: [galleryPhotos.mediaId], references: [media.id] }),
  translations: many(galleryPhotoTranslations),
}))

export const galleryPhotoTranslationsRelations = relations(galleryPhotoTranslations, ({ one }) => ({
  photo: one(galleryPhotos, {
    fields: [galleryPhotoTranslations.photoId],
    references: [galleryPhotos.id],
  }),
}))
