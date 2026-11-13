// Страницы-материалы из server/db/seed/pages.json — пока политика конфиденциальности и cookies
// (версия 1, по образцу политик заказчицы в SumUp-магазине, 8.1). Дальше текст правится в админке.
// Заводит страницу, только если её адрес ещё свободен на всех языках: правки из админки не затирает.
//
// Запуск при работающем приложении:
//   curl -X POST localhost:3000/_nitro/tasks/seed:pages
import { and, eq, inArray } from 'drizzle-orm'
import data from '../../db/seed/pages.json'
import { materials, materialTranslations } from '../../db/schema'
import { contentLocales, type ContentLocale } from '#shared/locales'

interface SeedPage {
  slug: string
  translations: Partial<Record<ContentLocale, { title: string; lead: string; body: string }>>
}

export default defineTask({
  meta: {
    name: 'seed:pages',
    description: 'Завести страницы политики конфиденциальности и cookies (если адреса свободны)',
  },
  async run() {
    const created: string[] = []
    const skipped: string[] = []

    await useDb().transaction(async (tx) => {
      for (const page of (data as { pages: SeedPage[] }).pages) {
        const locales = contentLocales.filter((l) => page.translations[l])
        const [taken] = await tx
          .select({ id: materialTranslations.materialId })
          .from(materialTranslations)
          .where(
            and(
              eq(materialTranslations.slug, page.slug),
              inArray(materialTranslations.locale, locales),
            ),
          )
          .limit(1)
        if (taken) {
          skipped.push(page.slug)
          continue
        }
        const [row] = await tx
          .insert(materials)
          .values({ type: 'page', state: 'published', publishAt: new Date(), locales })
          .returning({ id: materials.id })
        await tx.insert(materialTranslations).values(
          locales.map((locale) => {
            const t = page.translations[locale]!
            return {
              materialId: row!.id,
              locale,
              title: t.title,
              slug: page.slug,
              lead: t.lead,
              // Тот же белый список, что у редактора админки
              body: cleanRichText(t.body),
            }
          }),
        )
        created.push(page.slug)
      }
    })

    return {
      result:
        `Заведено: ${created.join(', ') || 'ничего'}` +
        (skipped.length ? `; адрес уже занят, пропущено: ${skipped.join(', ')}` : ''),
    }
  },
})
