// Публичная страница меню дня — «Дневная трапеза» (lunch.html прототипа): что отдаёт сервер.
// Блюда уже на языке страницы: перевод выбран на сервере (на этом языке, иначе эстонский).

export interface SiteLunchItem {
  name: string
  priceCents: number
}

export interface SiteLunchDay {
  /** «2026-11-09» */
  date: string
  /** Нет блюда в этот день — null; нет обоих — меню на день нет */
  soup: SiteLunchItem | null
  main: SiteLunchItem | null
}

export interface SiteLunch {
  /** Понедельник показанной недели; в субботу и воскресенье — следующая неделя */
  monday: string
  /** Сегодня по Таллину — подсветить день */
  today: string
  /** Пн–пт по порядку, даже пустые */
  days: SiteLunchDay[]
  servedFrom: string
  servedTo: string
  acceptPreorders: boolean
  preorderUntil: string
  /** Время на сервере по Таллину «ЧЧ:ММ» — для первой отрисовки формы; дальше форма считает по часам гостя */
  now: string
}
