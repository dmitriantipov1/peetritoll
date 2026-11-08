// Порядок категорий, блюд в категории и отметок (поле sort). Доступно без импорта.
import { eq, type SQL } from 'drizzle-orm'
import { dietTags, dishes, dishLabels, menuCategories } from '../db/schema'
import type { MarkKind } from '#shared/menu'

type Db = ReturnType<typeof useDb>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
type Sortable = typeof menuCategories | typeof dishes | typeof dietTags | typeof dishLabels

/**
 * Записать порядок: ids — все записи списка в новой последовательности.
 * Если список в базе другой (кто-то добавил или удалил запись) — 409: иначе порядок
 * собрался бы из устаревшего списка и запись без места встала бы куда попало.
 */
async function applyOrder(table: Sortable, ids: number[], scope?: SQL) {
  await useDb().transaction(async (tx: Tx) => {
    const rows = await tx.select({ id: table.id, sort: table.sort }).from(table).where(scope)
    const current = new Map(rows.map((r) => [r.id, r.sort]))
    if (current.size !== ids.length || ids.some((id) => !current.has(id))) {
      throw createError({
        statusCode: 409,
        message: 'Список изменился, пока вы его упорядочивали. Обновите страницу и повторите.',
      })
    }
    for (const [sort, id] of ids.entries()) {
      if (current.get(id) !== sort) {
        await tx.update(table).set({ sort }).where(eq(table.id, id))
      }
    }
  })
}

export const orderCategories = (ids: number[]) => applyOrder(menuCategories, ids)

export const orderDishes = (categoryId: number, ids: number[]) =>
  applyOrder(dishes, ids, eq(dishes.categoryId, categoryId))

export const orderMarks = (kind: MarkKind, ids: number[]) =>
  applyOrder(kind === 'diet' ? dietTags : dishLabels, ids)
