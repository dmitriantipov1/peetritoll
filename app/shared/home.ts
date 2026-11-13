// Главная (лендинг): что отдаёт сервер для разделов из базы — «Магазин» и «Мероприятия».
// Тексты уже на языке страницы: перевод выбран на сервере (на этом языке, иначе эстонский).
import type { MediaImage } from './media'

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

export interface HomeEvent {
  slug: string
  title: string
  lead: string | null
  /** «2026-11-28» и «18:00» — по Таллину */
  date: string
  startTime: string | null
  kind: string | null
  priceNote: string | null
  /** Обложка мероприятия, иначе общая афиша из настроек сайта; нет и её — null */
  poster: MediaImage | null
  registrationOpen: boolean
}

export interface HomeData {
  /** Раздел выключен в настройках сайта или скрыт на этом языке — блока на главной нет */
  shop: { categories: HomeShopCategory[]; books: HomeProduct[] } | null
  events: { rotateSeconds: number; upcoming: HomeEvent[]; archive: HomeEvent[] } | null
}

/** Сколько книг на главной, сколько прошедших мероприятий в «Архиве» */
export const HOME_BOOKS = 4
export const HOME_ARCHIVE = 6
