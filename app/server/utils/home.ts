// Главная: разделы из базы — магазин (категории и книги) и мероприятия (предстоящие и архив).
// Доступно в серверном коде без импорта. Что показывать гостю, решают те же правила, что в админке:
// разделы сайта (settings.sections), языки показа (8.5), состояние материала (materialStatus).
import { and, arrayContains, asc, eq } from 'drizzle-orm'
import { materials, media, products, shopCategories } from '../db/schema'
import { HOME_ARCHIVE, HOME_BOOKS, type HomeData, type HomeEvent } from '#shared/home'
import { pickTranslation, type ContentLocale } from '#shared/locales'
import { toMediaImage } from '#shared/media'
import { defaultEvents, eventsSchema } from '#shared/site-settings'
import { eventKinds, materialStatus } from '#shared/materials'

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

async function loadEvents(locale: ContentLocale): Promise<NonNullable<HomeData['events']>> {
  const db = useDb()
  const settings = await readSetting('events', eventsSchema, defaultEvents)
  const [rows, defaultPoster] = await Promise.all([
    db.query.materials.findMany({
      where: and(
        eq(materials.type, 'event'),
        eq(materials.state, 'published'),
        arrayContains(materials.locales, [locale]),
      ),
      with: { translations: true, event: true, cover: true },
    }),
    settings.defaultPosterId
      ? db.query.media.findFirst({ where: eq(media.id, settings.defaultPosterId) })
      : undefined,
  ])
  const fallbackPoster = defaultPoster ? toMediaImage(defaultPoster) : null

  const upcoming: HomeEvent[] = []
  const archive: HomeEvent[] = []
  for (const m of rows) {
    if (!m.event) continue
    const status = materialStatus({
      state: m.state,
      publishAt: m.publishAt?.toISOString() ?? null,
      event: m.event,
    })
    if (status === 'planned') continue
    const t = pickTranslation(m.translations, locale)
    const item: HomeEvent = {
      slug: t?.slug ?? '',
      title: t?.title ?? '',
      lead: t?.lead ?? null,
      date: m.event.date,
      startTime: m.event.startTime,
      kind: m.event.kind ? eventKinds[m.event.kind][locale] : null,
      priceNote: t?.priceNote ?? null,
      poster: m.cover ? toMediaImage(m.cover) : fallbackPoster,
      registrationOpen: m.event.registrationOpen,
    }
    ;(status === 'archived' ? archive : upcoming).push(item)
  }
  // Предстоящие — ближайшие первыми, архив — последние прошедшие первыми
  const byDate = (a: HomeEvent, b: HomeEvent) =>
    a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? '')
  upcoming.sort(byDate)
  archive.sort((a, b) => byDate(b, a))

  return {
    rotateSeconds: settings.rotateSeconds,
    upcoming,
    archive: archive.slice(0, HOME_ARCHIVE),
  }
}

export async function loadHome(locale: ContentLocale): Promise<HomeData> {
  const sections = await readSections()
  const shown = (key: 'shop' | 'events') => sections[key].enabled && sections[key].locales[locale]
  const [shop, events] = await Promise.all([
    shown('shop') ? loadShop(locale) : null,
    shown('events') ? loadEvents(locale) : null,
  ])
  return { shop, events }
}
