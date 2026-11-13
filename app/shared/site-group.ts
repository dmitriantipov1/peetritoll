// Публичная страница группового меню — «Устроителям путешествий» (group.html прототипа).
// Тексты обедов уже на языке страницы (на этом языке, иначе эстонский).

export interface SiteGroupMenu {
  id: number
  /** «Меню № 3» */
  number: number
  name: string
  /** Состав — по строке на блюдо */
  items: string[]
  /** Цена с человека, в центах */
  priceCents: number
}

export interface SiteGroup {
  menus: SiteGroupMenu[]
  /** Минимум человек и за сколько часов до приезда — из настроек группового меню */
  minPeople: number
  leadHours: number
}
