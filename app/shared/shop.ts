// Магазин (7.3, 7.4, 8.5): товары, варианты, категории, настройки. Общий файл для сервера и экранов.
//
// Товар — то, что видит покупатель: название, описание, фото, категория, где показывать.
// Вариант — то, что кладут в корзину: «Печатная книга» и «PDF», «Отпечаток» и «Цифровая копия».
// У простого товара один вариант без подписи. Цена и остаток — у варианта.
import { z } from 'zod'
import { contentLocales, type ContentLocale } from './locales'
import type { Localized } from './menu'
import type { MediaImage } from './media'

export const productStates = ['draft', 'published', 'archived'] as const
export type ProductState = (typeof productStates)[number]

export const productStateNames: Record<ProductState, string> = {
  draft: 'Черновик',
  published: 'На сайте',
  archived: 'Снят с продажи',
}

/** Физический вариант отправляют или выдают, цифровой — ссылкой на почту после оплаты (7.4) */
export const variantKinds = ['physical', 'digital'] as const
export type VariantKind = (typeof variantKinds)[number]

export const variantKindNames: Record<VariantKind, string> = {
  physical: 'Физический',
  digital: 'Цифровой',
}

/**
 * Как получить физический вариант (7.3): только самовывоз — картины и антиквариат
 * (страховки посылок нет), или самовывоз и доставка по цене из настроек магазина.
 */
export const deliveryModes = ['pickup', 'shipping'] as const
export type DeliveryMode = (typeof deliveryModes)[number]

export const deliveryModeNames: Record<DeliveryMode, string> = {
  pickup: 'Только самовывоз в Палдиски',
  shipping: 'Самовывоз или доставка',
}

/** Строка характеристик на странице товара: «Размер — 30 × 22 см» */
export interface ProductFact {
  label: string
  value: string
}

/** Настройки магазина (7.3, решение 09.11.2026): две цены доставки, без расчёта по весу */
export interface ShopSettings {
  deliveryEstoniaCents: number
  deliveryEuCents: number
}

export const defaultShopSettings: ShopSettings = {
  deliveryEstoniaCents: 400,
  deliveryEuCents: 1200,
}

const cents = z.number().int().min(0).max(1_000_000)

export const shopSettingsSchema = z.object({
  deliveryEstoniaCents: cents,
  deliveryEuCents: cents,
})

// ---------- Что видит админка ----------

/** Категория в админке: названия на трёх языках, сколько в ней товаров */
export interface AdminShopCategory {
  id: number
  slug: string
  names: Localized<string>
  isVisible: boolean
  products: number
}

/** Строка списка товаров */
export interface AdminProductRow {
  id: number
  /** Русское название, иначе эстонское, иначе любое */
  name: string
  lead: string | null
  categoryId: number
  state: ProductState
  /** Где показывать (8.5) */
  locales: ContentLocale[]
  /** На каких языках есть перевод (название) */
  translated: ContentLocale[]
  cover: MediaImage | null
  /** Виды вариантов: физический, цифровой или оба */
  kinds: VariantKind[]
  /** Языки, на которых загружены файлы цифровых вариантов */
  fileLocales: ContentLocale[]
  variants: number
  /** Самая низкая и самая высокая цена — «от N €», если вариантов несколько */
  minPriceCents: number | null
  maxPriceCents: number | null
  /** Сколько штук всего; null — у какого-то варианта остаток не считаем */
  stock: number | null
  /** Только самовывоз у всех физических вариантов */
  pickupOnly: boolean
}

export interface AdminShop {
  products: AdminProductRow[]
  categories: AdminShopCategory[]
  settings: ShopSettings
  /** Раздел «Магазин» включён в настройках сайта */
  shopEnabled: boolean
}

export const productLocalesSchema = z.object({ locales: z.array(z.enum(contentLocales)).max(3) })

export { categoryInputSchema as shopCategoryInputSchema, orderInputSchema } from './menu'

// ---------- Карточка товара ----------

export interface AdminProductTranslation {
  name: string
  slug: string
  lead: string
  description: string
  facts: ProductFact[]
}

/** Загруженный файл цифрового варианта на одном языке */
export interface AdminProductFile {
  id: number
  filename: string
  size: number
  mime: string
  uploadedAt: string
}

export interface AdminProductVariant {
  id: number
  kind: VariantKind
  priceCents: number
  stock: number | null
  delivery: DeliveryMode | null
  isAvailable: boolean
  labels: Localized<string>
  files: Localized<AdminProductFile>
}

export interface AdminProduct {
  id: number
  categoryId: number
  state: ProductState
  locales: ContentLocale[]
  translations: Localized<AdminProductTranslation>
  photos: MediaImage[]
  variants: AdminProductVariant[]
  createdAt: string
  updatedAt: string
  updatedByName: string | null
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Не длиннее ${max} символов`)
    .transform((v) => v || null)
    .nullable()

const productTranslationSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(200, 'Название слишком длинное'),
  slug: z
    .string()
    .trim()
    .min(1, 'Укажите адрес')
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Адрес — латиница, цифры и дефисы'),
  lead: optionalText(300),
  description: optionalText(5000),
  facts: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'У характеристики нужно название').max(60),
        value: z.string().trim().min(1, 'У характеристики нужно значение').max(200),
      }),
    )
    .max(20),
})

const variantInputSchema = z
  .object({
    /** null — новый вариант */
    id: z.number().int().positive().nullable(),
    kind: z.enum(variantKinds),
    priceCents: cents,
    stock: z.number().int().min(0).max(100_000).nullable(),
    delivery: z.enum(deliveryModes).nullable(),
    isAvailable: z.boolean(),
    labels: z.partialRecord(z.enum(contentLocales), z.string().trim().max(100)),
  })
  // Способ получения — только у физического; у цифрового остаток не считаем
  .transform((v) =>
    v.kind === 'digital'
      ? { ...v, delivery: null, stock: null }
      : { ...v, delivery: v.delivery ?? ('shipping' as const) },
  )

export const productInputSchema = z.object({
  categoryId: z.number().int().positive(),
  state: z.enum(productStates),
  locales: z.array(z.enum(contentLocales)).max(3),
  translations: z
    .partialRecord(z.enum(contentLocales), productTranslationSchema)
    .refine((t) => Object.keys(t).length > 0, 'Нужно название хотя бы на одном языке'),
  /** Фото по порядку: первое — обложка */
  photoIds: z.array(z.uuid()).max(20, 'Не больше 20 фото'),
  variants: z.array(variantInputSchema).min(1, 'Нужен хотя бы один вариант').max(20),
})

export type ProductInput = z.infer<typeof productInputSchema>
/** То, что отправляет форма, — до разбора сервером */
export type ProductInputBody = z.input<typeof productInputSchema>

/** Файлы цифровых товаров: что принимаем и до какого размера (7.4) */
export const productFileTypes: Record<string, string> = {
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  m4b: 'audio/mp4',
  zip: 'application/zip',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  tif: 'image/tiff',
  tiff: 'image/tiff',
}
export const MAX_PRODUCT_FILE_MB = 500
