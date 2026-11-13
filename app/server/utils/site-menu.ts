// Публичная страница основного меню: только то, что гостю показано.
// Раздел «Основное меню» выключен или скрыт на этом языке — страницы нет (null).
// Доступно в серверном коде без импорта.
import { and, asc, eq } from 'drizzle-orm'
import { dietTags, dishes, dishLabels, dishPortions, menuCategories } from '../db/schema'
import type { SiteMark, SiteMenu } from '#shared/site-menu'
import { pickTranslation, type ContentLocale } from '#shared/locales'
import { toMediaImage } from '#shared/media'

export async function loadSiteMenu(locale: ContentLocale): Promise<SiteMenu | null> {
  const sections = await readSections()
  if (!sections.menu.enabled || !sections.menu.locales[locale]) return null

  const db = useDb()
  const [categories, tags, labels] = await Promise.all([
    db.query.menuCategories.findMany({
      // Категория «на отдельной странице» в основное меню не входит
      where: and(eq(menuCategories.isVisible, true), eq(menuCategories.ownPage, false)),
      orderBy: [asc(menuCategories.sort), asc(menuCategories.id)],
      with: {
        translations: true,
        dishes: {
          where: eq(dishes.isVisible, true),
          orderBy: [asc(dishes.sort), asc(dishes.id)],
          with: {
            translations: true,
            portions: { with: { translations: true }, orderBy: [asc(dishPortions.sort)] },
            dietTags: true,
            labels: true,
            photoMedia: true,
          },
        },
      },
    }),
    db.query.dietTags.findMany({
      orderBy: [asc(dietTags.sort), asc(dietTags.id)],
      with: { translations: true },
    }),
    db.query.dishLabels.findMany({
      orderBy: [asc(dishLabels.sort), asc(dishLabels.id)],
      with: { translations: true },
    }),
  ])

  const tagKey = new Map(tags.map((t) => [t.id, t.key]))
  const labelKey = new Map(labels.map((l) => [l.id, l.key]))
  const mark = (
    m: { key: string; translations: { locale: ContentLocale; name: string }[] },
    inFilter: boolean,
  ): SiteMark => ({
    key: m.key,
    name: pickTranslation(m.translations, locale)?.name ?? '',
    inFilter,
  })

  return {
    categories: categories
      .map((c) => ({
        slug: c.slug,
        name: pickTranslation(c.translations, locale)?.name ?? '',
        dishes: c.dishes.map((d) => {
          const t = pickTranslation(d.translations, locale)
          return {
            id: d.id,
            name: t?.name ?? '',
            description: t?.description || null,
            photo: d.photoMedia
              ? (({ url, srcset }) => ({ url, srcset }))(toMediaImage(d.photoMedia))
              : d.photo
                ? { url: d.photo, srcset: null }
                : null,
            portions: d.portions.map((p) => ({
              label:
                d.portions.length > 1
                  ? (pickTranslation(p.translations, locale)?.label ?? null)
                  : null,
              priceCents: p.priceCents,
            })),
            diet: d.dietTags.flatMap((x) => tagKey.get(x.tagId) ?? []),
            labels: d.labels.flatMap((x) => labelKey.get(x.labelId) ?? []),
          }
        }),
      }))
      // Пустая категория (все блюда скрыты) — без заголовка и кнопки раздела
      .filter((c) => c.dishes.length),
    dietTags: tags.map((t) => mark(t, !t.filterHidden)),
    labels: labels.map((l) => mark(l, l.inFilter && !l.filterHidden)),
  }
}
