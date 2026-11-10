// Магазин в админке (7.3, 8.5): список товаров, категории, языки показа, настройки магазина.
// Доступно в серверном коде без импорта. Типы и правила — shared/shop.ts.
import { asc, count, eq, max } from 'drizzle-orm'
import { productPhotos, products, shopCategories, shopCategoryTranslations } from '../db/schema'
import { contentLocales, type ContentLocale } from '#shared/locales'
import type { Localized } from '#shared/menu'
import { toMediaImage } from '#shared/media'
import {
  defaultShopSettings,
  shopSettingsSchema,
  type AdminProductRow,
  type AdminShop,
  type AdminShopCategory,
  type ShopSettings,
  type VariantKind,
} from '#shared/shop'
import { slugify } from '#shared/slug'

export function readShopSettings(): Promise<ShopSettings> {
  return readSetting('shop', shopSettingsSchema, defaultShopSettings)
}

function namesOf(rows: { locale: ContentLocale; name: string }[]): Localized<string> {
  const names: Localized<string> = {}
  for (const r of rows) names[r.locale] = r.name
  return names
}

/** Название для админки: русское, иначе эстонское, иначе любое */
function adminName<T extends { locale: ContentLocale }>(rows: T[]): T | undefined {
  return rows.find((r) => r.locale === 'ru') ?? rows.find((r) => r.locale === 'et') ?? rows[0]
}

// ---------- Список ----------

async function loadCategories(): Promise<AdminShopCategory[]> {
  const [rows, counts] = await Promise.all([
    useDb().query.shopCategories.findMany({
      with: { translations: true },
      orderBy: [asc(shopCategories.sort), asc(shopCategories.id)],
    }),
    useDb()
      .select({ categoryId: products.categoryId, n: count() })
      .from(products)
      .groupBy(products.categoryId),
  ])
  const byCategory = new Map(counts.map((c) => [c.categoryId, c.n]))
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    names: namesOf(c.translations),
    isVisible: c.isVisible,
    products: byCategory.get(c.id) ?? 0,
  }))
}

async function loadProductRows(): Promise<AdminProductRow[]> {
  const rows = await useDb().query.products.findMany({
    with: {
      translations: { columns: { locale: true, name: true, lead: true } },
      photos: { with: { media: true }, orderBy: [asc(productPhotos.sort)] },
      variants: { with: { files: { columns: { locale: true } } } },
    },
    orderBy: [asc(products.sort), asc(products.id)],
  })
  return rows.map((p) => {
    const shown = adminName(p.translations)
    const variants = p.variants.filter((v) => v.isAvailable)
    const prices = variants.map((v) => v.priceCents)
    const kinds = [...new Set(variants.map((v) => v.kind))] as VariantKind[]
    const physical = variants.filter((v) => v.kind === 'physical')
    const fileLocales = new Set(p.variants.flatMap((v) => v.files.map((f) => f.locale)))
    const cover = p.photos[0]?.media
    return {
      id: p.id,
      name: shown?.name ?? `Товар ${p.id}`,
      lead: shown?.lead ?? null,
      categoryId: p.categoryId,
      state: p.state,
      locales: contentLocales.filter((l) => p.locales.includes(l)),
      translated: contentLocales.filter((l) => p.translations.some((t) => t.locale === l)),
      cover: cover ? toMediaImage(cover) : null,
      kinds,
      fileLocales: contentLocales.filter((l) => fileLocales.has(l)),
      variants: variants.length,
      minPriceCents: prices.length ? Math.min(...prices) : null,
      maxPriceCents: prices.length ? Math.max(...prices) : null,
      // Остаток считаем, только если он известен у всех физических вариантов
      stock:
        physical.length && physical.every((v) => v.stock !== null)
          ? physical.reduce((sum, v) => sum + v.stock!, 0)
          : null,
      pickupOnly: physical.length > 0 && physical.every((v) => v.delivery === 'pickup'),
    }
  })
}

export async function loadAdminShop(): Promise<AdminShop> {
  const [productRows, categories, settings, sections] = await Promise.all([
    loadProductRows(),
    loadCategories(),
    readShopSettings(),
    readSections(),
  ])
  return { products: productRows, categories, settings, shopEnabled: sections.shop.enabled }
}

/** Где показывать товар (8.5) — переключение языка кликом в списке */
export async function setProductLocales(id: number, locales: ContentLocale[], userId: number) {
  const [row] = await useDb()
    .update(products)
    .set({ locales: contentLocales.filter((l) => locales.includes(l)), updatedBy: userId })
    .where(eq(products.id, id))
    .returning({ id: products.id })
  if (!row) throw createError({ statusCode: 404, message: 'Товар не найден' })
}

// ---------- Категории ----------

function translationRows(categoryId: number, names: Localized<string>) {
  return contentLocales
    .filter((l) => names[l]?.trim())
    .map((locale) => ({ categoryId, locale, name: names[locale]!.trim() }))
}

/** Новая категория — в конец. Код для адреса (/shop#books) — из названия, потом не меняется */
export async function createShopCategory(names: Localized<string>, isVisible: boolean) {
  return await useDb().transaction(async (tx) => {
    const base = slugify(names.en || names.et || names.ru || '') || 'category'
    const taken = new Set(
      (await tx.select({ slug: shopCategories.slug }).from(shopCategories)).map((r) => r.slug),
    )
    let slug = base
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`
    const [last] = await tx.select({ value: max(shopCategories.sort) }).from(shopCategories)
    const [row] = await tx
      .insert(shopCategories)
      .values({ slug, sort: (last?.value ?? -1) + 1, isVisible })
      .returning({ id: shopCategories.id })
    await tx.insert(shopCategoryTranslations).values(translationRows(row!.id, names))
    return row!.id
  })
}

export async function updateShopCategory(id: number, names: Localized<string>, isVisible: boolean) {
  await useDb().transaction(async (tx) => {
    const [row] = await tx
      .update(shopCategories)
      .set({ isVisible })
      .where(eq(shopCategories.id, id))
      .returning({ id: shopCategories.id })
    if (!row) throw createError({ statusCode: 404, message: 'Категория не найдена' })
    await tx.delete(shopCategoryTranslations).where(eq(shopCategoryTranslations.categoryId, id))
    await tx.insert(shopCategoryTranslations).values(translationRows(id, names))
  })
}

/** Удалить можно только пустую категорию: товары сначала перенести */
export async function deleteShopCategory(id: number) {
  const [used] = await useDb()
    .select({ n: count() })
    .from(products)
    .where(eq(products.categoryId, id))
  if (used && used.n > 0) {
    throw createError({
      statusCode: 409,
      message: 'В категории есть товары — сначала перенесите их в другую',
    })
  }
  const [row] = await useDb()
    .delete(shopCategories)
    .where(eq(shopCategories.id, id))
    .returning({ id: shopCategories.id })
  if (!row) throw createError({ statusCode: 404, message: 'Категория не найдена' })
}

/** Порядок категорий: все номера в новой последовательности. Устаревший список — 409 */
export async function orderShopCategories(ids: number[]) {
  await useDb().transaction(async (tx) => {
    const all = await tx.select({ id: shopCategories.id }).from(shopCategories)
    const known = new Set(all.map((r) => r.id))
    if (ids.length !== known.size || !ids.every((id) => known.has(id))) {
      throw createError({
        statusCode: 409,
        message: 'Список категорий изменился — обновите страницу',
      })
    }
    for (const [sort, id] of ids.entries()) {
      await tx.update(shopCategories).set({ sort }).where(eq(shopCategories.id, id))
    }
  })
}
