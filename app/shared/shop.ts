// Магазин (7.3, 7.4, 8.5): товары, варианты, категории, настройки. Общий файл для сервера и экранов.
//
// Товар — то, что видит покупатель: название, описание, фото, категория, где показывать.
// Вариант — то, что кладут в корзину: «Печатная книга» и «PDF», «Отпечаток» и «Цифровая копия».
// У простого товара один вариант без подписи. Цена и остаток — у варианта.
import { z } from 'zod'

export const productStates = ['draft', 'published', 'archived'] as const
export type ProductState = (typeof productStates)[number]

export const productStateNames: Record<ProductState, string> = {
  draft: 'Черновик',
  published: 'На сайте',
  archived: 'Снят с продажи',
}

/** Физический вариант отправляют или выдают, цифровой — ссылкой на почту после оплаты (7.4) */
export const variantKinds = ['physical', 'digital'] as const
export type VariantKind = (typeof variantKinds)[number]

export const variantKindNames: Record<VariantKind, string> = {
  physical: 'Физический',
  digital: 'Цифровой',
}

/**
 * Как получить физический вариант (7.3): только самовывоз — картины и антиквариат
 * (страховки посылок нет), или самовывоз и доставка по цене из настроек магазина.
 */
export const deliveryModes = ['pickup', 'shipping'] as const
export type DeliveryMode = (typeof deliveryModes)[number]

export const deliveryModeNames: Record<DeliveryMode, string> = {
  pickup: 'Только самовывоз в Палдиски',
  shipping: 'Самовывоз или доставка',
}

/** Строка характеристик на странице товара: «Размер — 30 × 22 см» */
export interface ProductFact {
  label: string
  value: string
}

/** Настройки магазина (7.3, решение 09.11.2026): две цены доставки, без расчёта по весу */
export interface ShopSettings {
  deliveryEstoniaCents: number
  deliveryEuCents: number
}

export const defaultShopSettings: ShopSettings = {
  deliveryEstoniaCents: 400,
  deliveryEuCents: 1200,
}

const cents = z.number().int().min(0).max(1_000_000)

export const shopSettingsSchema = z.object({
  deliveryEstoniaCents: cents,
  deliveryEuCents: cents,
})
