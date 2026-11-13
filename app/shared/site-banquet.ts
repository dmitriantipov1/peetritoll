// «Пиршества и застолья» на сайте (banquet.html прототипа): каталог для калькулятора, сеты,
// настройки зала и калькулятора. Тексты уже на языке страницы (нет перевода — эстонский).
// Только то, что можно заказать: блюда «нельзя заказать», пустые категории и сеты не приходят.
import type { BanquetTier, CatalogUnit } from './catalog'

export interface SiteBanquetDish {
  id: number
  name: string
  /** Цена за единицу */
  priceCents: number
  unit: CatalogUnit
  servesGuests: number
}

export interface SiteBanquetCategory {
  id: number
  name: string
  dishes: SiteBanquetDish[]
}

export interface SiteBanquetSet {
  tier: BanquetTier
  name: string
  dishIds: number[]
  /** Цена на гостя — из цен блюд с учётом «хватает на» */
  pricePerGuestCents: number
}

export interface SiteBanquet {
  categories: SiteBanquetCategory[]
  sets: SiteBanquetSet[]
  capacityMin: number
  capacityMax: number
  /** Запрос не позже чем за столько дней */
  leadDays: number
  /** Подсказка над калькулятором на языке страницы; пусто — нет */
  hint: string
  warnCategoryId: number | null
  warnMinPerGuest: number
  /** «Сегодня» по Таллину — для ближайшей даты в форме */
  today: string
}
