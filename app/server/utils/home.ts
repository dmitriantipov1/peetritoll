// Главная: разделы из базы — магазин (категории и книги) и мероприятия (предстоящие и архив,
// server/utils/site-events.ts).
// Доступно в серверном коде без импорта. Что показывать гостю, решают те же правила, что в админке:
// разделы сайта (settings.sections), языки показа (8.5), состояние материала (materialStatus).
import { and, arrayContains, asc, eq } from 'drizzle-orm'
import { products, shopCategories } from '../db/schema'
import { HOME_ARCHIVE, HOME_BOOKS, type HomeData } from '#shared/home'
import { pickTranslation, type ContentLocale } from '#shared/locales'
import { toMediaImage } from '#shared/media'

/** Слаг категории книг — из каталога прототипа (seed:shop) */
const BOOKS_SLUG = 'books'

async function loadShop(locale: ContentLocale): Promise<NonNullable<HomeData['shop']>> {
  const db = useDb()
  const [categories, items] = await Promise.all([
    db.query.shopCategories.findMany({
      where: eq(shopCategories.isVisible, true),
      with: { translations: true },
      orderBy: [asc(shopCategories.sort), asc(shopCategories.id)],
    }),
    db.query.products.findMany({
      where: and(eq(products.state, 'published'), arrayContains(products.locales, [locale])),
      with: {
        translations: true,
        photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.sort)] },
        variants: true,
      },
      orderBy: [asc(products.sort), asc(products.id)],
    }),
  ])

  // Товар в продаже — хотя бы один вариант можно купить
  const onSale = items.filter((p) => p.variants.some((v) => v.isAvailable))
  const withProducts = new Set(onSale.map((p) => p.categoryId))
  const books = categories.find((c) => c.slug === BOOKS_SLUG)

  return {
    // Пустую категорию на главной не показываем — переход в неё ничего не даст
    categories: categories
      .filter((c) => withProducts.has(c.id))
      .map((c) => ({ slug: c.slug, name: pickTranslation(c.translations, locale)?.name ?? '' })),
    books: books
      ? onSale
          .filter((p) => p.categoryId === books.id)
          .slice(0, HOME_BOOKS)
          .map((p) => {
            const t = pickTranslation(p.translations, locale)
            const prices = p.variants.filter((v) => v.isAvailable).map((v) => v.priceCents)
            const cover = p.photos[0]?.media
            return {
              slug: t?.slug ?? '',
              name: t?.name ?? '',
              lead: t?.lead ?? null,
              priceCents: Math.min(...prices),
              priceFrom: new Set(prices).size > 1,
              photo: cover ? toMediaImage(cover) : null,
            }
          })
      : [],
  }
}

export async function loadHome(locale: ContentLocale): Promise<HomeData> {
  const sections = await readSections()
  const shown = (key: 'shop' | 'events' | 'pakri') =>
    sections[key].enabled && sections[key].locales[locale]
  const [shop, events] = await Promise.all([
    shown('shop') ? loadShop(locale) : null,
    shown('events') ? loadSiteEvents(locale, HOME_ARCHIVE) : null,
  ])
  // Pakri Express — внутри «Экскурсий и поездок»: без них карточке некуда вести
  return { shop, events, pakri: shown('pakri') && sections.services.enabled }
}
