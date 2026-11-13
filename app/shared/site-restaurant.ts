// Страница «Ресторан» (restaurant.html прототипа): что приходит из базы — галерея
// и какие разделы сайта включены (ссылки на меню, банкет и группы показываем, только если есть куда).
import type { MediaImage } from './media'

export interface SiteGalleryPhoto {
  id: number
  categoryId: number
  image: MediaImage
  /** Подпись на языке страницы — она же alt */
  caption: string
}

export interface SiteGallery {
  /** Только категории, в которых есть видимые фото */
  categories: { id: number; name: string }[]
  photos: SiteGalleryPhoto[]
}

export interface SiteRestaurant {
  /** Раздел «Галерея» выключен или скрыт на этом языке, или фото нет — null */
  gallery: SiteGallery | null
  links: { menu: boolean; banquet: boolean; group: boolean }
}
