// Магазин на сайте: каталог и страница товара. Раздел «Магазин» выключен или скрыт на этом
// языке — ничего (null). Доступно в серверном коде без импорта.
import { and, arrayContains, asc, eq } from 'drizzle-orm'
import { products, shopCategories } from '../db/schema'
import type { SiteProduct, SiteShop, SiteShopCard, SiteShopVariant } from '#shared/site-shop'
import { contentLocales, pickTranslation, type ContentLocale } from '#shared/locales'
import { toMediaImage } from '#shared/media'

async function shopShown(locale: ContentLocale) {
  const { shop } = await readSections()
  return shop.enabled && shop.locales[locale]
}

async function loadOnSale(locale: ContentLocale) {
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
        variants: {
          with: { translations: true },
          orderBy: (v, { asc }) => [asc(v.sort), asc(v.id)],
        },
      },
      orderBy: [asc(products.sort), asc(products.id)],
    }),
  ])
  const visibleCats = new Map(categories.map((c) => [c.id, c]))
  // В продаже — в видимой категории и хотя бы один вариант можно купить
  const onSale = items.filter(
    (p) =>
      visibleCats.has(p.categoryId) &&
      p.variants.some((v) => v.isAvailable) &&
      p.translations.length,
  )
  return { categories, visibleCats, onSale }
}

type Loaded = Awaited<ReturnType<typeof loadOnSale>>
type ProductRow = Loaded['onSale'][number]

function toVariant(v: ProductRow['variants'][number], locale: ContentLocale): SiteShopVariant {
  return {
    id: v.id,
    label: pickTranslation(v.translations, locale)?.label ?? '',
    kind: v.kind,
    priceCents: v.priceCents,
    delivery: v.delivery,
    stock: v.stock,
  }
}

function toCard(p: ProductRow, locale: ContentLocale, catSlug: string): SiteShopCard {
  const t = pickTranslation(p.translations, locale)!
  const variants = p.variants.filter((v) => v.isAvailable).map((v) => toVariant(v, locale))
  const prices = variants.map((v) => v.priceCents)
  return {
    id: p.id,
    slug: t.slug,
    name: t.name,
    lead: t.lead,
    categorySlug: catSlug,
    priceCents: Math.min(...prices),
    priceFrom: new Set(prices).size > 1,
    photo: p.photos[0] ? toMediaImage(p.photos[0].media) : null,
    quickVariant: variants.length === 1 ? variants[0]! : null,
  }
}

export async function loadSiteShop(locale: ContentLocale): Promise<SiteShop | null> {
  if (!(await shopShown(locale))) return null
  const { categories, visibleCats, onSale } = await loadOnSale(locale)
  const used = new Set(onSale.map((p) => p.categoryId))
  return {
    categories: categories
      .filter((c) => used.has(c.id))
      .map((c) => ({ slug: c.slug, name: pickTranslation(c.translations, locale)?.name ?? '' })),
    products: onSale.map((p) => toCard(p, locale, visibleCats.get(p.categoryId)!.slug)),
  }
}

export async function loadSiteProduct(
  locale: ContentLocale,
  slug: string,
): Promise<SiteProduct | null> {
  if (!(await shopShown(locale))) return null
  const { visibleCats, onSale } = await loadOnSale(locale)
  const p =
    onSale.find((x) => x.translations.some((t) => t.locale === locale && t.slug === slug)) ??
    onSale.find((x) => pickTranslation(x.translations, locale)?.slug === slug)
  if (!p) return null
  const cat = visibleCats.get(p.categoryId)!
  const t = pickTranslation(p.translations, locale)!
  const others = onSale.filter((x) => x.id !== p.id)
  const more = [
    ...others.filter((x) => x.categoryId === p.categoryId),
    ...others.filter((x) => x.categoryId !== p.categoryId),
  ]
    .slice(0, 4)
    .map((x) => toCard(x, locale, visibleCats.get(x.categoryId)!.slug))
  return {
    ...toCard(p, locale, cat.slug),
    categoryName: pickTranslation(cat.translations, locale)?.name ?? '',
    description: t.description,
    facts: t.facts ?? [],
    photos: p.photos.map((ph) => toMediaImage(ph.media)),
    variants: p.variants.filter((v) => v.isAvailable).map((v) => toVariant(v, locale)),
    more,
    slugs: Object.fromEntries(
      contentLocales
        .filter((l) => p.locales.includes(l))
        .map((l) => [l, pickTranslation(p.translations, l)!.slug]),
    ),
  }
}
