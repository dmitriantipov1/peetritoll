// Новости на сайте (news.html и news-item.html прототипа). Тексты уже на языке страницы:
// перевода нет — эстонский, иначе любой (язык включён в «Где показывать», 8.5).
import type { Localized } from './menu'
import type { MediaImage } from './media'
import type { NewsTopic } from './materials'

export interface SiteNewsCard {
  id: number
  /** Адрес на этом языке: /ru/news/<slug> */
  slug: string
  title: string
  lead: string | null
  /** Дата выхода, ISO */
  publishedAt: string
  topic: NewsTopic | null
  cover: MediaImage | null
}

export interface SiteNewsItem extends SiteNewsCard {
  /** HTML из редактора, очищен при сохранении */
  body: string
  /** Адрес новости на других языках — для переключателя языков */
  slugs: Localized<string>
  /** «Другие новости» — три свежие, кроме этой */
  more: SiteNewsCard[]
}
