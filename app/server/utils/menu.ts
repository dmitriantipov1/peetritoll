// Основное меню: чтение для админки и сохранение блюда. Доступно в серверном коде без импорта.
import { asc, eq, inArray, max } from 'drizzle-orm'
import {
  dietTags,
  dishDietTags,
  dishDishLabels,
  dishLabels,
  dishes,
  dishPortions,
  dishPortionTranslations,
  dishTranslations,
  media,
  menuCategories,
} from '../db/schema'
import type { AdminDish, AdminMenu, DishInput, Localized } from '#shared/menu'
import type { ContentLocale } from '#shared/locales'
import { toMediaImage } from '#shared/media'

type Db = ReturnType<typeof useDb>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** [{ locale: 'ru', name: 'Супы' }] → { ru: 'Супы' } */
function byLocale<R extends { locale: ContentLocale }, V>(rows: R[], value: (row: R) => V) {
  const result: Localized<V> = {}
  for (const row of rows) result[row.locale] = value(row)
  return result
}

// Что подгружать вместе с блюдом: переводы, порции по порядку с подписями, отметки
const dishWith = {
  translations: true as const,
  portions: { with: { translations: true as const }, orderBy: [asc(dishPortions.sort)] },
  dietTags: true as const,
  labels: true as const,
  photoMedia: true as const,
}

type DishRow = NonNullable<Awaited<ReturnType<typeof findDishRow>>>

function findDishRow(id: number) {
  return useDb().query.dishes.findFirst({
    where: eq(dishes.id, id),
    with: { ...dishWith, updatedByUser: { columns: { name: true } } },
  })
}

function toAdminDish(row: Omit<DishRow, 'updatedByUser'>): AdminDish {
  return {
    id: row.id,
    categoryId: row.categoryId,
    sort: row.sort,
    photo: row.photoMedia ? toMediaImage(row.photoMedia) : null,
    legacyPhoto: row.photo,
    isVisible: row.isVisible,
    translations: byLocale(row.translations, (t) => ({ name: t.name, description: t.description })),
    portions: row.portions.map((p) => ({
      id: p.id,
      priceCents: p.priceCents,
      labels: byLocale(p.translations, (t) => t.label),
    })),
    dietTagIds: row.dietTags.map((t) => t.tagId),
    labelIds: row.labels.map((l) => l.labelId),
  }
}

/** Всё основное меню для списка в админке, включая скрытое. */
export async function loadAdminMenu(): Promise<AdminMenu> {
  const db = useDb()
  const categories = await db.query.menuCategories.findMany({
    orderBy: (c, { asc }) => [asc(c.sort), asc(c.id)],
    with: {
      translations: true,
      dishes: { with: dishWith, orderBy: (d, { asc }) => [asc(d.sort), asc(d.id)] },
    },
  })
  const tags = await db.query.dietTags.findMany({
    orderBy: [asc(dietTags.sort), asc(dietTags.id)],
    with: { translations: true },
  })
  const labels = await db.query.dishLabels.findMany({
    orderBy: [asc(dishLabels.sort), asc(dishLabels.id)],
    with: { translations: true },
  })

  return {
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      sort: c.sort,
      isVisible: c.isVisible,
      names: byLocale(c.translations, (t) => t.name),
      dishes: c.dishes.map(toAdminDish),
    })),
    dietTags: tags.map((t) => ({
      id: t.id,
      key: t.key,
      names: byLocale(t.translations, (tr) => tr.name),
    })),
    labels: labels.map((l) => ({
      id: l.id,
      key: l.key,
      names: byLocale(l.translations, (tr) => tr.name),
    })),
  }
}

/** Блюдо для карточки в админке; нет такого — 404. */
export async function loadAdminDish(id: number) {
  const row = await findDishRow(id)
  if (!row) throw createError({ statusCode: 404, message: 'Блюдо не найдено' })
  return {
    ...toAdminDish(row),
    updatedAt: row.updatedAt.toISOString(),
    updatedByName: row.updatedByUser?.name ?? null,
  }
}

/** id из адреса /api/admin/menu/dishes/:id */
export function dishIdParam(event: Parameters<typeof getRouterParam>[0]): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Неверный номер блюда' })
  }
  return id
}

async function nextSortInCategory(tx: Tx, categoryId: number) {
  const [row] = await tx
    .select({ value: max(dishes.sort) })
    .from(dishes)
    .where(eq(dishes.categoryId, categoryId))
  return (row?.value ?? -1) + 1
}

