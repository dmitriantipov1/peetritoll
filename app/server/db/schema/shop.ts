// Магазин (7.3, 7.4, 8.5): категории, товары, варианты, фото, файлы цифровых товаров.
// Товар — карточка для покупателя, вариант — то, что кладут в корзину (цена, остаток, вид).
// Типы и правила — shared/shop.ts. Заказы — отдельно, вместе с оплатой (этап 4).
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import type { ContentLocale } from '../../../shared/locales'
import type { DeliveryMode, ProductFact, ProductState, VariantKind } from '../../../shared/shop'
import { users } from './users'
import { media } from './media'

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}
const localeCheck = (name: string, col: unknown) => check(name, sql`${col} in ('et', 'en', 'ru')`)

// ---------- Категории ----------
// Заказчица заводит, скрывает и упорядочивает их сама (7.3). Категория, в которой для языка
// сайта нечего показать, на сайте не видна (8.5) — это считает сайт, здесь не хранится.

export const shopCategories = pgTable(
  'shop_categories',
  {
    id: serial('id').primaryKey(),
    // Код для адреса: /shop#books. После создания не меняется — на него ведут ссылки
    slug: text('slug').notNull().unique(),
    sort: integer('sort').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('shop_categories_sort').on(t.sort)],
)

export const shopCategoryTranslations = pgTable(
  'shop_category_translations',
  {
    categoryId: integer('category_id')
      .notNull()
      .references(() => shopCategories.id, { onDelete: 'cascade' }),
    locale: text('locale').$type<ContentLocale>().notNull(),
    name: text('name').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.categoryId, t.locale] }),
    localeCheck('shop_category_translations_locale', t.locale),
  ],
)

// ---------- Товары ----------

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    // Категорию с товарами не удалить — сначала перенести товары
    categoryId: integer('category_id')
      .notNull()
      .references(() => shopCategories.id, { onDelete: 'restrict' }),
    state: text('state').$type<ProductState>().notNull().default('draft'),
    // Где показывать (8.5): выключенный язык — товара в этой версии сайта нет совсем.
    // Не путать с переводом: без перевода покажем эстонский текст
    locales: text('locales').array().$type<ContentLocale[]>().notNull(),
    sort: integer('sort').notNull().default(0),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index('products_category_sort').on(t.categoryId, t.sort),
    check('products_state', sql`${t.state} in ('draft', 'published', 'archived')`),
    check('products_locales', sql`${t.locales} <@ array['et', 'en', 'ru']::text[]`),
  ],
)

export const productTranslations = pgTable(
  'product_translations',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    locale: text('locale').$type<ContentLocale>().notNull(),
    name: text('name').notNull(),
    // Адрес страницы товара на этом языке: /ru/shop/byloj-paldiski
    slug: text('slug').notNull(),
    // Строка под названием в карточке: «Галина Малютина · 2022 · 144 стр.»
    lead: text('lead'),
    description: text('description'),
    // Характеристики на странице товара: «Размер — 30 × 22 см»
    facts: jsonb('facts').$type<ProductFact[]>().notNull().default([]),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.locale] }),
    uniqueIndex('product_translations_slug').on(t.locale, t.slug),
    localeCheck('product_translations_locale', t.locale),
  ],
)

// Фото: первое по порядку — обложка в каталоге. Картинки — в общей таблице media
export const productPhotos = pgTable(
  'product_photos',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.mediaId] }),
    index('product_photos_sort').on(t.productId, t.sort),
  ],
)

// ---------- Варианты ----------

export const productVariants = pgTable(
  'product_variants',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull().default(0),
    kind: text('kind').$type<VariantKind>().notNull(),
    priceCents: integer('price_cents').notNull(),
    // Сколько штук. Пусто — не считаем (цифровой товар, тираж без учёта). Антиквариат — 1
    stock: integer('stock'),
    // Как получить — только у физического (7.3)
    delivery: text('delivery').$type<DeliveryMode>(),
    // Снят с продажи, но остаётся в старых заказах
    isAvailable: boolean('is_available').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index('product_variants_product_sort').on(t.productId, t.sort),
    check('product_variants_kind', sql`${t.kind} in ('physical', 'digital')`),
    check('product_variants_price', sql`${t.priceCents} >= 0`),
    check('product_variants_stock', sql`${t.stock} is null or ${t.stock} >= 0`),
    check(
      'product_variants_delivery',
      sql`(${t.kind} = 'physical') = (${t.delivery} is not null) and (${t.delivery} is null or ${t.delivery} in ('pickup', 'shipping'))`,
    ),
  ],
)

// Подпись варианта: «Печатная книга», «PDF», «Отпечаток 8×12 см». У единственного варианта — нет
export const productVariantTranslations = pgTable(
  'product_variant_translations',
  {
    variantId: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    locale: text('locale').$type<ContentLocale>().notNull(),
    label: text('label').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.variantId, t.locale] }),
    localeCheck('product_variant_translations_locale', t.locale),
  ],
)

// Файлы цифрового варианта — по языкам (7.4): PDF на эстонском и на русском — два файла
// одного товара. Лежат вне /uploads, наружу — только по ссылке после оплаты (этап 4)
export const productFiles = pgTable(
  'product_files',
  {
    id: serial('id').primaryKey(),
    variantId: integer('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    locale: text('locale').$type<ContentLocale>().notNull(),
    // Путь внутри закрытой папки файлов (NUXT_FILES_DIR)
    path: text('path').notNull(),
    // Как файл назовётся у покупателя
    filename: text('filename').notNull(),
    mime: text('mime').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('product_files_variant_locale').on(t.variantId, t.locale),
    localeCheck('product_files_locale', t.locale),
  ],
)

// ---------- Связи ----------

export const shopCategoriesRelations = relations(shopCategories, ({ many }) => ({
  translations: many(shopCategoryTranslations),
  products: many(products),
}))

export const shopCategoryTranslationsRelations = relations(shopCategoryTranslations, ({ one }) => ({
  category: one(shopCategories, {
    fields: [shopCategoryTranslations.categoryId],
    references: [shopCategories.id],
  }),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(shopCategories, { fields: [products.categoryId], references: [shopCategories.id] }),
  translations: many(productTranslations),
  photos: many(productPhotos),
  variants: many(productVariants),
}))

export const productTranslationsRelations = relations(productTranslations, ({ one }) => ({
  product: one(products, { fields: [productTranslations.productId], references: [products.id] }),
}))

export const productPhotosRelations = relations(productPhotos, ({ one }) => ({
  product: one(products, { fields: [productPhotos.productId], references: [products.id] }),
  media: one(media, { fields: [productPhotos.mediaId], references: [media.id] }),
}))

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  translations: many(productVariantTranslations),
  files: many(productFiles),
}))

export const productVariantTranslationsRelations = relations(
  productVariantTranslations,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [productVariantTranslations.variantId],
      references: [productVariants.id],
    }),
  }),
)

export const productFilesRelations = relations(productFiles, ({ one }) => ({
  variant: one(productVariants, {
    fields: [productFiles.variantId],
    references: [productVariants.id],
  }),
}))

export type ProductRow = typeof products.$inferSelect
export type ProductVariantRow = typeof productVariants.$inferSelect
