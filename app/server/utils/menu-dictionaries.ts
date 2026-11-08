// Категории меню и два справочника отметок (7.1): создать, переименовать, удалить.
// Доступно в серверном коде без импорта.
import { count, eq, like, max, or } from 'drizzle-orm'
import {
  dietTags,
  dietTagTranslations,
  dishes,
  dishLabels,
  dishLabelTranslations,
  menuCategories,
  menuCategoryTranslations,
} from '../db/schema'
import type { CategoryInput, MarkInput, MarkKind } from '#shared/menu'
import type { ContentLocale } from '#shared/locales'
import { slugify } from '#shared/slug'
import { dishWords, plural } from '#shared/plural'

type Db = ReturnType<typeof useDb>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
type Names = CategoryInput['names']

/** Строки перевода из { et: 'Supid', ru: 'Супы' }; пустые названия не сохраняем */
function nameRows(names: Names) {
  return Object.entries(names)
    .filter(([, name]) => name)
    .map(([locale, name]) => ({ locale: locale as ContentLocale, name: name! }))
}

/** Код из названия: английское, иначе эстонское, иначе русское — латиницей и уникальный */
async function uniqueCode(
  tx: Tx,
  names: Names,
  existing: (base: string) => Promise<string[]>,
  fallback: string,
) {
  const base = slugify(names.en || names.et || names.ru || '') || fallback
  const taken = new Set(await existing(base))
  if (!taken.has(base)) return base
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
}

export function idParam(event: Parameters<typeof getRouterParam>[0]): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Неверный номер' })
  }
  return id
}

// ---------- Категории ----------

export async function createCategory(input: CategoryInput) {
  return await useDb().transaction(async (tx) => {
    // Якорь в адресе меню (/et/menu#soups) — из названия, после создания не меняется
    const slug = await uniqueCode(
      tx,
      input.names,
      async (base) =>
        (
          await tx
            .select({ slug: menuCategories.slug })
            .from(menuCategories)
            .where(or(eq(menuCategories.slug, base), like(menuCategories.slug, `${base}-%`)))
        ).map((r) => r.slug),
      'category',
    )
    const [last] = await tx.select({ value: max(menuCategories.sort) }).from(menuCategories)
    const [row] = await tx
      .insert(menuCategories)
      .values({ slug, isVisible: input.isVisible, sort: (last?.value ?? -1) + 1 })
      .returning({ id: menuCategories.id })
    await tx
      .insert(menuCategoryTranslations)
      .values(nameRows(input.names).map((r) => ({ ...r, categoryId: row!.id })))
    return row!.id
  })
}

export async function updateCategory(id: number, input: CategoryInput) {
  await useDb().transaction(async (tx) => {
    const [row] = await tx
      .update(menuCategories)
      .set({ isVisible: input.isVisible })
      .where(eq(menuCategories.id, id))
      .returning({ id: menuCategories.id })
    if (!row) throw createError({ statusCode: 404, message: 'Категория не найдена' })
    await tx.delete(menuCategoryTranslations).where(eq(menuCategoryTranslations.categoryId, id))
    await tx
      .insert(menuCategoryTranslations)
      .values(nameRows(input.names).map((r) => ({ ...r, categoryId: id })))
  })
}

/** Удалить можно только пустую категорию — блюда сначала перенести или удалить. */
export async function deleteCategory(id: number) {
  const db = useDb()
  const [used] = await db.select({ n: count() }).from(dishes).where(eq(dishes.categoryId, id))
  if (used && used.n > 0) {
    throw createError({
      statusCode: 409,
      message: `В категории ${used.n} ${plural(used.n, dishWords)}. Перенесите их в другую категорию или удалите, потом удаляйте категорию.`,
    })
  }
  const [row] = await db
    .delete(menuCategories)
    .where(eq(menuCategories.id, id))
    .returning({ id: menuCategories.id })
  if (!row) throw createError({ statusCode: 404, message: 'Категория не найдена' })
}

// ---------- Справочники отметок ----------
// Устроены одинаково: таблица отметок и таблица переводов к ней.

const markTables = { diet: dietTags, labels: dishLabels } as const

export function markKindParam(event: Parameters<typeof getRouterParam>[0]): MarkKind {
  const kind = getRouterParam(event, 'kind')
  if (kind !== 'diet' && kind !== 'labels') {
    throw createError({ statusCode: 404, message: 'Нет такого справочника' })
  }
  return kind
}

/** Заменить названия отметки на всех языках */
async function replaceMarkNames(tx: Tx, kind: MarkKind, id: number, names: Names) {
  const rows = nameRows(names)
  if (kind === 'diet') {
    await tx.delete(dietTagTranslations).where(eq(dietTagTranslations.tagId, id))
    await tx.insert(dietTagTranslations).values(rows.map((r) => ({ ...r, tagId: id })))
  } else {
    await tx.delete(dishLabelTranslations).where(eq(dishLabelTranslations.labelId, id))
    await tx.insert(dishLabelTranslations).values(rows.map((r) => ({ ...r, labelId: id })))
  }
}

export async function createMark(kind: MarkKind, input: MarkInput) {
  const marks = markTables[kind]
  return await useDb().transaction(async (tx) => {
    // Код — для стилей значка на сайте (diet__tag--spicy); из названия, не меняется
    const key = await uniqueCode(
      tx,
      input.names,
      async (base) =>
        (
          await tx
            .select({ key: marks.key })
            .from(marks)
            .where(or(eq(marks.key, base), like(marks.key, `${base}-%`)))
        ).map((r) => r.key),
      kind === 'diet' ? 'tag' : 'label',
    )
    const [last] = await tx.select({ value: max(marks.sort) }).from(marks)
    const [row] = await tx
      .insert(marks)
      .values({ key, sort: (last?.value ?? -1) + 1 })
      .returning({ id: marks.id })
    await replaceMarkNames(tx, kind, row!.id, input.names)
    return row!.id
  })
}

export async function updateMark(kind: MarkKind, id: number, input: MarkInput) {
  const marks = markTables[kind]
  await useDb().transaction(async (tx) => {
    const [row] = await tx
      .update(marks)
      .set({ updatedAt: new Date() })
      .where(eq(marks.id, id))
      .returning({ id: marks.id })
    if (!row) throw createError({ statusCode: 404, message: 'Отметка не найдена' })
    await replaceMarkNames(tx, kind, id, input.names)
  })
}

/** Удаление отметки снимает её со всех блюд (каскад в базе). */
export async function deleteMark(kind: MarkKind, id: number) {
  const marks = markTables[kind]
  const [row] = await useDb().delete(marks).where(eq(marks.id, id)).returning({ id: marks.id })
  if (!row) throw createError({ statusCode: 404, message: 'Отметка не найдена' })
}
