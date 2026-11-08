// Начальное наполнение основного меню из server/db/seed/menu.json
// (данные прототипа — см. поле _note в файле). Только в пустую базу: если категории уже есть,
// ничего не делает, чтобы не задвоить меню и не затереть правки из админки.
//
// Запуск при работающем приложении:
//   docker compose exec app npx nuxi task run seed:menu
import data from '../../db/seed/menu.json'
import {
  dietTags,
  dietTagTranslations,
  dishDietTags,
  dishes,
  dishPortions,
  dishPortionTranslations,
  dishTranslations,
  menuCategories,
  menuCategoryTranslations,
} from '../../db/schema'
import type { ContentLocale } from '#shared/locales'

type Localized<T> = Partial<Record<ContentLocale, T>>

interface SeedDish {
  ru: { name: string; description: string | null }
  photo: string | null
  isNew: boolean
  diet: string[]
  portions: { priceCents: number; labels?: Localized<string> }[]
}

interface SeedMenu {
  dietTags: { key: string; names: Localized<string> }[]
  categories: { slug: string; names: Localized<string>; dishes: SeedDish[] }[]
}

/** { ru: 'Супы', et: 'Supid' } → строки для таблицы переводов */
function rows<T>(values: Localized<T> | undefined): [ContentLocale, T][] {
  return Object.entries(values ?? {}) as [ContentLocale, T][]
}

export default defineTask({
  meta: {
    name: 'seed:menu',
    description: 'Заполнить основное меню данными прототипа (только пустую базу)',
  },
  async run() {
    const menu = data as SeedMenu

    return await useDb().transaction(async (tx) => {
      const existing = await tx.select({ id: menuCategories.id }).from(menuCategories).limit(1)
      if (existing.length) return { result: 'Меню уже заполнено — ничего не делаю' }

      const tagIds = new Map<string, number>()
      for (const [sort, tag] of menu.dietTags.entries()) {
        const [row] = await tx.insert(dietTags).values({ key: tag.key, sort }).returning()
        tagIds.set(tag.key, row!.id)
        await tx
          .insert(dietTagTranslations)
          .values(rows(tag.names).map(([locale, name]) => ({ tagId: row!.id, locale, name })))
      }

      let dishCount = 0
      for (const [catSort, category] of menu.categories.entries()) {
        const [cat] = await tx
          .insert(menuCategories)
          .values({ slug: category.slug, sort: catSort })
          .returning()
        await tx
          .insert(menuCategoryTranslations)
          .values(
            rows(category.names).map(([locale, name]) => ({ categoryId: cat!.id, locale, name })),
          )

        for (const [sort, dish] of category.dishes.entries()) {
          const [row] = await tx
            .insert(dishes)
            .values({ categoryId: cat!.id, sort, photo: dish.photo, isNew: dish.isNew })
            .returning()
          await tx.insert(dishTranslations).values({ dishId: row!.id, locale: 'ru', ...dish.ru })

          for (const [portionSort, portion] of dish.portions.entries()) {
            const [p] = await tx
              .insert(dishPortions)
              .values({ dishId: row!.id, sort: portionSort, priceCents: portion.priceCents })
              .returning()
            const labels = rows(portion.labels)
            if (labels.length) {
              await tx
                .insert(dishPortionTranslations)
                .values(labels.map(([locale, label]) => ({ portionId: p!.id, locale, label })))
            }
          }

          const tags = dish.diet.map((key) => tagIds.get(key)).filter((id) => id !== undefined)
          if (tags.length) {
            await tx.insert(dishDietTags).values(tags.map((tagId) => ({ dishId: row!.id, tagId })))
          }
          dishCount++
        }
      }

      return {
        result: `Меню заполнено: ${menu.categories.length} категорий, ${dishCount} блюд, ${menu.dietTags.length} отметок`,
      }
    })
  },
})
