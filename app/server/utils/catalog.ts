// Каталог банкетного меню: чтение, категории, блюда, сеты, настройки калькулятора.
// Доступно в серверном коде без импорта.
import { and, asc, count, eq, inArray, max } from 'drizzle-orm'
import {
  banquetSetDishes,
  banquetSetTranslations,
  catalogCategories,
  catalogCategoryTranslations,
  catalogDishes,
  catalogDishTranslations,
} from '../db/schema'
import {
  banquetSettingsSchema,
  banquetTiers,
  catalogKinds,
  defaultBanquetSettings,
  type AdminCatalog,
  type AdminBanquetSet,
  type AdminCatalogDish,
  type BanquetSetInput,
  type BanquetTier,
  type BanquetSettings,
  type CatalogDishInput,
  type CatalogKind,
} from '#shared/catalog'
import type { Localized } from '#shared/menu'
import type { ContentLocale } from '#shared/locales'
import { dishWords, plural } from '#shared/plural'

type Db = ReturnType<typeof useDb>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export function catalogKindParam(event: Parameters<typeof getRouterParam>[0]): CatalogKind {
  const kind = getRouterParam(event, 'kind')
  if (!catalogKinds.includes(kind as CatalogKind)) {
    throw createError({ statusCode: 404, message: 'Нет такого меню' })
  }
  return kind as CatalogKind
}

/** Строки перевода; пустые названия не сохраняем */
function nameRows(names: Localized<string>) {
  return Object.entries(names)
    .filter(([, name]) => name)
    .map(([locale, name]) => ({ locale: locale as ContentLocale, name: name! }))
}

function byLocale(rows: { locale: ContentLocale; name: string }[]) {
  return Object.fromEntries(rows.map((r) => [r.locale, r.name])) as Localized<string>
}

// ---------- Настройки ----------

export function readCatalogSettings(_kind: CatalogKind): Promise<BanquetSettings> {
  return readSetting('banquet', banquetSettingsSchema, defaultBanquetSettings)
}

/** Сохранить настройки калькулятора; тело уже проверено схемой */
export async function saveCatalogSettings(
  kind: CatalogKind,
  value: BanquetSettings,
  userId: number,
) {
  // Категория для предупреждения о горячем — только из этого каталога
  if (value.warnCategoryId !== null) await categoryOf(kind, value.warnCategoryId)
  await writeSetting(kind, value, userId)
  return value
}

// ---------- Чтение ----------

export async function loadCatalog(kind: CatalogKind): Promise<AdminCatalog> {
  const rows = await useDb().query.catalogCategories.findMany({
    where: eq(catalogCategories.kind, kind),
    orderBy: [asc(catalogCategories.sort), asc(catalogCategories.id)],
    with: {
      translations: true,
      dishes: {
        orderBy: [asc(catalogDishes.sort), asc(catalogDishes.id)],
        with: { translations: true },
      },
    },
  })
  return {
    kind,
    categories: rows.map((c) => ({
      id: c.id,
      names: byLocale(c.translations),
      dishes: c.dishes.map((d): AdminCatalogDish => ({
        id: d.id,
        categoryId: d.categoryId,
        names: byLocale(d.translations),
        priceCents: d.priceCents,
        previousPriceCents: d.previousPriceCents,
        priceChangedAt: d.priceChangedAt?.toISOString() ?? null,
        isAvailable: d.isAvailable,
      })),
    })),
    settings: await readCatalogSettings(kind),
    sets: await loadBanquetSets(),
  }
}

// ---------- Сеты банкета ----------

export function tierParam(event: Parameters<typeof getRouterParam>[0]): BanquetTier {
  const tier = getRouterParam(event, 'tier')
  if (!banquetTiers.includes(tier as BanquetTier)) {
    throw createError({ statusCode: 404, message: 'Нет такого сета' })
  }
  return tier as BanquetTier
}

/** Всегда три ступени — даже если сет ещё не заполняли */
async function loadBanquetSets(): Promise<AdminBanquetSet[]> {
  const db = useDb()
  const names = await db.select().from(banquetSetTranslations)
  const items = await db.select().from(banquetSetDishes).orderBy(asc(banquetSetDishes.sort))
  return banquetTiers.map((tier) => ({
    tier,
    names: byLocale(names.filter((n) => n.tier === tier)),
    dishIds: items.filter((i) => i.tier === tier).map((i) => i.dishId),
  }))
}

/** Сохранить сет: название и состав. Блюда — только из банкетного каталога */
export async function saveBanquetSet(tier: BanquetTier, input: BanquetSetInput) {
  await useDb().transaction(async (tx) => {
    if (input.dishIds.length) {
      const found = await tx
        .select({ id: catalogDishes.id })
        .from(catalogDishes)
        .innerJoin(catalogCategories, eq(catalogCategories.id, catalogDishes.categoryId))
        .where(and(inArray(catalogDishes.id, input.dishIds), eq(catalogCategories.kind, 'banquet')))
      if (found.length !== input.dishIds.length) {
        throw createError({ statusCode: 400, message: 'В сете блюдо не из банкетного меню' })
      }
    }
    await tx.delete(banquetSetTranslations).where(eq(banquetSetTranslations.tier, tier))
    const rows = nameRows(input.names).map((r) => ({ ...r, tier }))
    if (rows.length) await tx.insert(banquetSetTranslations).values(rows)
    await tx.delete(banquetSetDishes).where(eq(banquetSetDishes.tier, tier))
    if (input.dishIds.length) {
      await tx
        .insert(banquetSetDishes)
        .values(input.dishIds.map((dishId, sort) => ({ tier, dishId, sort })))
    }
  })
}