/**
 * Создать (dishId = null) или сохранить блюдо целиком: поля, переводы, порции, отметки.
 * Всё в одной транзакции — блюдо не останется наполовину сохранённым.
 * Порции пересоздаются: ссылок на них из других таблиц пока нет.
 */
export async function saveDish(dishId: number | null, input: DishInput, userId: number) {
  return await useDb().transaction(async (tx) => {
    const [category] = await tx
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .where(eq(menuCategories.id, input.categoryId))
    if (!category) throw createError({ statusCode: 400, message: 'Нет такой категории' })

    if (input.photoId) {
      const [found] = await tx
        .select({ id: media.id })
        .from(media)
        .where(eq(media.id, input.photoId))
      if (!found)
        throw createError({ statusCode: 400, message: 'Фото не найдено — загрузите заново' })
    }

    const fields = {
      categoryId: input.categoryId,
      photoId: input.photoId,
      // Загрузили новое фото — старая ссылка больше не нужна
      photo: input.photoId ? null : input.legacyPhoto,
      isVisible: input.isVisible,
      updatedBy: userId,
    }

    let id: number
    if (dishId === null) {
      const sort = await nextSortInCategory(tx, input.categoryId)
      const [created] = await tx
        .insert(dishes)
        .values({ ...fields, sort })
        .returning()
      id = created!.id
    } else {
      const [current] = await tx.select().from(dishes).where(eq(dishes.id, dishId))
      if (!current) throw createError({ statusCode: 404, message: 'Блюдо не найдено' })
      // Перенесли в другую категорию — ставим в её конец
      const sort =
        current.categoryId === input.categoryId
          ? current.sort
          : await nextSortInCategory(tx, input.categoryId)
      await tx
        .update(dishes)
        .set({ ...fields, sort })
        .where(eq(dishes.id, dishId))
      id = dishId
    }

    await tx.delete(dishTranslations).where(eq(dishTranslations.dishId, id))
    const translations = Object.entries(input.translations)
      .filter(([, t]) => t?.name)
      .map(([locale, t]) => ({
        dishId: id,
        locale: locale as ContentLocale,
        name: t!.name,
        description: t!.description || null,
      }))
    if (translations.length) await tx.insert(dishTranslations).values(translations)

    await tx.delete(dishPortions).where(eq(dishPortions.dishId, id))
    for (const [sort, portion] of input.portions.entries()) {
      const [p] = await tx
        .insert(dishPortions)
        .values({ dishId: id, sort, priceCents: portion.priceCents })
        .returning()
      const labels = Object.entries(portion.labels)
        .filter(([, label]) => label)
        .map(([locale, label]) => ({
          portionId: p!.id,
          locale: locale as ContentLocale,
          label: label!,
        }))
      if (labels.length) await tx.insert(dishPortionTranslations).values(labels)
    }

    await tx.delete(dishDietTags).where(eq(dishDietTags.dishId, id))
    if (input.dietTagIds.length) {
      // Только существующие отметки: удалённую из справочника молча пропускаем
      const known = await tx
        .select({ id: dietTags.id })
        .from(dietTags)
        .where(inArray(dietTags.id, input.dietTagIds))
      if (known.length) {
        await tx.insert(dishDietTags).values(known.map((t) => ({ dishId: id, tagId: t.id })))
      }
    }

    await tx.delete(dishDishLabels).where(eq(dishDishLabels.dishId, id))
    if (input.labelIds.length) {
      const known = await tx
        .select({ id: dishLabels.id })
        .from(dishLabels)
        .where(inArray(dishLabels.id, input.labelIds))
      if (known.length) {
        await tx.insert(dishDishLabels).values(known.map((l) => ({ dishId: id, labelId: l.id })))
      }
    }

    return id
  })
}

/** Показать или скрыть блюдо на сайте — переключатель в списке. */
export async function setDishVisibility(id: number, isVisible: boolean, userId: number) {
  const [row] = await useDb()
    .update(dishes)
    .set({ isVisible, updatedBy: userId })
    .where(eq(dishes.id, id))
    .returning({ id: dishes.id })
  if (!row) throw createError({ statusCode: 404, message: 'Блюдо не найдено' })
}

export async function deleteDish(id: number) {
  const [row] = await useDb().delete(dishes).where(eq(dishes.id, id)).returning({ id: dishes.id })
  if (!row) throw createError({ statusCode: 404, message: 'Блюдо не найдено' })
}
