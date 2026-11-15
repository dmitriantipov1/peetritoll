// Магазин на сайте (shop.html и product.html прототипа): каталог и страница товара.
// Тексты уже на языке страницы (нет перевода — эстонский). В продаже — опубликованные товары
// этой версии сайта, у которых хотя бы один вариант можно купить; категории — видимые и непустые.
import type { Localized } from './menu'
import type { MediaImage } from './media'
import type { DeliveryMode, ProductFact, VariantKind } from './shop'

export interface SiteShopVariant {
  id: number
  /** «Печатная книга», «PDF»; у единственного варианта — пусто */
  label: string
  kind: VariantKind
  priceCents: number
  /** Только у физического: самовывоз или самовывоз и доставка */
  delivery: DeliveryMode | null
  /** Сколько штук осталось; null — не считаем. 0 — продано */
  stock: number | null
}

export interface SiteShopCard {
  id: number
  slug: string
  name: string
  /** Строка под названием: у книг — автор (14.11.2026) */
  lead: string | null
  categorySlug: string
  priceCents: number
  /** Вариантов с разной ценой несколько — «от N €» */
  priceFrom: boolean
  photo: MediaImage | null
  /** Вариант один — кнопка в карточке («В корзину» или «Продано»). Несколько — «Выбрать» на странице товара */
  quickVariant: SiteShopVariant | null
}

export interface SiteShop {
  categories: { slug: string; name: string }[]
  products: SiteShopCard[]
}

export interface SiteProduct extends SiteShopCard {
  categoryName: string
  description: string | null
  facts: ProductFact[]
  photos: MediaImage[]
  variants: SiteShopVariant[]
  /** «Ещё в лавке» — до четырёх других товаров, сначала из той же категории */
  more: SiteShopCard[]
  /** Адрес товара на других языках — для переключателя языков */
  slugs: Localized<string>
}
