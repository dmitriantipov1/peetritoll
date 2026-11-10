// Начальное наполнение магазина из server/db/seed/shop.json — каталог прототипа (shop.html).
// Только в пустой магазин: если категории уже есть, ничего не делает, чтобы не задвоить
// каталог и не затереть правки из админки. Фото переносятся отдельно, с карточкой товара.
//
// Запуск при работающем приложении:
//   docker compose exec app npx nuxi task run seed:shop
// или в разработке: curl -X POST localhost:3000/_nitro/tasks/seed:shop
import data from '../../db/seed/shop.json'
import {
  products,
  productTranslations,
  productVariants,
  productVariantTranslations,
  shopCategories,
  shopCategoryTranslations,
} from '../../db/schema'
import type { ContentLocale } from '#shared/locales'
import type { DeliveryMode, ProductFact, VariantKind } from '#shared/shop'
import { slugify } from '#shared/slug'

type Localized<T> = Partial<Record<ContentLocale, T>>

interface SeedVariant {
  kind: VariantKind
  priceCents: number
  delivery: DeliveryMode | null
  stock: number | null
  label: Localized<string> | null
}

interface SeedProduct {
  category: string
  locales: ContentLocale[]
  names: Localized<string>
  lead?: Localized<string>
  description?: Localized<string>
  facts?: Localized<ProductFact[]>
  photo: string
  variants: SeedVariant[]
}

interface SeedShop {
  categories: { slug: string; names: Localized<string> }[]
  products: SeedProduct[]
}

const entries = <T>(map: Localized<T> | null | undefined) =>
  Object.entries(map ?? {}) as [ContentLocale, T][]

export default defineTask({
  meta: {
    name: 'seed:shop',
    description: 'Категории и товары магазина из прототипа (только в пустой магазин)',
  },
  async run() {
    const seed = data as unknown as SeedShop
    const db = useDb()
    const [existing] = await db.select({ id: shopCategories.id }).from(shopCategories).limit(1)
    if (existing) return { result: 'В магазине уже есть категории — пропускаю' }

    let variants = 0
    await db.transaction(async (tx) => {
      const categoryIds = new Map<string, number>()
      for (const [i, c] of seed.categories.entries()) {
        const [row] = await tx
          .insert(shopCategories)
          .values({ slug: c.slug, sort: i })
          .returning({ id: shopCategories.id })
        categoryIds.set(c.slug, row!.id)
        await tx
          .insert(shopCategoryTranslations)
          .values(entries(c.names).map(([locale, name]) => ({ categoryId: row!.id, locale, name })))
      }

      const taken = new Set<string>()
      for (const [i, p] of seed.products.entries()) {
        const [row] = await tx
          .insert(products)
          .values({
            categoryId: categoryIds.get(p.category)!,
            state: 'published',
            locales: p.locales,
            sort: i,
          })
          .returning({ id: products.id })
        await tx.insert(productTranslations).values(
          entries(p.names).map(([locale, name]) => {
            // Адрес уникален в пределах языка
            let slug = slugify(name)
            while (taken.has(`${locale}/${slug}`)) slug = `${slug}-${row!.id}`
            taken.add(`${locale}/${slug}`)
            return {
              productId: row!.id,
              locale,
              name,
              slug,
              lead: p.lead?.[locale] ?? null,
              description: p.description?.[locale] ?? null,
              facts: p.facts?.[locale] ?? [],
            }
          }),
        )
        for (const [j, v] of p.variants.entries()) {
          const [variant] = await tx
            .insert(productVariants)
            .values({
              productId: row!.id,
              sort: j,
              kind: v.kind,
              priceCents: v.priceCents,
              stock: v.stock,
              delivery: v.delivery,
            })
            .returning({ id: productVariants.id })
          variants++
          const labels = entries(v.label)
          if (labels.length) {
            await tx
              .insert(productVariantTranslations)
              .values(labels.map(([locale, label]) => ({ variantId: variant!.id, locale, label })))
          }
        }
      }
    })

    return {
      result: `Категорий: ${seed.categories.length}, товаров: ${seed.products.length}, вариантов: ${variants}`,
    }
  },
})
