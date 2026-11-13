// Главная (лендинг): что отдаёт сервер для разделов из базы — «Магазин» и «Мероприятия».
// Тексты уже на языке страницы: перевод выбран на сервере (на этом языке, иначе эстонский).
import type { MediaImage } from './media'
import type { SiteEvents } from './site-events'

export interface HomeShopCategory {
  slug: string
  name: string
}

export interface HomeProduct {
  slug: string
  name: string
  lead: string | null
  /** Самая низкая цена среди вариантов в продаже; priceFrom — если цены у вариантов разные */
  priceCents: number
  priceFrom: boolean
  photo: MediaImage | null
}

export interface HomeData {
  /** Раздел выключен в настройках сайта или скрыт на этом языке — блока на главной нет */
  shop: { categories: HomeShopCategory[]; books: HomeProduct[] } | null
  events: SiteEvents | null
  /** Раздел Pakri Express включён — карточка в «Экскурсиях и поездках» (ведёт на /services) */
  pakri: boolean
}

/** Сколько книг на главной, сколько прошедших мероприятий в «Архиве» */
export const HOME_BOOKS = 4
export const HOME_ARCHIVE = 6