/** Категория нужного каталога; чужая или несуществующая — 400 */
async function categoryOf(kind: CatalogKind, id: number, db: Db | Tx = useDb()) {
  const [row] = await db
    .select()
    .from(catalogCategories)
    .where(and(eq(catalogCategories.id, id), eq(catalogCategories.kind, kind)))
  if (!row) throw createError({ statusCode: 400, message: 'Нет такой категории в этом меню' })
  return row
}

/** Каталог, к которому относится блюдо; нет блюда — 404 */
export async function dishKind(id: number): Promise<CatalogKind> {
  const [row] = await useDb()
    .select({ kind: catalogCategories.kind })
    .from(catalogDishes)
    .innerJoin(catalogCategories, eq(catalogCategories.id, catalogDishes.categoryId))
    .where(eq(catalogDishes.id, id))
  if (!row) throw createError({ statusCode: 404, message: 'Блюдо не найдено' })
  return row.kind
}

// ---------- Категории ----------

export async function createCatalogCategory(kind: CatalogKind, names: Localized<string>) {
  return await useDb().transaction(async (tx) => {
    const [last] = await tx
      .select({ value: max(catalogCategories.sort) })
      .from(catalogCategories)
      .where(eq(catalogCategories.kind, kind))
    const [row] = await tx
      .insert(catalogCategories)
      .values({ kind, sort: (last?.value ?? -1) + 1 })
      .returning({ id: catalogCategories.id })
    await tx
      .insert(catalogCategoryTranslations)
      .values(nameRows(names).map((r) => ({ ...r, categoryId: row!.id })))
    return row!.id
  })
}

export async function renameCatalogCategory(id: number, names: Localized<string>) {
  await useDb().transaction(async (tx) => {
    const [row] = await tx
      .update(catalogCategories)
      .set({ updatedAt: new Date() })
      .where(eq(catalogCategories.id, id))
      .returning({ id: catalogCategories.id })
    if (!row) throw createError({ statusCode: 404, message: 'Категория не найдена' })
    await tx
      .delete(catalogCategoryTranslations)
      .where(eq(catalogCategoryTranslations.categoryId, id))
    await tx
      .insert(catalogCategoryTranslations)
      .values(nameRows(names).map((r) => ({ ...r, categoryId: id })))
  })
}

/** Удалить можно только пустую категорию */
export async function deleteCatalogCategory(id: number) {
  const db = useDb()
  const [used] = await db
    .select({ n: count() })
    .from(catalogDishes)
    .where(eq(catalogDishes.categoryId, id))
  if (used && used.n > 0) {
    throw createError({
      statusCode: 409,
      message: `В категории ${used.n} ${plural(used.n, dishWords)}. Перенесите их или удалите, потом удаляйте категорию.`,
    })
  }
  const [row] = await db
    .delete(catalogCategories)
    .where(eq(catalogCategories.id, id))
    .returning({ id: catalogCategories.id })
  if (!row) throw createError({ statusCode: 404, message: 'Категория не найдена' })
}

/** Каталог категории; нет — 404 (для проверки прав и порядка) */
export async function categoryKind(id: number): Promise<CatalogKind> {
  const [row] = await useDb()
    .select({ kind: catalogCategories.kind })
    .from(catalogCategories)
    .where(eq(catalogCategories.id, id))
  if (!row) throw createError({ statusCode: 404, message: 'Категория не найдена' })
  return row.kind
}

// ---------- Блюда ----------

async function nextDishSort(tx: Tx, categoryId: number) {
  const [row] = await tx
    .select({ value: max(catalogDishes.sort) })
    .from(catalogDishes)
    .where(eq(catalogDishes.categoryId, categoryId))
  return (row?.value ?? -1) + 1
}

async function replaceDishNames(tx: Tx, id: number, names: Localized<string>) {
  await tx.delete(catalogDishTranslations).where(eq(catalogDishTranslations.dishId, id))
  await tx
    .insert(catalogDishTranslations)
    .values(nameRows(names).map((r) => ({ ...r, dishId: id })))
}

/** Создать (id = null) или сохранить блюдо каталога kind. Смена цены запоминает прежнюю */
export async function saveCatalogDish(
  kind: CatalogKind,
  id: number | null,
  input: CatalogDishInput,
  userId: number,
) {
  return await useDb().transaction(async (tx) => {
    await categoryOf(kind, input.categoryId, tx)
    const fields = {
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      isAvailable: input.isAvailable,
      updatedBy: userId,
    }

    if (id === null) {
      const sort = await nextDishSort(tx, input.categoryId)
      const [row] = await tx
        .insert(catalogDishes)
        .values({ ...fields, sort })
        .returning({ id: catalogDishes.id })
      await replaceDishNames(tx, row!.id, input.names)
      return row!.id
    }

    const [current] = await tx.select().from(catalogDishes).where(eq(catalogDishes.id, id))
    if (!current) throw createError({ statusCode: 404, message: 'Блюдо не найдено' })
    const priceChanged = current.priceCents !== input.priceCents
    await tx
      .update(catalogDishes)
      .set({
        ...fields,
        sort:
          current.categoryId === input.categoryId
            ? current.sort
            : await nextDishSort(tx, input.categoryId),
        ...(priceChanged
          ? { previousPriceCents: current.priceCents, priceChangedAt: new Date() }
          : {}),
      })
      .where(eq(catalogDishes.id, id))
    await replaceDishNames(tx, id, input.names)
    return id
  })
}

export async function setCatalogDishAvailability(id: number, isAvailable: boolean, userId: number) {
  await useDb()
    .update(catalogDishes)
    .set({ isAvailable, updatedBy: userId })
    .where(eq(catalogDishes.id, id))
}

export async function deleteCatalogDish(id: number) {
  await useDb().delete(catalogDishes).where(eq(catalogDishes.id, id))
}
