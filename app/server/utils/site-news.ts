// Новости на сайте (5.7): опубликованные материалы типа «новость», новые сверху.
// Раздел «Новости» выключен или скрыт на этом языке — ни списка, ни новостей (null).
// Новость показываем, если её язык включён в «Где показывать»; перевода нет — эстонский текст,
// адрес — по тому же языку. Доступно в серверном коде без импорта.
import { and, desc, eq, isNotNull, lte } from 'drizzle-orm'
import { materials } from '../db/schema'
import type { SiteNewsCard, SiteNewsItem } from '#shared/site-news'
import { contentLocales, pickTranslation, type ContentLocale } from '#shared/locales'
import { toMediaImage } from '#shared/media'

async function newsEnabled(locale: ContentLocale) {
  const { news } = await readSections()
  return news.enabled && news.locales[locale]
}

/** Опубликованные новости, вышедшие к этому моменту, для этого языка */
async function publishedNews(locale: ContentLocale) {
  const rows = await useDb().query.materials.findMany({
    where: and(
      eq(materials.type, 'news'),
      eq(materials.state, 'published'),
      isNotNull(materials.publishAt),
      lte(materials.publishAt, new Date()),
    ),
    with: { translations: true, cover: true },
    orderBy: [desc(materials.publishAt), desc(materials.id)],
  })
  return rows.filter((m) => m.locales.includes(locale) && m.translations.length)
}

type NewsRow = Awaited<ReturnType<typeof publishedNews>>[number]

function toCard(m: NewsRow, locale: ContentLocale): SiteNewsCard {
  const t = pickTranslation(m.translations, locale)!
  return {
    id: m.id,
    slug: t.slug,
    title: t.title,
    lead: t.lead,
    publishedAt: m.publishAt!.toISOString(),
    topic: m.topic,
    cover: m.cover ? toMediaImage(m.cover) : null,
  }
}

export async function loadSiteNewsList(locale: ContentLocale): Promise<SiteNewsCard[] | null> {
  if (!(await newsEnabled(locale))) return null
  return (await publishedNews(locale)).map((m) => toCard(m, locale))
}

export async function loadSiteNewsItem(
  locale: ContentLocale,
  slug: string,
): Promise<SiteNewsItem | null> {
  if (!(await newsEnabled(locale))) return null
  const list = await publishedNews(locale)
  // Адрес на языке страницы; не нашли — новость без перевода, её адрес — по показанному языку
  const m =
    list.find((n) => n.translations.some((t) => t.locale === locale && t.slug === slug)) ??
    list.find((n) => toCard(n, locale).slug === slug)
  if (!m) return null

  const t = pickTranslation(m.translations, locale)!
  return {
    ...toCard(m, locale),
    body: t.body,
    slugs: Object.fromEntries(
      contentLocales
        .filter((l) => m.locales.includes(l))
        .map((l) => [l, pickTranslation(m.translations, l)!.slug]),
    ),
    more: list
      .filter((n) => n.id !== m.id)
      .slice(0, 3)
      .map((n) => toCard(n, locale)),
  }
}
