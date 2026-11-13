// Мероприятия на сайте: блок «Предстоящие / Архив» (главная и /events) и страница мероприятия
// (event.html прототипа). Тексты уже на языке страницы: перевода нет — эстонский, иначе любой.
import type { Localized } from './menu'
import type { MediaImage } from './media'

export interface SiteEvent {
  slug: string
  title: string
  lead: string | null
  /** «2026-11-28» и «18:00» — по Таллину */
  date: string
  startTime: string | null
  /** «Концерт» на языке страницы */
  kind: string | null
  priceNote: string | null
  /** Афиша мероприятия, иначе общая афиша из настроек сайта; нет и её — null */
  poster: MediaImage | null
  registrationOpen: boolean
}

export interface SiteEvents {
  /** Смена мероприятия и афиши в блоке, секунд — из настроек сайта */
  rotateSeconds: number
  /** Ближайшие первыми */
  upcoming: SiteEvent[]
  /** Последние прошедшие первыми */
  archive: SiteEvent[]
}

export interface SiteEventPage extends SiteEvent {
  /** HTML из редактора, очищен при сохранении */
  body: string
  /** «Таверна, первый этаж» на языке страницы */
  place: string | null
  /** Прошло и ушло в архив — записи нет */
  archived: boolean
  /** Адрес мероприятия на других языках — для переключателя языков */
  slugs: Localized<string>
}
