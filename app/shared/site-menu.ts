// Публичная страница основного меню (menu.html прототипа): что отдаёт сервер.
// Тексты уже на языке страницы: перевод выбран на сервере (на этом языке, иначе эстонский).

/** Отметка: для гостей (без лактозы…) или служебная (новинка…) */
export interface SiteMark {
  key: string
  name: string
  /** Кнопка в фильтре меню: у отметок для гостей — если не скрыта, у служебных — если включена и не скрыта */
  inFilter: boolean
}

export interface SitePortion {
  /** Подпись порции, «Маленькая порция»; у единственной порции — null */
  label: string | null
  priceCents: number
}

export interface SiteDish {
  id: number
  name: string
  description: string | null
  /** Загруженное фото; старая ссылка со старого сайта — тоже сюда, без srcset */
  photo: { url: string; srcset: string | null } | null
  portions: SitePortion[]
  /** Коды отметок для гостей (veg, gf…) и служебных (new…) */
  diet: string[]
  labels: string[]
}

export interface SiteMenuCategory {
  /** Якорь в адресе: /ru/menu#soups */
  slug: string
  name: string
  dishes: SiteDish[]
}

export interface SiteMenu {
  categories: SiteMenuCategory[]
  dietTags: SiteMark[]
  labels: SiteMark[]
}

/**
 * Значки отметок для гостей — рисунки заказчицы (12.11.2026), по коду отметки.
 * Отметка без значка (острое, новые из админки) показывается текстом.
 */
export const dietIcons: Record<string, string> = {
  veg: '/images/diet/meat-free.svg',
  vegan: '/images/diet/vegan.svg',
  gf: '/images/diet/gluten-free.svg',
  lf: '/images/diet/lactose-free.svg',
}
